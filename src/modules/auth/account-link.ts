import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { hashToken, randomToken } from "@/lib/tokens";
import type { OAuthProviderId } from "@/modules/auth/providers";

/** Non-secret fields only — never persist OAuth access/refresh/id tokens. */
type PendingPayload = {
  email: string;
  provider: OAuthProviderId;
  providerAccountId: string;
  type: string;
  userName?: string | null;
  userImage?: string | null;
};

type StoredLinkPayload = {
  provider: OAuthProviderId;
  providerAccountId: string;
  type: string;
  userName?: string | null;
  userImage?: string | null;
};

/** Store pending OAuth link. Returns raw token (hashed at rest). */
export async function createPendingOAuthLink(payload: PendingPayload) {
  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (!existing) throw new AppError("Account not found", 404);

  const rawToken = randomToken();
  const token = hashToken(rawToken);
  const stored: StoredLinkPayload = {
    provider: payload.provider,
    providerAccountId: payload.providerAccountId,
    type: payload.type || "oauth",
    userName: payload.userName ?? null,
    userImage: payload.userImage ?? null,
  };

  await prisma.$transaction([
    prisma.emailToken.updateMany({
      where: {
        userId: existing.id,
        purpose: { startsWith: "ACCOUNT_LINK:" },
        usedAt: null,
      },
      data: { usedAt: new Date() },
    }),
    prisma.emailToken.create({
      data: {
        userId: existing.id,
        email: payload.email,
        token,
        purpose: `ACCOUNT_LINK:${JSON.stringify(stored)}`,
        expiresAt: new Date(Date.now() + 15 * 60_000),
      },
    }),
  ]);
  return rawToken;
}

export async function getPendingOAuthLink(rawToken: string) {
  const row = await prisma.emailToken.findUnique({
    where: { token: hashToken(rawToken) },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  if (!row.purpose.startsWith("ACCOUNT_LINK:")) return null;
  const json = row.purpose.slice("ACCOUNT_LINK:".length);
  try {
    const data = JSON.parse(json) as StoredLinkPayload;
    if (!data.provider || !data.providerAccountId) return null;
    return { row, data: { ...data, email: row.email } };
  } catch {
    return null;
  }
}

export async function confirmPendingOAuthLink(
  rawToken: string,
  userId: string,
) {
  const pending = await getPendingOAuthLink(rawToken);
  if (!pending || pending.row.userId !== userId) {
    throw new AppError("This link is invalid or expired", 400);
  }
  const { data, row } = pending;

  // Link identity only — provider tokens are obtained on the next OAuth sign-in.
  await prisma.$transaction([
    prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: data.provider,
          providerAccountId: data.providerAccountId,
        },
      },
      create: {
        userId,
        type: data.type || "oauth",
        provider: data.provider,
        providerAccountId: data.providerAccountId,
      },
      update: {
        userId,
      },
    }),
    prisma.emailToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: new Date(),
        ...(data.userImage ? { image: data.userImage } : {}),
      },
    }),
  ]);
  return { provider: data.provider };
}
