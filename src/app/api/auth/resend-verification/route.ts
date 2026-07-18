import { z } from "zod";

import { body, fail, guardApiAbuse, ok } from "@/lib/api";
import { sendMail, verifyEmailTemplate } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/url";
import { createEmailToken } from "@/modules/auth/email-tokens";

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "auth:resend-verify", 5, 60_000);
    const { email } = await body(
      request,
      z.object({ email: z.string().email() }),
    );
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        status: true,
        name: true,
        handle: true,
      },
    });

    // Always return ok to avoid email enumeration
    if (
      !user ||
      user.emailVerified ||
      user.status === "DELETED" ||
      user.status === "BANNED"
    ) {
      return ok({ ok: true });
    }

    const token = await createEmailToken(
      user.id,
      user.email,
      "VERIFY_EMAIL",
      24,
    );
    const verifyUrl = absoluteUrl(
      `/verify-email?token=${encodeURIComponent(token)}`,
    );
    const template = verifyEmailTemplate(verifyUrl);
    const mail = await sendMail({
      to: user.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    return ok({
      ok: true,
      ...(process.env.NODE_ENV !== "production"
        ? { token, previewToken: mail.previewToken, verifyUrl }
        : {}),
    });
  } catch (error) {
    return fail(error);
  }
}
