import { NextResponse } from "next/server";
import { z } from "zod";

import { assertHoneypotEmpty } from "@/lib/ai-content-gate";
import { body, fail, guardApiAbuse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { sendMail, welcomeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/url";
import { getSetting } from "@/modules/admin/services/settings";
import { createEmailToken } from "@/modules/auth/email-tokens";
import { hashPassword } from "@/modules/auth/password";
import { assertHandleAvailable } from "@/modules/platform/reserved-handles";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.replace(/^@+/, ""))
    .pipe(z.string().regex(/^[a-z0-9_.]{3,24}$/)),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  website: z.string().max(200).optional(),
});

/** Uniform success — avoids email/handle enumeration. */
function registerAck() {
  return NextResponse.json(
    {
      ok: true,
      message:
        "If this email is available, we sent a verification link. Check your inbox.",
    },
    { status: 201 },
  );
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "auth:register", 12, 60_000);
    const ip = request.headers.get("x-forwarded-for") ?? "anon";
    if (!(await rateLimit(`register:${ip}`, 8, 60000)).ok)
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const registration =
      (await getSetting<{ open?: boolean }>("registration")) ?? {};
    if (registration.open === false) {
      return NextResponse.json(
        { error: "Registration is closed" },
        { status: 403 },
      );
    }
    const data = await body(request, schema);
    assertHoneypotEmpty(data.website);
    assertHandleAvailable(data.handle);
    const email = data.email.toLowerCase();

    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      // Do not reveal that the email exists.
      return registerAck();
    }

    const existingHandle = await prisma.user.findUnique({
      where: { handle: data.handle },
      select: { id: true },
    });
    if (existingHandle) {
      return NextResponse.json(
        { error: "Unable to create account with that handle" },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        handle: data.handle,
        email,
        passwordHash: await hashPassword(data.password),
        status: "PENDING",
      },
      select: { id: true, email: true, handle: true, name: true },
    });
    const token = await createEmailToken(user.id, email, "VERIFY_EMAIL", 24);
    const verifyUrl = absoluteUrl(
      `/verify-email?token=${encodeURIComponent(token)}`,
    );
    const welcome = welcomeEmail(
      user.name || user.handle || "there",
      verifyUrl,
    );
    const mail = await sendMail({
      to: email,
      subject: welcome.subject,
      text: welcome.text,
      html: welcome.html,
    });
    logger.info("user_registered", { userId: user.id });
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        {
          ok: true,
          message:
            "If this email is available, we sent a verification link. Check your inbox.",
          token,
          previewToken: mail.previewToken,
          verifyUrl,
        },
        { status: 201 },
      );
    }
    return registerAck();
  } catch (error) {
    return fail(error);
  }
}
