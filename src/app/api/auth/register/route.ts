import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { body, fail } from "@/lib/api";
import { createEmailToken } from "@/modules/auth/email-tokens";
import { sendMail } from "@/lib/mail";
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
});
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "anon";
    if (!rateLimit(`register:${ip}`, 8, 60000).ok)
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const data = await body(request, schema);
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
        passwordHash: await bcrypt.hash(data.password, 12),
        status: "PENDING",
      },
      select: { id: true, email: true, handle: true },
    });
    const token = await createEmailToken(user.id, email, "VERIFY_EMAIL", 24);
    const mail = await sendMail({
      to: email,
      subject: "Verify your Cirqua email",
      text: `Verification token: ${token}`,
      html: `<p>Verification token: <strong>${token}</strong></p>`,
    });
    logger.info("user_registered", { userId: user.id });
    return NextResponse.json(
      {
        ok: true,
        user,
        ...(process.env.NODE_ENV !== "production"
          ? { token, previewToken: mail.previewToken }
          : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    return fail(error);
  }
}
