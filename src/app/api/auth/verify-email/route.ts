import { z } from "zod";

import { body, fail, guardApiAbuse, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { consumeEmailToken } from "@/modules/auth/email-tokens";
import { officialFollowNewUser } from "@/modules/platform/official-account";
export async function POST(r: Request) {
  try {
    await guardApiAbuse(r, "auth:verify-email:post");
    const { token } = await body(r, z.object({ token: z.string().min(20) }));
    const record = await consumeEmailToken(token, "VERIFY_EMAIL");
    await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date(), status: "ACTIVE" },
    });
    await officialFollowNewUser(record.userId);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
