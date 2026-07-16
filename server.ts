import { createServer } from "node:http";
import next from "next";
import { getToken } from "next-auth/jwt";
import { Server } from "socket.io";
import { CallType, PresenceStatus, Prisma } from "@prisma/client";
import { prisma } from "./src/lib/prisma";
import { setIo } from "./src/lib/socket";
import { assertConversationMember } from "./src/modules/messaging/services/conversations";
import { deleteMessage, editMessage, markDelivered, markSeen, reactMessage, sendMessage } from "./src/modules/messaging/services/messages";
import { addParticipant, createCall, updateCallStatus } from "./src/modules/media/services/calls";
import { createNotification } from "./src/modules/notifications/services/notify";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();
const presenceSockets = new Map<string, Set<string>>();

type AuthedSocket = import("socket.io").Socket & { userId: string };
type Ack = (result: { ok: boolean; data?: unknown; error?: string }) => void;
const ack = (callback: unknown, work: () => Promise<unknown>) => {
  void work().then((data) => typeof callback === "function" && (callback as Ack)({ ok: true, data }))
    .catch((error: unknown) => typeof callback === "function" && (callback as Ack)({ ok: false, error: error instanceof Error ? error.message : "Request failed" }));
};

async function resolveToken(req: { headers: Record<string, string> }) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  for (const cookieName of ["__Secure-authjs.session-token", "authjs.session-token"]) {
    const token = await getToken({ req, secret, cookieName });
    if (token?.sub) return token;
  }
  return null;
}

function emitPresence(io: Server, userId: string, status: PresenceStatus) {
  io.emit("presence:changed", { userId, status, at: new Date().toISOString() });
}

async function members(conversationId: string) {
  return prisma.conversationMember.findMany({ where: { conversationId, leftAt: null }, select: { userId: true } });
}

