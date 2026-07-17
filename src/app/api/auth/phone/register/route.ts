import { z } from "zod";
import { body, clientIp, fail, guardApiAbuse, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { getSetting } from "@/modules/admin/services/settings";
import { consumePhoneOtp } from "@/modules/auth/phone-otp";
import { normalizePhone, phoneAccountEmail } from "@/modules/auth/phone";
import { createAuthChallenge } from "@/modules/auth/challenges";
import { officialFollowNewUser } from "@/modules/platform/official-account";
import { assertHandleAvailable } from "@/modules/platform/reserved-handles";
import { logger } from "@/lib/logger";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.replace(/^@+/, ""))
    .pipe(z.string().regex(/^[a-z0-9_.]{3,24}$/)),
  phone: z.string().min(8).max(20),
  code: z.string().min(4).max(12),
});

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "phone:register", 12, 60_000);
    const ip = clientIp(request) ?? "anon";
    if (!(await rateLimit(`register:phone:${ip}`, 8, 60_000)).ok) {
      throw new AppError("Too many requests", 429);
    }

    const registration =
      (await getSetting<{ open?: boolean }>("registration")) ?? {};
    if (registration.open === false) {
      throw new AppError("Registration is closed", 403);
    }

    const data = await body(request, schema);
    assertHandleAvailable(data.handle);

    const { phone } = await consumePhoneOtp({
      phone: data.phone,
      code: data.code,
      purpose: "REGISTER",
    });

    const email = phoneAccountEmail(phone);
    const exists = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, { email }, { handle: data.handle }],
        status: { not: "DELETED" },
      },
      select: { id: true },
    });
    if (exists) {
      throw new AppError("Phone or handle already in use", 409);
    }

    const now = new Date();
    const user = await prisma.user.create({
      data: {
        name: data.name,
        handle: data.handle,
        email,
        phone: normalizePhone(phone),
        phoneVerified: now,
        emailVerified: now,
        status: "ACTIVE",
      },
      select: { id: true, handle: true },
    });

    await officialFollowNewUser(user.id).catch(() => undefined);
    logger.info("user_registered_phone", { userId: user.id });

    const token = await createAuthChallenge(user.id, "SESSION_READY", {
      provider: "phone",
    });
    return ok(
      {
        ok: true,
        user: { id: user.id, handle: user.handle },
        token,
      },
      201,
    );
  } catch (e) {
    return fail(e);
  }
}
