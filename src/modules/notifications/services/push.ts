import { prisma } from "@/lib/prisma";
import { getSetting } from "@/modules/admin/services/settings";
import { isWebPushConfigured, sendWebPush, type PushPayload } from "@/lib/web-push";

export async function upsertPushSubscription(
  userId: string,
  input: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  },
) {
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
      userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent?.slice(0, 280),
    },
  });
}

export async function deletePushSubscription(userId: string, endpoint?: string) {
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

export async function fanoutPush(userId: string, payload: PushPayload) {
  if (!(await pushEnabled())) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;
  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendWebPush(sub, payload);
      if (result.gone) {
        await prisma.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch(() => undefined);
      }
    }),
  );
}
