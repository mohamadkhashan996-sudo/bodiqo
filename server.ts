import { createServer } from "node:http";

import next from "next";
import { getToken } from "next-auth/jwt";
import type { CallType, Prisma } from "@prisma/client";
import { PresenceStatus } from "@prisma/client";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { Socket } from "socket.io";
import { Server } from "socket.io";

import { assertBootEnv, socketAllowedOrigins } from "./src/config/env";
import { installProcessErrorHandlers } from "./src/lib/error-tracking";
import { logger } from "./src/lib/logger";
import { prisma } from "./src/lib/prisma";
import { rateLimit } from "./src/lib/rate-limit";
import {
  clearSocketLiveViewers,
  clearUserActiveChats,
  isLiveViewer,
  markChatActive,
  markChatInactive,
  setIo,
  trackLiveViewerJoin,
  trackLiveViewerLeave,
} from "./src/lib/socket";
import { isJwtSessionActive } from "./src/modules/auth/session-validity";
import {
  assertCanJoinLive,
  blockViewer,
  broadcastLiveReaction,
  deleteLiveChat,
  endLiveSession,
  muteViewer,
  pinLiveChat,
  postLiveChat,
  sendGift,
  updateViewerCount,
} from "./src/modules/live/services/sessions";
import {
  createCall,
  listCallParticipants,
  markParticipantJoined,
  setCallPresence,
  updateCallStatus,
  updateParticipantMedia,
} from "./src/modules/media/services/calls";
import { broadcastMessageNew } from "./src/modules/messaging/services/broadcast";
import { assertConversationMember } from "./src/modules/messaging/services/conversations";
import {
  deleteMessage,
  editMessage,
  markDelivered,
  markSeen,
  reactMessage,
  sendMessage,
} from "./src/modules/messaging/services/messages";
import { shouldShowTyping } from "./src/modules/messaging/services/privacy-gate";
import { createNotification } from "./src/modules/notifications/services/notify";
import { canViewPostContent } from "./src/modules/users/services/visibility";

installProcessErrorHandlers();
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();
const presenceSockets = new Map<string, Set<string>>();

type SocketAuthToken = {
  sub: string;
  sessionVersion: number;
  sessionKey: string;
  impersonatorId?: string;
  impersonatorSessionVersion?: number;
};
type AuthedSocket = Socket & {
  userId: string;
  authToken: SocketAuthToken;
};
type Ack = (result: { ok: boolean; data?: unknown; error?: string }) => void;
const ack = (callback: unknown, work: () => Promise<unknown>) => {
  void work()
    .then(
      (data) =>
        typeof callback === "function" && (callback as Ack)({ ok: true, data }),
    )
    .catch(
      (error: unknown) =>
        typeof callback === "function" &&
        (callback as Ack)({
          ok: false,
          error: error instanceof Error ? error.message : "Request failed",
        }),
    );
};

async function guardSocketAbuse(
  userId: string,
  bucket: string,
  limit: number,
  windowMs = 60_000,
) {
  const result = await rateLimit(`socket:${bucket}:${userId}`, limit, windowMs);
  if (!result.ok) throw new Error("Too many requests");
}

async function resolveToken(req: { headers: Record<string, string> }) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  for (const cookieName of [
    "__Secure-authjs.session-token",
    "authjs.session-token",
  ]) {
    const token = await getToken({
      req: { headers: req.headers },
      secret,
      cookieName,
    });
    if (!token?.sub) continue;
    const active = await isJwtSessionActive({
      sub: token.sub,
      sessionVersion: token.sessionVersion,
      sessionKey: token.sessionKey,
    });
    if (!active) return null;
    return token;
  }
  return null;
}

function emitPresence(
  io: Server,
  userId: string,
  status: PresenceStatus,
  viewerIds: string[],
) {
  const payload = { userId, status, at: new Date().toISOString() };
  // Never global-broadcast — only notify viewers allowed by privacy settings.
  for (const viewerId of viewerIds) {
    io.to(`user:${viewerId}`).emit("presence:changed", payload);
  }
  io.to(`user:${userId}`).emit("presence:changed", payload);
}

