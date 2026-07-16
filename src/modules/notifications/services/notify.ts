import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotificationInput = {
  userId: string;
  actorId?: string;
  type: NotificationType;
  postId?: string;
  body?: string;
};

export async function createNotification(input: NotificationInput) {
  if (input.userId === input.actorId) return null;
  return prisma.notification.create({ data: input });
}

export async function listNotifications(userId: string, cursor?: string, limit = 20) {
  const take = Math.min(Math.max(limit, 1), 50);
  const notifications = await prisma.notification.findMany({
    where: { userId },
    include: {
      actor: {
        select: { id: true, handle: true, name: true, displayName: true, image: true },
      },
      post: { select: { id: true, body: true } },
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor = notifications.length > take ? notifications.pop()!.id : null;
  return { notifications, nextCursor };
}

export async function markRead(userId: string, notificationId?: string) {
  return prisma.notification.updateMany({
    where: { userId, ...(notificationId ? { id: notificationId } : {}), readAt: null },
    data: { readAt: new Date() },
  });
}
