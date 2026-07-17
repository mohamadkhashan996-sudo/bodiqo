import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { verifyPassword } from "@/modules/auth/password";
import { storeTotpSecret } from "@/modules/auth/two-factor";

/** Begin 2FA setup without disabling an already-enabled authenticator. */
export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "2fa:setup", 10);
    const user = await requireUser();
    let password: string | undefined;
    try {
      const data = await body(
        request,
        z.object({ password: z.string().min(8).max(128).optional() }),
      );
      password = data.password;
    } catch {
      password = undefined;
    }

    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        passwordHash: true,
        twoFactorEnabled: true,
      },
    });
    if (!me) throw new AppError("Unauthorized", 401);

    if (me.twoFactorEnabled) {
      if (!password || !me.passwordHash) {
        throw new AppError("Password required to replace 2FA", 400);
      }
      if (!(await verifyPassword(password, me.passwordHash))) {
        throw new AppError("Incorrect password", 401);
      }
    }

    const secret = generateSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorPending: storeTotpSecret(secret) },
    });

    const otpauthUrl = generateURI({
      issuer: "Relune",
      label: me.email || user.id,
      secret,
    });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      margin: 1,
      width: 200,
      color: { dark: "#12141a", light: "#ffffff" },
    });

    return ok({
      secret,
      otpauthUrl,
      qrDataUrl,
      replacing: me.twoFactorEnabled,
    });
  } catch (e) {
    return fail(e);
  }
}
