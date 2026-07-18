import { z } from "zod";

import { body, fail, guardApiAbuse, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { consumeEmailToken } from "@/modules/auth/email-tokens";
import { assertStrongPassword, hashPassword } from "@/modules/auth/password";
import { bumpSessionVersion, sendSecurityAlert } from "@/modules/auth/security";

export async function POST(r: Request) {
  try {
    await guardApiAbuse(r, "auth:reset-password:post");
    const { token, password } = await body(
      r,
      z.object({
        token: z.string().min(20),
        password: z.string().min(8).max(128),
      }),
    );
    assertStrongPassword(password);
    const record = await consumeEmailToken(token, "RESET_PASSWORD");
    await prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(password),
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await prisma.deviceSession.updateMany({
      where: { userId: record.userId },
      data: { revokedAt: new Date() },
    });
    await bumpSessionVersion(record.userId);
    await sendSecurityAlert(
      record.userId,
      "Your Relune password was reset. If you didn’t request this, contact support immediately.",
    );
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
