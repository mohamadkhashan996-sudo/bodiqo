import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { body, fail, guardApiAbuse } from "@/lib/api";
import { createEmailToken } from "@/modules/auth/email-tokens";
import { sendMail, welcomeEmail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/url";
import { getSetting } from "@/modules/admin/services/settings";
import { hashPassword } from "@/modules/auth/password";
import { assertHandleAvailable } from "@/modules/platform/reserved-handles";
import { assertHoneypotEmpty } from "@/lib/ai-content-gate";

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
    // Honeypot + rate limits are the active bot controls.
    assertHandleAvailable(data.handle);
    const email = data.email.toLowerCase();
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { handle: data.handle }] },
      select: { id: true },
    });
    if (exists)
      return NextResponse.json(
        { error: "Email or handle already in use" },
        { status: 409 },
      );
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
    return NextResponse.json(
      {
        ok: true,
        user: { id: user.id, email: user.email, handle: user.handle },
        ...(process.env.NODE_ENV !== "production"
          ? { token, previewToken: mail.previewToken, verifyUrl }
          : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    return fail(error);
  }
}
