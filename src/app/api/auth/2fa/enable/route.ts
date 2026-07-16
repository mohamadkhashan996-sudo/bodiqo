import { verify } from "otplib";
import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { generateBackupCodes } from "@/modules/auth/two-factor";
import { sendSecurityAlert } from "@/modules/auth/security";

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "2fa:enable", 15);
    const user = await requireUser();
    const { code } = await body(
      request,
      z.object({ code: z.string().min(6).max(12) }),
    );
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorPending: true, twoFactorSecret: true, twoFactorEnabled: true },
    });
    const secret = current?.twoFactorPending || (!current?.twoFactorEnabled ? current?.twoFactorSecret : null);
    if (!secret) throw new AppError("Start 2FA setup first", 400);

    const valid = await verify({ token: code, secret });
    if (!valid.valid) throw new AppError("Invalid authenticator code", 400);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorPending: null,
        twoFactorEnabled: true,
      },
    });
    const recoveryCodes = await generateBackupCodes(user.id);
    await sendSecurityAlert(
      user.id,
      "Two-factor authentication was enabled on your Relune account. Save your recovery codes in a safe place.",
    );
    return ok({ ok: true, recoveryCodes });
  } catch (e) {
    return fail(e);
  }
}
