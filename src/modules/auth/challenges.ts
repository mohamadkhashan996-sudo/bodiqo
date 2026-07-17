import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashOpaque, hashOpaqueLegacy } from "@/modules/auth/password";
import { AppError } from "@/lib/errors";

const challengeUserSelect = {
  id: true,
  email: true,
  name: true,
} as const;

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

async function findChallenge(token: string) {
  const hashes = [hashOpaque(token), hashOpaqueLegacy(token)];
  return prisma.authChallenge.findFirst({
    where: { tokenHash: { in: hashes } },
    include: { user: { select: challengeUserSelect } },
  });
}

export async function consumeAuthChallenge(token: string, purpose: string) {
  const row = await findChallenge(token);
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
  const row = await findChallenge(token);
  if (!row || row.usedAt || row.expiresAt < new Date() || row.purpose !== purpose) {
    return null;
  }
  return row;
}
