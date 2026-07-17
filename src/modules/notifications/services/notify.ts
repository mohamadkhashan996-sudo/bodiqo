import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getIo } from "@/lib/socket";
import { fanoutPush } from "@/modules/notifications/services/push";

type NotificationInput = {
  userId: string;
  actorId?: string;
  type: NotificationType;
  postId?: string;
  body?: string;
};

const DEFAULT_BODY: Partial<Record<NotificationType, string>> = {
  LIKE: "liked your post",
  COMMENT: "commented on your post",
  REPLY: "replied to a comment",
  FOLLOW: "started following you",
  FRIEND_REQUEST: "sent you a follow request",
  MESSAGE: "sent you a message",
  CALL: "is calling you",
  MISSED_CALL: "tried to call you",
  MENTION: "mentioned you",
  SHARE: "shared your post",
  STORY_REPLY: "replied to your story",
  GROUP_INVITE: "invited you to a group",
  COMMUNITY_INVITE: "invited you to a community",
  VERIFICATION: "Verification update",
};

export function notificationHref(input: {
  type: NotificationType;
  postId?: string | null;
  actorHandle?: string | null;
}) {
  if (
    input.postId &&
    ["LIKE", "COMMENT", "REPLY", "MENTION", "SHARE"].includes(input.type)
  ) {
    return `/post/${input.postId}`;
  }
  if (
    input.actorHandle &&
    ["FOLLOW", "FRIEND_REQUEST"].includes(input.type)
  ) {
    return `/u/${input.actorHandle}`;
  }
  if (input.type === "MESSAGE") return "/messages";
  if (input.type === "CALL" || input.type === "MISSED_CALL") return "/calls";
  return "/notifications";
}

function pushTitle(type: NotificationType, actorName?: string | null) {
  const name = actorName || "Someone";
  switch (type) {
    case "LIKE":
      return `${name} liked your post`;
    case "COMMENT":
      return `${name} commented`;
    case "REPLY":
      return `${name} replied`;
    case "FOLLOW":
      return `${name} followed you`;
    case "FRIEND_REQUEST":
      return `${name} requested to follow`;
    case "MESSAGE":
      return `Message from ${name}`;
    case "CALL":
      return `${name} is calling`;
    case "MISSED_CALL":
      return `Missed call from ${name}`;
    default:
      return "Relune";
  }
}

export async function createNotification(input: NotificationInput) {
  if (input.userId === input.actorId) return null;

  const body = input.body?.trim() || DEFAULT_BODY[input.type] || undefined;
  const created = await prisma.notification.create({
    data: { ...input, body },
    include: {
      actor: {
        select: {
          id: true,
          handle: true,
          name: true,
          displayName: true,
          image: true,
        },
      },
      post: { select: { id: true, body: true } },
    },
  });

  const actorName =
    created.actor?.displayName ?? created.actor?.name ?? created.actor?.handle;
  const href = notificationHref({
    type: created.type,
    postId: created.postId,
    actorHandle: created.actor?.handle,
  });

  getIo()?.to(`user:${input.userId}`).emit("notification:new", created);

  void fanoutPush(input.userId, {
    title: pushTitle(created.type, actorName),
    body:
      created.type === "MESSAGE" || created.type === "COMMENT" || created.type === "REPLY"
        ? (created.body || DEFAULT_BODY[created.type] || "New activity")
        : created.body || DEFAULT_BODY[created.type] || "New activity on Relune",
    url: href,
    tag: `relune-${created.type}-${created.id}`,
    type: created.type,
  }).catch(() => undefined);

  return created;
}

export async function listNotifications(
  userId: string,
  cursor?: string,
  limit = 20,
) {
  const take = Math.min(Math.max(limit, 1), 50);
  const notifications = await prisma.notification.findMany({
    where: { userId },
    include: {
      actor: {
        select: {
          id: true,
          handle: true,
          name: true,
          displayName: true,
          image: true,
        },
      },
      post: { select: { id: true, body: true } },
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor =
    notifications.length > take ? notifications.pop()!.id : null;
  return { notifications, nextCursor };
}

export async function countUnread(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markRead(userId: string, notificationId?: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      ...(notificationId ? { id: notificationId } : {}),
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