void app.prepare().then(() => {
  const server = createServer(handler);
  const io = setIo(new Server(server, { path: "/socket.io", cors: { origin: true, credentials: true } }));

  io.use(async (socket, nextMiddleware) => {
    try {
      const headers = Object.fromEntries(Object.entries(socket.request.headers)
        .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
        .map(([key, value]) => [key, Array.isArray(value) ? value.join("; ") : value]));
      const token = await resolveToken({ headers });
      if (!token?.sub) return nextMiddleware(new Error("Unauthorized"));
      (socket as AuthedSocket).userId = token.sub;
      return nextMiddleware();
    } catch {
      return nextMiddleware(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (rawSocket) => {
    const socket = rawSocket as AuthedSocket;
    const { userId } = socket;
    socket.join(`user:${userId}`);
    const set = presenceSockets.get(userId) ?? new Set<string>();
    const wasOffline = set.size === 0;
    set.add(socket.id);
    presenceSockets.set(userId, set);
    await prisma.user.update({ where: { id: userId }, data: { presence: "ONLINE" } }).catch(() => undefined);
    if (wasOffline) emitPresence(io, userId, "ONLINE");
    const memberships = await prisma.conversationMember.findMany({ where: { userId, leftAt: null }, select: { conversationId: true } }).catch(() => []);
    memberships.forEach(({ conversationId }) => socket.join(`conversation:${conversationId}`));

    socket.on("presence:update", (input: { status?: PresenceStatus }, callback?: Ack) => ack(callback, async () => {
      const status = input?.status;
      if (!status || !Object.values(PresenceStatus).includes(status)) throw new Error("Invalid presence status");
      await prisma.user.update({ where: { id: userId }, data: { presence: status, ...(status === "OFFLINE" ? { lastSeenAt: new Date() } : {}) } });
      emitPresence(io, userId, status);
      return { status };
    }));
    for (const event of ["typing:start", "typing:stop"] as const) {
      socket.on(event, (input: { conversationId: string }, callback?: Ack) => ack(callback, async () => {
        await assertConversationMember(userId, input.conversationId);
        socket.to(`conversation:${input.conversationId}`).emit(event, { conversationId: input.conversationId, userId });
        return null;
      }));
    }
    socket.on("message:send", (input: { conversationId: string } & Parameters<typeof sendMessage>[2], callback?: Ack) => ack(callback, async () => {
      const message = await sendMessage(userId, input.conversationId, input);
      io.to(`conversation:${input.conversationId}`).emit("message:new", message);
      for (const member of await members(input.conversationId)) {
        if (member.userId !== userId) await createNotification({ userId: member.userId, actorId: userId, type: "MESSAGE", body: message.body.slice(0, 180) });
      }
      return message;
    }));
    socket.on("message:edit", (input: { messageId: string; body: string }, callback?: Ack) => ack(callback, async () => {
      const message = await editMessage(userId, input.messageId, input.body);
      io.to(`conversation:${message.conversationId}`).emit("message:updated", message);
      return message;
    }));
    socket.on("message:delete", (input: { messageId: string; forEveryone?: boolean }, callback?: Ack) => ack(callback, async () => {
      const deleted = await deleteMessage(userId, input.messageId, input.forEveryone);
      const message = await prisma.message.findUnique({ where: { id: input.messageId }, select: { conversationId: true } });
      if (message) io.to(`conversation:${message.conversationId}`).emit("message:deleted", { messageId: input.messageId, forEveryone: Boolean(input.forEveryone), userId });
      return deleted;
    }));
    socket.on("message:react", (input: { messageId: string; emoji: string }, callback?: Ack) => ack(callback, async () => {
      const reaction = await reactMessage(userId, input.messageId, input.emoji);
      const message = await prisma.message.findUnique({ where: { id: input.messageId }, select: { conversationId: true } });
      if (message) io.to(`conversation:${message.conversationId}`).emit("message:reaction", { messageId: input.messageId, reaction });
      return reaction;
    }));
    socket.on("message:delivered", (input: { conversationId: string; messageId?: string }, callback?: Ack) => ack(callback, async () => markDelivered(userId, input.conversationId, input.messageId)));
    socket.on("message:seen", (input: { conversationId: string; messageId?: string }, callback?: Ack) => ack(callback, async () => {
      await markSeen(userId, input.conversationId, input.messageId);
      io.to(`conversation:${input.conversationId}`).emit("message:seen", { conversationId: input.conversationId, messageId: input.messageId, userId });
      return null;
    }));
    socket.on("call:invite", (input: { conversationId?: string; calleeIds: string[]; type: CallType }, callback?: Ack) => ack(callback, async () => {
      const call = await createCall(userId, input);
      for (const calleeId of input.calleeIds) {
        io.to(`user:${calleeId}`).emit("call:incoming", call);
        await createNotification({ userId: calleeId, actorId: userId, type: "CALL", body: `${input.type.toLowerCase()} call` });
      }
      return call;
    }));
    socket.on("call:signal", (input: { callId: string; toUserId: string; signal: Prisma.InputJsonValue }, callback?: Ack) => ack(callback, async () => {
      const participant = await prisma.callParticipant.findUnique({ where: { callId_userId: { callId: input.callId, userId } } });
      const recipient = await prisma.callParticipant.findUnique({ where: { callId_userId: { callId: input.callId, userId: input.toUserId } } });
      if (!participant || !recipient) throw new Error("Call participant not found");
      io.to(`user:${input.toUserId}`).emit("call:signal", { callId: input.callId, fromUserId: userId, signal: input.signal });
      return null;
    }));
    socket.on("call:accept", (input: { callId: string }, callback?: Ack) => ack(callback, async () => {
      await addParticipant(input.callId, userId, true);
      const call = await updateCallStatus(userId, input.callId, "ACTIVE");
      io.to(`user:${call.callerId}`).emit("call:accepted", { callId: input.callId, userId });
      return call;
    }));
    for (const [event, status] of [["call:decline", "DECLINED"], ["call:end", "ENDED"]] as const) {
      socket.on(event, (input: { callId: string }, callback?: Ack) => ack(callback, async () => {
        const call = await updateCallStatus(userId, input.callId, status);
        await prisma.callParticipant.update({ where: { callId_userId: { callId: input.callId, userId } }, data: { leftAt: new Date() } });
        io.to(`user:${call.callerId}`).emit(event, { callId: input.callId, userId });
        return call;
      }));
    }
    socket.on("disconnect", () => {
      const sockets = presenceSockets.get(userId);
      if (!sockets) return;
      sockets.delete(socket.id);
      if (sockets.size) return;
      presenceSockets.delete(userId);
      void prisma.user.update({ where: { id: userId }, data: { presence: "OFFLINE", lastSeenAt: new Date() } }).catch(() => undefined);
      emitPresence(io, userId, "OFFLINE");
    });
  });
  server.listen(Number(process.env.PORT) || 3000, () => {
    console.log(`> Ready on http://localhost:${process.env.PORT || 3000}`);
    void import("./src/modules/admin/services/backups")
      .then(({ runScheduledBackups }) => runScheduledBackups())
      .catch(() => undefined);
    void import("./src/modules/admin/services/cleanup")
      .then(({ runAutomaticCleanup }) => runAutomaticCleanup())
      .catch(() => undefined);
    setInterval(() => {
      void import("./src/modules/admin/services/cleanup")
        .then(({ runAutomaticCleanup }) => runAutomaticCleanup())
        .catch(() => undefined);
    }, 6 * 60 * 60_000);
  });
});
