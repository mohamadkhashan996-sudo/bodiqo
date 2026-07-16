import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^@+/, ""))
    .pipe(
      z
        .string()
        .regex(
          /^[a-z0-9_.]{3,24}$/,
          "Handle must be 3–24 letters, numbers, _ or .",
        ),
    ),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "anon";
  const limited = rateLimit(`register:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const handle = parsed.data.handle;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { handle }] },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Email or handle already in use." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      handle,
      email,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
    },
    select: { id: true, email: true, handle: true },
  });

  logger.info("user_registered", { userId: user.id });

  return NextResponse.json({ ok: true, user });
}
