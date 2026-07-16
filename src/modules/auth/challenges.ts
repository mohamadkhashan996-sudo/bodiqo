import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashOpaque } from "@/modules/auth/password";
import { AppError } from "@/lib/errors";

export async function createAuthChallenge(
  userId: string,
  purpose: string,
  meta?: Prisma.InputJsonValue,
  ttlMinutes = 10,
) {
  const token = randomBytes(32).toString("hex");
  await prisma.authChallenge.create({
    data: {
      userId,
      purpose,
      tokenHash: hashOpaque(token),
      meta,
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    },
  });
  return token;
}

export async function consumeAuthChallenge(token: string, purpose: string) {
  const row = await prisma.authChallenge.findUnique({
    where: { tokenHash: hashOpaque(token) },
  });
  if (!row || row.usedAt || row.expiresAt < new Date() || row.purpose !== purpose) {
    throw new AppError("This challenge is invalid or expired", 400);
  }
  await prisma.authChallenge.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return row;
}

export async function peekAuthChallenge(token: string, purpose: string) {
  const row = await prisma.authChallenge.findUnique({
    where: { tokenHash: hashOpaque(token) },
    include: {
      user: { select: { id: true, email: true, twoFactorEnabled: true } },
    },
  });
  if (!row || row.usedAt || row.expiresAt < new Date() || row.purpose !== purpose) {
    return null;
  }
  return row;
}
