import { z } from "zod";
import { body, fail, ok } from "@/lib/api";
import { consumeEmailToken } from "@/modules/auth/email-tokens";
import { prisma } from "@/lib/prisma";
export async function POST(r: Request) {
  try {
    const { token } = await body(r, z.object({ token: z.string().min(20) }));
    const record = await consumeEmailToken(token, "VERIFY_EMAIL");
    await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date(), status: "ACTIVE" },
    });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
