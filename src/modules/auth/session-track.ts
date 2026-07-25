import { prisma } from "@/lib/prisma";

type LoginInput = {
  userId: string;
  success: boolean;
  ip?: string | null;
  ua?: string | null;
  provider?: string | null;
};

export async function trackLogin({
  userId,
  success,
  ip,
  ua,
  provider,
}: LoginInput) {
  return prisma.loginHistory.create({
    data: {
      userId,
      success,
      ip: ip ?? undefined,
      userAgent: ua ?? undefined,
      provider: provider ?? undefined,
    },
  });
}

export async function upsertDeviceSession({
  userId,
  sessionKey,
  ua,
  ip,
  label,
}: {
  userId: string;
  sessionKey: string;
  ua?: string | null;
  ip?: string | null;
  label?: string | null;
}) {
  return prisma.deviceSession.upsert({
    where: { sessionKey },
    create: {
      userId,
      sessionKey,
      userAgent: ua ?? undefined,
      ip: ip ?? undefined,
      deviceLabel: label ?? undefined,
    },
    update: {
      userAgent: ua ?? undefined,
      ip: ip ?? undefined,
      deviceLabel: label ?? undefined,
      lastActiveAt: new Date(),
    },
  });
}
