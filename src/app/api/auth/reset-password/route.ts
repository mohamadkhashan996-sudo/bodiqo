import bcrypt from "bcryptjs";
import { z } from "zod";
import { body, fail, ok } from "@/lib/api";
import { consumeEmailToken } from "@/modules/auth/email-tokens";
import { prisma } from "@/lib/prisma";
export async function POST(r: Request) {
  try {
    const { token, password } = await body(
      r,
      z.object({
        token: z.string().min(20),
        password: z.string().min(8).max(128),
      }),
    );
    const record = await consumeEmailToken(token, "RESET_PASSWORD");
    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
    await prisma.deviceSession.updateMany({
      where: { userId: record.userId },
      data: { revokedAt: new Date() },
    });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
