import { z } from "zod";

import { body, clientIp, fail, guardApiAbuse, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createAuthChallenge } from "@/modules/auth/challenges";
import { consumePhoneOtp } from "@/modules/auth/phone-otp";
import { trackLogin } from "@/modules/auth/session-track";

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "phone:login", 20);
    const data = await body(
      request,
      z.object({
        phone: z.string().min(8).max(20),
        code: z.string().min(4).max(12),
      }),
    );
    const { phone } = await consumePhoneOtp({
      phone: data.phone,
      code: data.code,
      purpose: "LOGIN",
    });
    const user = await prisma.user.findFirst({
      where: { phone, phoneVerified: { not: null } },
    });
    if (!user) throw new AppError("No account with this verified phone", 404);
    if (user.isOfficial) {
      throw new AppError("This account cannot sign in with phone", 403);
    }
    if (
      user.status === "BANNED" ||
      user.status === "DELETED" ||
      user.status === "SUSPENDED"
    ) {
      await trackLogin({
        userId: user.id,
        success: false,
        provider: "phone",
        ip: clientIp(request),
        ua: request.headers.get("user-agent"),
      });
      throw new AppError("Account unavailable", 403);
    }

    if (user.twoFactorEnabled) {
      const token = await createAuthChallenge(user.id, "PHONE_2FA", {
        provider: "phone",
      });
      return ok({ requires2fa: true, token });
    }

    const token = await createAuthChallenge(user.id, "SESSION_READY", {
      provider: "phone",
    });
    return ok({ requires2fa: false, token });
  } catch (e) {
    return fail(e);
  }
}
