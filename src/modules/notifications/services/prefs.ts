import type { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type NotificationPrefs = {
  social: boolean;
  messages: boolean;
  calls: boolean;
  live: boolean;
  community: boolean;
  product: boolean;
  pushEnabled: boolean;
  hideMessagePreview: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  social: true,
  messages: true,
  calls: true,
  live: true,
  community: true,
  product: true,
  pushEnabled: true,
  hideMessagePreview: false,
};

const CATEGORY: Record<
  NotificationType,
  keyof NotificationPrefs | "security"
> = {
  LIKE: "social",
  COMMENT: "social",
  REPLY: "social",
  FOLLOW: "social",
  FRIEND_REQUEST: "social",
  MENTION: "social",
  SHARE: "social",
  STORY_REPLY: "social",
  MESSAGE: "messages",
  CALL: "calls",
  MISSED_CALL: "calls",
  LIVE_STARTED: "live",
  LIVE_GIFT: "live",
  COMMUNITY_INVITE: "community",
  GROUP_INVITE: "community",
  ANNOUNCEMENT: "product",
  VERIFICATION: "security",
};

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPrefs> {
  const row = await prisma.notificationPreferences.findUnique({
    where: { userId },
  });
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFS };
  return {
    social: row.social,
    messages: row.messages,
    calls: row.calls,
    live: row.live,
    community: row.community,
    product: row.product,
    pushEnabled: row.pushEnabled,
    hideMessagePreview: row.hideMessagePreview,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<NotificationPrefs>,
) {
  const data = {
    ...(patch.social !== undefined ? { social: patch.social } : {}),
    ...(patch.messages !== undefined ? { messages: patch.messages } : {}),
    ...(patch.calls !== undefined ? { calls: patch.calls } : {}),
    ...(patch.live !== undefined ? { live: patch.live } : {}),
    ...(patch.community !== undefined ? { community: patch.community } : {}),
    ...(patch.product !== undefined ? { product: patch.product } : {}),
    ...(patch.pushEnabled !== undefined
      ? { pushEnabled: patch.pushEnabled }
      : {}),
    ...(patch.hideMessagePreview !== undefined
      ? { hideMessagePreview: patch.hideMessagePreview }
      : {}),
  };
  const row = await prisma.notificationPreferences.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_NOTIFICATION_PREFS, ...data },
    update: data,
  });
  return {
    social: row.social,
    messages: row.messages,
    calls: row.calls,
    live: row.live,
    community: row.community,
    product: row.product,
    pushEnabled: row.pushEnabled,
    hideMessagePreview: row.hideMessagePreview,
  } satisfies NotificationPrefs;
}

export function categoryAllowsType(
  prefs: NotificationPrefs,
  type: NotificationType,
) {
  const category = CATEGORY[type];
  if (category === "security") return true;
  return prefs[category] !== false;
}
