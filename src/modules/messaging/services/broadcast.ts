import { getIo } from "@/lib/socket";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/modules/notifications/services/notify";

async function ensureMembersInRoom(conversationId: string, userIds: string[]) {
  const io = getIo();
  if (!io) return;
  await Promise.all(
    userIds.map(async (userId) => {
      const sockets = await io.in(`user:${userId}`).fetchSockets();
      for (const socket of sockets) {
        socket.join(`conversation:${conversationId}`);
      }
    }),
  );
}

export async function broadcastMessageNew(
  conversationId: string,
  senderId: string,
  message: { body?: string | null; id: string },
) {
  const io = getIo();
  if (!io) return;
  const members = await prisma.conversationMember.findMany({
    where: { conversationId, leftAt: null },
    select: { userId: true },
  });
  await ensureMembersInRoom(
    conversationId,
    members.map((m) => m.userId),
  );
  io.to(`conversation:${conversationId}`).emit("message:new", message);
  const preview = (message.body || "New message").slice(0, 180);
  await Promise.all(
    members
      .filter((m) => m.userId !== senderId)
      .map((m) =>
        createNotification({
          userId: m.userId,
          actorId: senderId,
          type: "MESSAGE",
          body: preview,
        }),
      ),
  );
}

export function broadcastMessageUpdated(conversationId: string, message: unknown) {
  getIo()?.to(`conversation:${conversationId}`).emit("message:updated", message);
}

export function broadcastMessageDeleted(
  conversationId: string,
  payload: { messageId: string; forEveryone: boolean; userId: string },
) {
  getIo()?.to(`conversation:${conversationId}`).emit("message:deleted", payload);
}

export function broadcastMessageReaction(
  conversationId: string,
  payload: { messageId: string; reaction: unknown },
) {
  getIo()?.to(`conversation:${conversationId}`).emit("message:reaction", payload);
}
