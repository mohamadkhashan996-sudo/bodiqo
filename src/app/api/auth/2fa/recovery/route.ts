import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { verifyTotpOrBackup, generateBackupCodes } from "@/modules/auth/two-factor";
import { sendSecurityAlert } from "@/modules/auth/security";

export async function GET() {
  try {
    const user = await requireUser();
    const count = await prisma.twoFactorBackupCode.count({
      where: { userId: user.id, usedAt: null },
    });
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true },
    });
    return ok({ enabled: Boolean(me?.twoFactorEnabled), remaining: count });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "2fa:recovery", 8);
    const user = await requireUser();
    const { code } = await body(
      request,
      z.object({ code: z.string().min(6).max(64) }),
    );
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });
    if (!me?.twoFactorEnabled) throw new AppError("Enable 2FA first", 400);
    await verifyTotpOrBackup(user.id, me.twoFactorSecret, code);
    const recoveryCodes = await generateBackupCodes(user.id);
    await sendSecurityAlert(
      user.id,
      "Your Relune recovery codes were regenerated. Previous codes no longer work.",
    );
    return ok({ recoveryCodes });
  } catch (e) {
    return fail(e);
  }
}
