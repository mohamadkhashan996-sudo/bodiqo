import { logger } from "@/lib/logger";
import { securityAlertEmail, sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { disconnectUserSockets } from "@/lib/socket";
import { hashOpaque } from "@/modules/auth/password";
import {
  markDeviceSessionsRevoked,
  publishSessionVersion,
} from "@/modules/auth/session-validity";

export async function bumpSessionVersion(userId: string) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  await publishSessionVersion(userId, updated.sessionVersion);
}

/** Revoke every device session and bump JWT sessionVersion (admin/security). */
export async function invalidateAllUserSessions(userId: string) {
  const active = await prisma.deviceSession.findMany({
    where: { userId, revokedAt: null },
    select: { sessionKey: true },
  });
  await prisma.deviceSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined);
  await markDeviceSessionsRevoked(active.map((s) => s.sessionKey));
  await bumpSessionVersion(userId);
  disconnectUserSockets(userId);
}

export async function sendSecurityAlert(userId: string, detail: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true },
    });
    if (!user?.email || !user.emailVerified) return;
    const mail = securityAlertEmail(detail);
    await sendMail({
      to: user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (error) {
    logger.error("security_alert_failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function deviceFingerprint(ua?: string | null, ip?: string | null) {
  return hashOpaque(`${ua ?? "ua"}|${ip ?? "ip"}`);
}

export async function upsertTrustedDevice(opts: {
  userId: string;
  fingerprint: string;
  label?: string;
}) {
  return prisma.trustedDevice.upsert({
    where: {
      userId_fingerprint: {
        userId: opts.userId,
        fingerprint: opts.fingerprint,
      },
    },
    create: {
      userId: opts.userId,
      fingerprint: opts.fingerprint,
      label: opts.label,
    },
    update: { lastSeenAt: new Date(), label: opts.label },
  });
}

export async function isTrustedDevice(userId: string, fingerprint: string) {
  const row = await prisma.trustedDevice.findUnique({
    where: { userId_fingerprint: { userId, fingerprint } },
  });
  return Boolean(row);
}

export async function alertNewLogin(opts: {
  userId: string;
  ip?: string | null;
  ua?: string | null;
  provider?: string | null;
}) {
  const fingerprint = deviceFingerprint(opts.ua, opts.ip);
  const trusted = await isTrustedDevice(opts.userId, fingerprint);
  if (trusted) {
    await upsertTrustedDevice({
      userId: opts.userId,
      fingerprint,
      label: opts.provider ?? "Trusted device",
    });
    return;
  }
  const recent = await prisma.loginHistory.findFirst({
    where: {
      userId: opts.userId,
      success: true,
      ip: opts.ip ?? undefined,
      createdAt: { gt: new Date(Date.now() - 7 * 24 * 60_000 * 60) },
    },
  });
  if (recent) return;

  await sendSecurityAlert(
    opts.userId,
    `New sign-in detected via ${opts.provider ?? "credentials"}${opts.ip ? ` from ${opts.ip}` : ""}. If this wasn’t you, reset your password and review active sessions.`,
  );
}
