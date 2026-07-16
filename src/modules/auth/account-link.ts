import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { OAuthProviderId } from "@/modules/auth/providers";

type PendingPayload = {
  email: string;
  provider: OAuthProviderId;
  providerAccountId: string;
  type: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  userName?: string | null;
  userImage?: string | null;
};

/** Store pending OAuth link in EmailToken.purpose = ACCOUNT_LINK (token encodes lookup). */
export async function createPendingOAuthLink(payload: PendingPayload) {
  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!existing) throw new AppError("Account not found", 404);

  const token = randomBytes(32).toString("hex");
  await prisma.emailToken.create({
    data: {
      userId: existing.id,
      email: payload.email,
      token,
      purpose: `ACCOUNT_LINK:${JSON.stringify({
        provider: payload.provider,
        providerAccountId: payload.providerAccountId,
        type: payload.type,
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_at: payload.expires_at,
        token_type: payload.token_type,
        scope: payload.scope,
        id_token: payload.id_token,
        userName: payload.userName,
        userImage: payload.userImage,
      })}`,
      expiresAt: new Date(Date.now() + 15 * 60_000),
    },
  });
  return token;
}

export async function getPendingOAuthLink(token: string) {
  const row = await prisma.emailToken.findUnique({ where: { token } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  if (!row.purpose.startsWith("ACCOUNT_LINK:")) return null;
  const json = row.purpose.slice("ACCOUNT_LINK:".length);
  try {
    const data = JSON.parse(json) as PendingPayload;
    return { row, data: { ...data, email: row.email } };
  } catch {
    return null;
  }
}

export async function confirmPendingOAuthLink(token: string, userId: string) {
  const pending = await getPendingOAuthLink(token);
  if (!pending || pending.row.userId !== userId) {
    throw new AppError("This link is invalid or expired", 400);
  }
  const { data, row } = pending;
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
        access_token: data.access_token ?? undefined,
        refresh_token: data.refresh_token ?? undefined,
        expires_at: data.expires_at ?? undefined,
        token_type: data.token_type ?? undefined,
        scope: data.scope ?? undefined,
        id_token: data.id_token ?? undefined,
      },
      update: {
        userId,
        access_token: data.access_token ?? undefined,
        refresh_token: data.refresh_token ?? undefined,
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
