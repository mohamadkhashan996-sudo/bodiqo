import { prisma } from "@/lib/prisma";
import { hashOpaque, randomRecoveryCode } from "@/modules/auth/password";
import { AppError } from "@/lib/errors";
import { verify } from "otplib";

export async function generateBackupCodes(userId: string, count = 10) {
  const plain = Array.from({ length: count }, () => randomRecoveryCode());
  await prisma.twoFactorBackupCode.deleteMany({ where: { userId } });
  await prisma.twoFactorBackupCode.createMany({
    data: plain.map((code) => ({
      userId,
      codeHash: hashOpaque(code.replace(/-/g, "").toUpperCase()),
    })),
  });
  return plain;
}

export async function consumeBackupCode(userId: string, code: string) {
  const normalized = code.replace(/[-\s]/g, "").toUpperCase();
  if (normalized.length < 8) return false;
  const hash = hashOpaque(normalized);
  const row = await prisma.twoFactorBackupCode.findFirst({
    where: { userId, codeHash: hash, usedAt: null },
  });
  if (!row) return false;
  await prisma.twoFactorBackupCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return true;
}

export async function verifyTotpOrBackup(
  userId: string,
  secret: string | null | undefined,
  code: string,
) {
  const trimmed = code.trim();
  if (secret && /^\d{6}$/.test(trimmed)) {
    const result = await verify({ token: trimmed, secret });
    if (result.valid) return { method: "totp" as const };
  }
  if (await consumeBackupCode(userId, trimmed)) {
    return { method: "backup" as const };
  }
  throw new AppError("Invalid authenticator or recovery code", 401);
}

export async function clearTwoFactor(userId: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorPending: null,
      },
    }),
    prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
  ]);
}
