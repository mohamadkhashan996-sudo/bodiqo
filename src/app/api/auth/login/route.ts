import { z } from "zod";
import { body, fail, guardApiAbuse, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/modules/auth/password";
import { createAuthChallenge } from "@/modules/auth/challenges";
import { trackLogin } from "@/modules/auth/session-track";
import { isProviderEnabled } from "@/modules/auth/provider-settings";
import { getAuthSecurityPolicy } from "@/modules/auth/security-policy";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

async function requestMeta() {
  try {
    const h = await headers();
    return {
      ip:
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        null,
      ua: h.get("user-agent"),
    };
  } catch {
    return { ip: null, ua: null };
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isProviderEnabled("credentials"))) {
      throw new AppError("Email sign-in is currently unavailable", 403);
    }
    await guardApiAbuse(request, "auth:login", 20, 60_000);
    const policy = await getAuthSecurityPolicy();
    const { email, password } = await body(
      request,
      z.object({
        email: z.string().email(),
        password: z.string().min(8).max(128),
      }),
    );

    const normalized = email.toLowerCase();
    const limited = await rateLimit(`auth:${normalized}`, 8, 60_000);
    if (!limited.ok) {
      throw new AppError("Too many attempts. Try again shortly.", 429);
    }

    const meta = await requestMeta();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user?.passwordHash) {
      throw new AppError("Incorrect email or password", 401);
    }

    if (
      user.status === "DELETED" ||
      user.status === "BANNED" ||
      user.status === "SUSPENDED"
    ) {
      await trackLogin({
        userId: user.id,
        success: false,
        provider: "credentials",
        ip: meta.ip,
        ua: meta.ua,
      });
      throw new AppError("This account isn’t available right now", 403);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await trackLogin({
        userId: user.id,
        success: false,
        provider: "credentials",
        ip: meta.ip,
        ua: meta.ua,
      });
      throw new AppError("Account temporarily locked. Try again later.", 423);
    }

    if (!user.emailVerified) {
      await trackLogin({
        userId: user.id,
        success: false,
        provider: "credentials",
        ip: meta.ip,
        ua: meta.ua,
      });
      throw new AppError("EMAIL_NOT_VERIFIED", 403);
    }

    const okPw = await verifyPassword(password, user.passwordHash);
    if (!okPw) {
      const fails = user.failedLoginCount + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: fails,
          ...(fails >= policy.maxLoginAttempts
            ? { lockedUntil: new Date(Date.now() + policy.lockoutMs) }
            : {}),
        },
      });
      await trackLogin({
        userId: user.id,
        success: false,
        provider: "credentials",
        ip: meta.ip,
        ua: meta.ua,
      });
      throw new AppError("Incorrect email or password", 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    if (user.twoFactorEnabled) {
      const token = await createAuthChallenge(user.id, "CREDENTIALS_2FA", {
        provider: "credentials",
      });
      return ok({ requires2fa: true, token });
    }

    const token = await createAuthChallenge(user.id, "SESSION_READY", {
      provider: "credentials",
    });
    return ok({ requires2fa: false, token });
  } catch (error) {
    return fail(error);
  }
}
