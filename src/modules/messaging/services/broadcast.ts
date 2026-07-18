import { prisma } from "@/lib/prisma";
import { getIo, usersViewingConversation } from "@/lib/socket";
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

function messagePreview(message: {
  body?: string | null;
  type?: string;
  mediaUrl?: string | null;
  isEncrypted?: boolean;
}) {
  if (message.isEncrypted) return "Encrypted message";
  const body = message.body?.trim();
  if (body) return body.slice(0, 180);
  switch (message.type) {
    case "IMAGE":
      return "Photo";
    case "VIDEO":
      return "Video";
    case "AUDIO":
      return "Voice note";
    case "FILE":
    case "DOCUMENT":
      return "File";
    default:
      return "New message";
  }
}

export async function broadcastMessageNew(
  conversationId: string,
  senderId: string,
  message: {
    body?: string | null;
    id: string;
    type?: string;
    mediaUrl?: string | null;
    isEncrypted?: boolean;
    [key: string]: unknown;
  },
) {
  const io = getIo();
  if (!io) return;
  const members = await prisma.conversationMember.findMany({
    where: { conversationId, leftAt: null },
    select: { userId: true, isMuted: true },
  });
  await ensureMembersInRoom(
    conversationId,
    members.map((m) => m.userId),
  );
  io.to(`conversation:${conversationId}`).emit("message:new", message);
  // Also nudge each member's personal room so inbox screens update.
  for (const member of members) {
    io.to(`user:${member.userId}`).emit("conversation:updated", {
      conversationId,
      message,
      senderId,
    });
  }

  const preview = messagePreview(message);
  const recipients = members.filter((m) => m.userId !== senderId && !m.isMuted);
  const viewingIds = usersViewingConversation(conversationId);

  await Promise.all(
    recipients.map(async (m) => {
      if (viewingIds.has(m.userId)) return;
      await createNotification({
        userId: m.userId,
        actorId: senderId,
        type: "MESSAGE",
        body: preview,
        href: `/messages/${conversationId}`,
      });
    }),
  );
}

export function broadcastMessageUpdated(
  conversationId: string,
  message: unknown,
) {
  getIo()
    ?.to(`conversation:${conversationId}`)
    .emit("message:updated", message);
}

export function broadcastMessageDeleted(
  conversationId: string,
  payload: { messageId: string; forEveryone: boolean; userId: string },
) {
  getIo()
    ?.to(`conversation:${conversationId}`)
    .emit("message:deleted", payload);
}

export function broadcastMessageReaction(
  conversationId: string,
  payload: { messageId: string; reaction: unknown },
) {
  getIo()
    ?.to(`conversation:${conversationId}`)
    .emit("message:reaction", payload);
}
