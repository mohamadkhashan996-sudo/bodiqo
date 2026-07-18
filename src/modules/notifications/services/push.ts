import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  isWebPushConfigured,
  type PushPayload,
  sendWebPush,
} from "@/lib/web-push";
import { getSetting } from "@/modules/admin/services/settings";
import { getNotificationPreferences } from "@/modules/notifications/services/prefs";

export async function upsertPushSubscription(
  userId: string,
  input: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  },
) {
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: input.endpoint },
    select: { id: true, userId: true },
  });
  if (existing && existing.userId !== userId) {
    throw new AppError("Push subscription belongs to another account", 409);
  }

  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent?.slice(0, 280),
    },
    update: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent?.slice(0, 280),
    },
  });
}

export async function deletePushSubscription(
  userId: string,
  endpoint?: string,
) {
  if (endpoint) {
    return prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }
  return prisma.pushSubscription.deleteMany({ where: { userId } });
}

export async function pushEnabled() {
  if (!isWebPushConfigured()) return false;
  const setting = await getSetting<{ enabled?: boolean }>("pushNotifications");
  return setting?.enabled !== false;
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let index = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 0)) },
    async () => {
      while (index < items.length) {
        const current = items[index++]!;
        await worker(current);
      }
    },
  );
  await Promise.all(runners);
}

export async function fanoutPush(userId: string, payload: PushPayload) {
  if (!(await pushEnabled())) return;
  const prefs = await getNotificationPreferences(userId);
  if (!prefs.pushEnabled) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;

  await mapPool(subs, 8, async (sub) => {
    const result = await sendWebPush(sub, payload);
    if (result.gone) {
      await prisma.pushSubscription
        .delete({ where: { id: sub.id } })
        .catch(() => undefined);
    }
  });
}
