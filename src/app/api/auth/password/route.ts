import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { bumpSessionVersion, sendSecurityAlert } from "@/modules/auth/security";

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "password:change", 10);
    const user = await requireUser();
    const data = await body(
      request,
      z.object({
        currentPassword: z.string().min(8).max(128).optional(),
        newPassword: z.string().min(8).max(128),
      }),
    );
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!me) throw new AppError("Unauthorized", 401);

    if (me.passwordHash) {
      if (!data.currentPassword) {
        throw new AppError("Current password required", 400);
      }
      if (!(await verifyPassword(data.currentPassword, me.passwordHash))) {
        throw new AppError("Incorrect current password", 401);
      }
    }

    const passwordHash = await hashPassword(data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    await bumpSessionVersion(user.id);
    await sendSecurityAlert(
      user.id,
      "Your Relune password was changed. All other sessions were signed out.",
    );
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
