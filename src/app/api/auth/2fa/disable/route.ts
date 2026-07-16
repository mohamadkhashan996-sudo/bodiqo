import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { verifyTotpOrBackup, clearTwoFactor } from "@/modules/auth/two-factor";
import { bumpSessionVersion, sendSecurityAlert } from "@/modules/auth/security";

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "2fa:disable", 10);
    const user = await requireUser();
    const { code } = await body(
      request,
      z.object({ code: z.string().min(6).max(64) }),
    );
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!current?.twoFactorEnabled) throw new AppError("2FA is not enabled", 400);
    await verifyTotpOrBackup(user.id, current.twoFactorSecret, code);
    await clearTwoFactor(user.id);
    await bumpSessionVersion(user.id);
    await sendSecurityAlert(
      user.id,
      "Two-factor authentication was disabled on your Relune account.",
    );
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
