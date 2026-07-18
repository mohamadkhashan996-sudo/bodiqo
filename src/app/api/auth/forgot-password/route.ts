import { z } from "zod";

import { body, fail, guardApiAbuse, ok } from "@/lib/api";
import { resetPasswordEmail, sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/url";
import { createEmailToken } from "@/modules/auth/email-tokens";

export async function POST(r: Request) {
  try {
    await guardApiAbuse(r, "auth:forgot", 5, 60_000);
    const { email } = await body(r, z.object({ email: z.string().email() }));
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return ok({ ok: true });
    const token = await createEmailToken(
      user.id,
      user.email,
      "RESET_PASSWORD",
      2,
    );
    const resetUrl = absoluteUrl(
      `/reset-password?token=${encodeURIComponent(token)}`,
    );
    const template = resetPasswordEmail(resetUrl);
    const mail = await sendMail({
      to: user.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    return ok({
      ok: true,
      ...(process.env.NODE_ENV !== "production"
        ? { token, previewToken: mail.previewToken, resetUrl }
        : {}),
    });
  } catch (e) {
    return fail(e);
  }
}
