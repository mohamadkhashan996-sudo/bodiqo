import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { hashToken, randomToken } from "@/lib/tokens";

export async function createEmailToken(userId: string, email: string, purpose: string, hours = 24) {
  const rawToken = randomToken();
  const token = hashToken(rawToken);
  await prisma.$transaction([
    prisma.emailToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.emailToken.create({ data: { userId, email: email.toLowerCase(), token, purpose, expiresAt: new Date(Date.now() + hours * 3_600_000) } }),
  ]);
  return rawToken;
}

export async function consumeEmailToken(rawToken: string, purpose: string) {
  const token = await prisma.emailToken.findUnique({ where: { token: hashToken(rawToken) } });
  if (!token || token.purpose !== purpose || token.usedAt || token.expiresAt <= new Date()) {
    throw new AppError("Invalid or expired token", 400, "INVALID_TOKEN");
  }
  await prisma.emailToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  return token;
}