async function presenceViewers(userId: string) {
  const { filterOnlineStatusViewers } =
    await import("./src/modules/messaging/services/privacy-gate");
  const peers = await prisma.conversationMember.findMany({
    where: {
      leftAt: null,
      userId: { not: userId },
      conversation: { members: { some: { userId, leftAt: null } } },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  return filterOnlineStatusViewers(
    userId,
    peers.map((p) => p.userId),
  );
}

void app.prepare().then(async () => {
  assertBootEnv();
  const server = createServer(handler);
  const origins = socketAllowedOrigins();
  const io = setIo(
    new Server(server, {
      path: "/socket.io",
      cors: {
        origin: origins.length
          ? origins
          : process.env.NODE_ENV === "production"
            ? false
            : ["http://localhost:3000", "http://127.0.0.1:3000"],
        credentials: true,
      },
    }),
  );

  if (process.env.REDIS_URL) {
    try {
      const pub = createClient({ url: process.env.REDIS_URL });
      const sub = pub.duplicate();
      await Promise.all([pub.connect(), sub.connect()]);
      io.adapter(createAdapter(pub, sub));
      logger.info("socket_redis_adapter_enabled");
    } catch (error) {
      logger.warn("socket_redis_adapter_unavailable", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  io.use(async (socket, nextMiddleware) => {
    try {
      const headers = Object.fromEntries(
        Object.entries(socket.request.headers)
          .filter(
            (entry): entry is [string, string | string[]] =>
              entry[1] !== undefined,
          )
          .map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join("; ") : value,
          ]),
      );
      const token = await resolveToken({ headers });
      if (!token?.sub) return nextMiddleware(new Error("Unauthorized"));
      if (!(await isJwtSessionActive(token))) {
        return nextMiddleware(new Error("Unauthorized"));
      }
      const authed = socket as AuthedSocket;
      authed.userId = token.sub;
      authed.authToken = {
        sub: token.sub,
        sessionVersion: token.sessionVersion as number,
        sessionKey: token.sessionKey as string,
        impersonatorId:
          typeof token.impersonatorId === "string"
            ? token.impersonatorId
            : undefined,
        impersonatorSessionVersion:
          typeof token.impersonatorSessionVersion === "number"
            ? token.impersonatorSessionVersion
            : undefined,
      };
      return nextMiddleware();
    } catch {
      return nextMiddleware(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (rawSocket) => {
    const socket = rawSocket as AuthedSocket;
    const { authToken, userId } = socket;
    socket.join(`user:${userId}`);
    socket.join(`session:${authToken.sessionKey}`);
    if (authToken.impersonatorId) {
      socket.join(`impersonator:${authToken.impersonatorId}`);
    }
    socket.use(async (_packet, nextPacket) => {
      try {
        if (!(await isJwtSessionActive(authToken))) {
          socket.disconnect(true);
          return nextPacket(new Error("Unauthorized"));
        }
        return nextPacket();
      } catch {
        socket.disconnect(true);
        return nextPacket(new Error("Unauthorized"));
      }
    });
    const set = presenceSockets.get(userId) ?? new Set<string>();
    const wasOffline = set.size === 0;
    set.add(socket.id);
    presenceSockets.set(userId, set);
    await prisma.user
      .update({
        where: { id: userId },
        data: { presence: "ONLINE", lastSeenAt: new Date() },
      })
      .catch(() => undefined);
    if (wasOffline) {
      const viewers = await presenceViewers(userId).catch(() => [] as string[]);
      emitPresence(io, userId, "ONLINE", viewers);
    }
    const memberships = await prisma.conversationMember
      .findMany({
        where: { userId, leftAt: null },
        select: { conversationId: true },
      })
      .catch(() => []);
    memberships.forEach(({ conversationId }) =>
      socket.join(`conversation:${conversationId}`),
    );

    socket.on(
      "presence:update",
      (input: { status?: PresenceStatus }, callback?: Ack) =>
        ack(callback, async () => {
          const status = input?.status;
          if (!status || !Object.values(PresenceStatus).includes(status))
            throw new Error("Invalid presence status");
          await prisma.user.update({
            where: { id: userId },
            data: {
              presence: status,
              lastSeenAt: new Date(),
            },
          });
          const viewers = await presenceViewers(userId);
          emitPresence(io, userId, status, viewers);
          return { status };
        }),
    );
    socket.on(
      "conversation:join",
      (input: { conversationId: string }, callback?: Ack) =>
        ack(callback, async () => {
          await assertConversationMember(userId, input.conversationId);
          socket.join(`conversation:${input.conversationId}`);
          markChatActive(input.conversationId, userId);
          return null;
        }),
    );
    socket.on(
      "conversation:leave",
      (input: { conversationId: string }, callback?: Ack) =>
        ack(callback, async () => {
          socket.leave(`conversation:${input.conversationId}`);
          markChatInactive(input.conversationId, userId);
          return null;
        }),
    );
    socket.on("post:join", (input: { postId?: string }, callback?: Ack) =>
      ack(callback, async () => {
        const postId = input?.postId?.trim();
        if (!postId || postId.length > 64) throw new Error("Invalid post");
        const post = await prisma.post.findFirst({
          where: { id: postId, deletedAt: null, status: "PUBLISHED" },
          select: {
            id: true,
            visibility: true,
            author: { select: { id: true, isPrivate: true, status: true } },
          },
        });
        if (!post || post.author.status !== "ACTIVE") {
          throw new Error("Post not found");
        }
        const allowed = await canViewPostContent(
          userId,
          post.author,
          post.visibility,
        );
        if (!allowed) throw new Error("Forbidden");
        socket.join(`post:${postId}`);
        return { postId };
      }),
    );
    socket.on("post:leave", (input: { postId?: string }, callback?: Ack) =>
      ack(callback, async () => {
        const postId = input?.postId?.trim();
        if (!postId) return null;
        socket.leave(`post:${postId}`);
        return null;
      }),
    );
    for (const event of ["typing:start", "typing:stop"] as const) {
      socket.on(event, (input: { conversationId: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "typing", 90);
          await assertConversationMember(userId, input.conversationId);
          if (event === "typing:start" && !(await shouldShowTyping(userId)))
            return null;
          socket.to(`conversation:${input.conversationId}`).emit(event, {
            conversationId: input.conversationId,
            userId,
          });
          return null;
        }),
      );
    }
    socket.on(
      "message:send",
      (
        input: { conversationId: string } & Parameters<typeof sendMessage>[2],
        callback?: Ack,
      ) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "message:send", 40);
          const message = await sendMessage(
            userId,
            input.conversationId,
            input,
          );
          await broadcastMessageNew(input.conversationId, userId, message);
          return message;
        }),
    );
    socket.on(
      "message:edit",
      (input: { messageId: string; body: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "message:edit", 30);
          const message = await editMessage(
            userId,
            input.messageId,
            input.body,
          );
          io.to(`conversation:${message.conversationId}`).emit(
            "message:updated",
            message,
          );
          return message;
        }),
    );
    socket.on(
      "message:delete",
      (input: { messageId: string; forEveryone?: boolean }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "message:delete", 40);
          const deleted = await deleteMessage(
            userId,
            input.messageId,
            input.forEveryone,
          );
          const message = await prisma.message.findUnique({
            where: { id: input.messageId },
            select: { conversationId: true },
          });
          if (message)
            io.to(`conversation:${message.conversationId}`).emit(
              "message:deleted",
              {
                messageId: input.messageId,
                forEveryone: Boolean(input.forEveryone),
                userId,
              },
            );
          return deleted;
        }),
    );
    socket.on(
      "message:react",
      (input: { messageId: string; emoji: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "message:react", 60);
          const reaction = await reactMessage(
            userId,
            input.messageId,
            input.emoji,
          );
          const message = await prisma.message.findUnique({
            where: { id: input.messageId },
            select: { conversationId: true },
          });
          if (message)
            io.to(`conversation:${message.conversationId}`).emit(
              "message:reaction",
              { messageId: input.messageId, reaction },
            );
          return reaction;
        }),
    );
    socket.on(
      "message:delivered",
      (input: { conversationId: string; messageId?: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "message:delivered", 120);
          await markDelivered(userId, input.conversationId, input.messageId);
          io.to(`conversation:${input.conversationId}`).emit(
            "message:delivered",
            {
              conversationId: input.conversationId,
              messageId: input.messageId,
              userId,
            },
          );
          return null;
        }),
    );
    socket.on(
      "message:seen",
      (input: { conversationId: string; messageId?: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "message:seen", 120);
          const result = await markSeen(
            userId,
            input.conversationId,
            input.messageId,
          );
          if (result?.broadcast) {
            io.to(`conversation:${input.conversationId}`).emit("message:seen", {
              conversationId: input.conversationId,
              messageId: input.messageId,
              userId,
            });
          }
          return result;
        }),
    );

    // —— Live streaming control plane ——
    socket.on("live:join", (input: { sessionId?: string }, callback?: Ack) =>
      ack(callback, async () => {
        await guardSocketAbuse(userId, "live:join", 40);
        const sessionId = input?.sessionId?.trim();
        if (!sessionId) throw new Error("Invalid session");
        const session = await assertCanJoinLive(userId, sessionId);
        socket.join(`live:${sessionId}`);
        const count = await trackLiveViewerJoin(sessionId, userId, socket.id);
        await updateViewerCount(sessionId, count);
        io.to(`live:${sessionId}`).emit("live:peer-join", {
          sessionId,
          userId,
          socketId: socket.id,
          isHost: session.hostId === userId,
        });
        return { sessionId, viewerCount: count };
      }),
    );

    socket.on("live:leave", (input: { sessionId?: string }, callback?: Ack) =>
      ack(callback, async () => {
        await guardSocketAbuse(userId, "live:leave", 60);
        const sessionId = input?.sessionId?.trim();
        if (!sessionId) return null;
        socket.leave(`live:${sessionId}`);
        const count = await trackLiveViewerLeave(sessionId, userId, socket.id);
        await updateViewerCount(sessionId, count).catch(() => undefined);
        io.to(`live:${sessionId}`).emit("live:peer-leave", {
          sessionId,
          userId,
          socketId: socket.id,
        });
        return { viewerCount: count };
      }),
    );

    socket.on(
      "live:chat",
      (input: { sessionId: string; body: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "live:chat", 30);
          return postLiveChat(userId, input.sessionId, input.body);
        }),
    );

    socket.on(
      "live:gift",
      (input: { sessionId: string; giftId: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "live:gift", 20);
          return sendGift(userId, input.sessionId, input.giftId);
        }),
    );

    socket.on(
      "live:react",
      (input: { sessionId: string; emoji: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "live:react", 60);
          return broadcastLiveReaction(userId, input.sessionId, input.emoji);
        }),
    );

    socket.on("live:end", (input: { sessionId: string }, callback?: Ack) =>
      ack(callback, async () => {
        await guardSocketAbuse(userId, "live:end", 10);
        return endLiveSession(userId, input.sessionId);
      }),
    );

    socket.on(
      "live:mute",
      (
        input: { sessionId: string; userId: string; muted: boolean },
        callback?: Ack,
      ) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "live:mute", 30);
          return muteViewer(
            userId,
            input.sessionId,
            input.userId,
            Boolean(input.muted),
          );
        }),
    );

    socket.on(
      "live:block",
      (input: { sessionId: string; userId: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "live:block", 20);
          return blockViewer(userId, input.sessionId, input.userId);
        }),
    );

    socket.on(
      "live:pin",
      (
        input: { sessionId: string; messageId: string | null },
        callback?: Ack,
      ) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "live:pin", 20);
          return pinLiveChat(userId, input.sessionId, input.messageId ?? null);
        }),
    );

    socket.on(
      "live:chat:delete",
      (input: { sessionId: string; messageId: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "live:chat:delete", 30);
          return deleteLiveChat(userId, input.sessionId, input.messageId);
        }),
    );

    socket.on(
      "live:signal",
      (
        input: {
          sessionId: string;
          toUserId: string;
          signal: unknown;
        },
        callback?: Ack,
      ) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "live:signal", 180);
          const sessionId = input?.sessionId?.trim();
          const toUserId = input?.toUserId?.trim();
          if (!sessionId || !toUserId) throw new Error("Invalid signal");
          const session = await prisma.liveSession.findFirst({
            where: { id: sessionId, status: "LIVE" },
            select: { id: true, hostId: true },
          });
          if (!session) throw new Error("Live session not found");
          // Media is host↔viewer star only — never viewer↔viewer.
          const fromHost = session.hostId === userId;
          const toHost = session.hostId === toUserId;
          if (!fromHost && !toHost) throw new Error("Forbidden");
          if (!isLiveViewer(sessionId, userId) && !fromHost) {
            throw new Error("Not in live session");
          }
          if (!isLiveViewer(sessionId, toUserId) && !toHost) {
            throw new Error("Recipient not in live session");
          }
          io.to(`user:${toUserId}`).emit("live:signal", {
            sessionId,
            fromUserId: userId,
            signal: input.signal,
          });
          return null;
        }),
    );

    socket.on(
      "call:invite",
      (
        input: { conversationId?: string; calleeIds: string[]; type: CallType },
        callback?: Ack,
      ) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "call:invite", 20);
          const call = await createCall(userId, input);
          const calleeIds = call.participants
            .map((p) => p.userId)
            .filter((id) => id !== userId);
          const label =
            input.type === "VIDEO"
              ? "Incoming video call"
              : "Incoming voice call";
          for (const calleeId of calleeIds) {
            io.to(`user:${calleeId}`).emit("call:incoming", call);
            await createNotification({
              userId: calleeId,
              actorId: userId,
              type: "CALL",
              body: label,
            });
          }
          return call;
        }),
    );
    socket.on(
      "call:signal",
      (
        input: {
          callId: string;
          toUserId: string;
          signal: Prisma.InputJsonValue;
        },
        callback?: Ack,
      ) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "call:signal", 180);
          const call = await prisma.call.findUnique({
            where: { id: input.callId },
            select: { status: true },
          });
          if (!call || ["ENDED", "DECLINED", "MISSED", "FAILED"].includes(call.status)) {
            throw new Error("Call is not active");
          }
          const participant = await prisma.callParticipant.findUnique({
            where: { callId_userId: { callId: input.callId, userId } },
          });
          const recipient = await prisma.callParticipant.findUnique({
            where: {
              callId_userId: { callId: input.callId, userId: input.toUserId },
            },
          });
          if (!participant || !recipient)
            throw new Error("Call participant not found");
          io.to(`user:${input.toUserId}`).emit("call:signal", {
            callId: input.callId,
            fromUserId: userId,
            signal: input.signal,
          });
          return null;
        }),
    );
    socket.on("call:accept", (input: { callId: string }, callback?: Ack) =>
      ack(callback, async () => {
        await guardSocketAbuse(userId, "call:accept", 30);
        await markParticipantJoined(input.callId, userId);
        const call = await updateCallStatus(userId, input.callId, "ACTIVE");
        await setCallPresence(userId, "IN_CALL").catch(() => undefined);
        const participants = await listCallParticipants(input.callId);
        for (const participant of participants) {
          if (participant.userId === userId) continue;
          await setCallPresence(participant.userId, "IN_CALL").catch(
            () => undefined,
          );
          io.to(`user:${participant.userId}`).emit("call:accepted", {
            callId: input.callId,
            userId,
          });
        }
        return call;
      }),
    );
    socket.on(
      "call:busy",
      (input: { callId: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "call:busy", 30);
          const call = await updateCallStatus(userId, input.callId, "DECLINED");
          const participants = await listCallParticipants(input.callId);
          for (const participant of participants) {
            if (participant.userId === userId) continue;
            io.to(`user:${participant.userId}`).emit("call:busy", {
              callId: input.callId,
              userId,
            });
          }
          return call;
        }),
    );
    socket.on(
      "call:media-state",
      (
        input: {
          callId: string;
          muted?: boolean;
          cameraOff?: boolean;
          sharingScreen?: boolean;
        },
        callback?: Ack,
      ) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, "call:media-state", 60);
          await updateParticipantMedia(userId, input.callId, {
            muted: input.muted,
            cameraOff: input.cameraOff,
          });
          const participants = await listCallParticipants(input.callId);
          for (const participant of participants) {
            if (participant.userId === userId) continue;
            io.to(`user:${participant.userId}`).emit("call:media-state", {
              callId: input.callId,
              userId,
              muted: input.muted,
              cameraOff: input.cameraOff,
              sharingScreen: input.sharingScreen,
            });
          }
          return null;
        }),
    );
    for (const [event, status] of [
      ["call:decline", "DECLINED"],
      ["call:end", "ENDED"],
    ] as const) {
      socket.on(event, (input: { callId: string }, callback?: Ack) =>
        ack(callback, async () => {
          await guardSocketAbuse(userId, event, 40);
          const call = await updateCallStatus(userId, input.callId, status);
          await prisma.callParticipant.update({
            where: { callId_userId: { callId: input.callId, userId } },
            data: { leftAt: new Date() },
          });
          const participants = await listCallParticipants(input.callId);
          for (const participant of participants) {
            await setCallPresence(participant.userId, "ONLINE").catch(
              () => undefined,
            );
            if (participant.userId === userId) continue;
            io.to(`user:${participant.userId}`).emit(event, {
              callId: input.callId,
              userId,
            });
          }
          return call;
        }),
      );
    }
    socket.on("call:missed", (input: { callId: string }, callback?: Ack) =>
      ack(callback, async () => {
        await guardSocketAbuse(userId, "call:missed", 20);
        const row = await prisma.call.findUnique({
          where: { id: input.callId },
          select: { callerId: true },
        });
        if (!row) throw new Error("Call not found");
        if (row.callerId === userId) {
          throw new Error("Caller cannot mark the call missed");
        }
        const call = await updateCallStatus(userId, input.callId, "MISSED");
        const participants = await listCallParticipants(input.callId);
        await createNotification({
          userId: call.callerId,
          actorId: userId,
          type: "MISSED_CALL",
          body: "Missed call",
        });
        for (const participant of participants) {
          await setCallPresence(participant.userId, "ONLINE").catch(
            () => undefined,
          );
          io.to(`user:${participant.userId}`).emit("call:missed", {
            callId: input.callId,
            userId,
          });
        }
        return call;
      }),
    );
    socket.on("disconnect", () => {
      clearUserActiveChats(userId);
      const leftLives = clearSocketLiveViewers(userId, socket.id);
      for (const row of leftLives) {
        void updateViewerCount(row.sessionId, row.count).catch(() => undefined);
        io.to(`live:${row.sessionId}`).emit("live:peer-leave", {
          sessionId: row.sessionId,
          userId,
          socketId: socket.id,
        });
      }
      const sockets = presenceSockets.get(userId);
      if (!sockets) return;
      sockets.delete(socket.id);
      if (sockets.size) return;
      presenceSockets.delete(userId);
      void prisma.user
        .update({
          where: { id: userId },
          data: { presence: "OFFLINE", lastSeenAt: new Date() },
        })
        .catch(() => undefined);
      void presenceViewers(userId)
        .then((viewers) => emitPresence(io, userId, "OFFLINE", viewers))
        .catch(() => undefined);
    });
  });
  server.listen(Number(process.env.PORT) || 3000, () => {
    logger.info("server_ready", {
      port: Number(process.env.PORT) || 3000,
      env: process.env.NODE_ENV,
    });
    void import("./src/modules/admin/services/backups")
      .then(({ runScheduledBackups }) => runScheduledBackups())
      .catch((error) =>
        logger.warn("scheduled_backup_boot_failed", {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    void import("./src/modules/admin/services/cleanup")
      .then(({ runAutomaticCleanup }) => runAutomaticCleanup())
      .catch(() => undefined);
    // Daily backup tick (also checks weekly) — every 6 hours
    setInterval(
      () => {
        void import("./src/modules/admin/services/backups")
          .then(({ runScheduledBackups }) => runScheduledBackups())
          .catch((error) =>
            logger.warn("scheduled_backup_tick_failed", {
              error: error instanceof Error ? error.message : String(error),
            }),
          );
      },
      6 * 60 * 60_000,
    );
    setInterval(() => {
      void import("./src/modules/feed/services/posts")
        .then(({ publishScheduledPosts }) => publishScheduledPosts())
        .catch(() => undefined);
    }, 60_000);
    setInterval(
      () => {
        void import("./src/modules/admin/services/cleanup")
          .then(({ runAutomaticCleanup }) => runAutomaticCleanup())
          .catch(() => undefined);
      },
      6 * 60 * 60_000,
    );
  });
});
