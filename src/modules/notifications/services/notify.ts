import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getIo } from "@/lib/socket";
import { extractMentions } from "@/lib/post-text";
import { fanoutPush } from "@/modules/notifications/services/push";

type NotificationInput = {
  userId: string;
  actorId?: string;
  type: NotificationType;
  postId?: string;
  href?: string;
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
  STORY_REPLY: "reacted to your story",
  GROUP_INVITE: "invited you to a group",
  COMMUNITY_INVITE: "invited you to a community",
  VERIFICATION: "Verification update",
};

export function notificationHref(input: {
  type: NotificationType;
  postId?: string | null;
  href?: string | null;
  actorHandle?: string | null;
}) {
  if (input.href) return input.href;
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
  if (input.type === "STORY_REPLY") return "/home";
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
    case "MENTION":
      return `${name} mentioned you`;
    case "SHARE":
      return `${name} shared your post`;
    case "FOLLOW":
      return `${name} followed you`;
    case "FRIEND_REQUEST":
      return `${name} sent a friend request`;
    case "MESSAGE":
      return `Message from ${name}`;
    case "STORY_REPLY":
      return `${name} reacted to your story`;
    case "CALL":
      return `${name} is calling`;
    case "MISSED_CALL":
      return `Missed call from ${name}`;
    case "GROUP_INVITE":
      return `${name} invited you to a group`;
    case "COMMUNITY_INVITE":
      return `${name} invited you to a community`;
    case "VERIFICATION":
      return "Verification update";
    default:
      return "Relune";
  }
}

export async function createNotification(input: NotificationInput) {
  if (input.userId === input.actorId) return null;

  if (input.actorId) {
    const muted = await prisma.mute.findUnique({
      where: {
        muterId_mutedId: {
          muterId: input.userId,
          mutedId: input.actorId,
        },
      },
      select: { id: true },
    });
    if (muted) return null;

    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: input.userId, blockedId: input.actorId },
          { blockerId: input.actorId, blockedId: input.userId },
        ],
      },
      select: { id: true },
    });
    if (blocked) return null;
  }

  const body = input.body?.trim() || DEFAULT_BODY[input.type] || undefined;
  const href =
    input.href ||
    notificationHref({
      type: input.type,
      postId: input.postId,
      href: input.href,
    });

  const created = await prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      postId: input.postId,
      href,
      body,
    },
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
  const url = notificationHref({
    type: created.type,
    postId: created.postId,
    href: created.href,
    actorHandle: created.actor?.handle,
  });

  getIo()?.to(`user:${input.userId}`).emit("notification:new", created);

  void fanoutPush(input.userId, {
    title: pushTitle(created.type, actorName),
    body:
      created.type === "MESSAGE" ||
      created.type === "COMMENT" ||
      created.type === "REPLY" ||
      created.type === "MENTION"
        ? created.body || DEFAULT_BODY[created.type] || "New activity"
        : created.body || DEFAULT_BODY[created.type] || "New activity on Relune",
    url,
    tag: `relune-${created.type}-${created.id}`,
    type: created.type,
  }).catch(() => undefined);

  return created;
}

/** Notify users mentioned via @handle in text (posts or comments). */
export async function notifyMentions(input: {
  actorId: string;
  text: string;
  postId?: string;
  href?: string;
  excludeUserIds?: string[];
}) {
  const handles = extractMentions(input.text);
  if (!handles.length) return;
  const exclude = new Set([input.actorId, ...(input.excludeUserIds ?? [])]);
  const users = await prisma.user.findMany({
    where: {
      handle: { in: handles },
      status: "ACTIVE",
      NOT: { id: { in: [...exclude] } },
    },
    select: { id: true },
  });
  const { canMention } = await import(
    "@/modules/messaging/services/privacy-gate"
  );
  await Promise.all(
    users.map(async (user) => {
      if (!(await canMention(input.actorId, user.id))) return;
      return createNotification({
        userId: user.id,
        actorId: input.actorId,
        type: "MENTION",
        postId: input.postId,
        href: input.href ?? (input.postId ? `/post/${input.postId}` : undefined),
      });
    }),
  );
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
