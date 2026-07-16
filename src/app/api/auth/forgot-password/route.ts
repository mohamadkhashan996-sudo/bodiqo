import { z } from "zod";
import { body, fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createEmailToken } from "@/modules/auth/email-tokens";
import { sendMail } from "@/lib/mail";
export async function POST(r: Request) {
  try {
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
    const mail = await sendMail({
      to: user.email,
      subject: "Reset your password",
      text: `Reset token: ${token}`,
      html: `<p>Reset token: <strong>${token}</strong></p>`,
    });
    return ok({
      ok: true,
      ...(process.env.NODE_ENV !== "production"
        ? { token, previewToken: mail.previewToken }
        : {}),
    });
  } catch (e) {
    return fail(e);
  }
}
