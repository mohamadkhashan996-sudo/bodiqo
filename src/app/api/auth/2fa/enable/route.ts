import { verify } from "otplib";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/auth";
import { sendSecurityAlert } from "@/modules/auth/security";
import { markDeviceSessionsRevoked } from "@/modules/auth/session-validity";
import {
  generateBackupCodes,
  resolveTotpSecret,
  storeTotpSecret,
} from "@/modules/auth/two-factor";

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "2fa:enable", 15);
    const user = await requireUser();
    const session = await auth();
    const { code } = await body(
      request,
      z.object({ code: z.string().min(6).max(12) }),
    );
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        twoFactorPending: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });
    const sealed =
      current?.twoFactorPending ||
      (!current?.twoFactorEnabled ? current?.twoFactorSecret : null);
    const secret = resolveTotpSecret(sealed);
    if (!secret) throw new AppError("Start 2FA setup first", 400);

    const valid = await verify({ token: code, secret });
    if (!valid.valid) throw new AppError("Invalid authenticator code", 400);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: storeTotpSecret(secret),
        twoFactorPending: null,
        twoFactorEnabled: true,
      },
    });

    // Revoke every other device so stolen sessions cannot skip the new 2FA gate.
    const currentId = session?.deviceSessionId;
    const others = await prisma.deviceSession.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { sessionKey: true },
    });
    await prisma.deviceSession.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    await markDeviceSessionsRevoked(others.map((s) => s.sessionKey));

    const recoveryCodes = await generateBackupCodes(user.id);
    await sendSecurityAlert(
      user.id,
      "Two-factor authentication was enabled on your Relune account. Other sessions were signed out. Save your recovery codes in a safe place.",
    );
    return ok({ ok: true, recoveryCodes, otherSessionsRevoked: true });
  } catch (e) {
    return fail(e);
  }
}
