import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

import { writeAudit } from "./audit";
import { getSetting, updateSettings } from "./settings";

export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  shorts: true,
  live: true,
  stories: true,
  communities: true,
  messaging: true,
  calls: true,
  gifts: true,
  registration: true,
  pushNotifications: true,
  creatorStudio: true,
  exploreRecommendations: true,
};

export async function getFeatureFlags() {
  const stored = await getSetting<Record<string, boolean> | undefined>(
    "featureFlags",
  );
  return { ...DEFAULT_FEATURE_FLAGS, ...(stored ?? {}) };
}

export async function updateFeatureFlags(
  actorId: string,
  patch: Record<string, boolean>,
) {
  const current = await getFeatureFlags();
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_FEATURE_FLAGS) && !(key in current)) {
      throw new AppError(`Unknown feature flag: ${key}`, 400);
    }
    next[key] = Boolean(value);
  }
  await updateSettings(actorId, { featureFlags: next });
  await writeAudit({
    actorId,
    action: "admin.feature_flags.update",
    meta: patch,
  });
  return next;
}

export async function listPaymentsOverview() {
  const [giftEvents, wallets, catalog, giftSum30, giftSumAll] =
    await Promise.all([
      prisma.liveGiftEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          gift: { select: { name: true, coinCost: true, isActive: true } },
          sender: {
            select: { id: true, handle: true, displayName: true },
          },
          host: {
            select: { id: true, handle: true, displayName: true },
          },
          session: { select: { id: true, title: true } },
        },
      }),
      prisma.liveWallet.findMany({
        orderBy: { coins: "desc" },
        take: 30,
        include: {
          user: {
            select: { id: true, handle: true, displayName: true, email: true },
          },
        },
      }),
      prisma.liveGiftCatalog.findMany({
        orderBy: [{ sortOrder: "asc" }, { coinCost: "asc" }],
      }),
      prisma.liveGiftEvent.aggregate({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) },
        },
        _sum: { coinCost: true },
        _count: { _all: true },
      }),
      prisma.liveGiftEvent.aggregate({
        _sum: { coinCost: true },
        _count: { _all: true },
      }),
    ]);

  return {
    summary: {
      giftCoins30d: giftSum30._sum.coinCost ?? 0,
      giftEvents30d: giftSum30._count._all,
      giftCoinsLifetime: giftSumAll._sum.coinCost ?? 0,
      giftEventsLifetime: giftSumAll._count._all,
      walletsTracked: wallets.length,
    },
    recentGifts: giftEvents,
    topWallets: wallets,
    catalog,
    note: "Live gift economy only — Stripe/IAP payouts are not in first public release.",
  };
}

export async function adjustWalletCoins(
  actorId: string,
  userId: string,
  delta: number,
  reason: string,
) {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new AppError("delta must be a non-zero integer", 400);
  }
  if (Math.abs(delta) > 100_000) {
    throw new AppError("Adjustment too large", 400);
  }
  const note = reason.trim().slice(0, 300);
  if (note.length < 3) throw new AppError("Reason required", 400);

  const wallet = await prisma.liveWallet.upsert({
    where: { userId },
    create: { userId, coins: Math.max(0, delta) },
    update: {},
  });

  const next = wallet.coins + delta;
  if (next < 0) throw new AppError("Wallet would go negative", 400);

  const updated = await prisma.liveWallet.update({
    where: { userId },
    data: { coins: next },
  });

  await writeAudit({
    actorId,
    action: "admin.payments.wallet.adjust",
    target: userId,
    meta: { delta, reason: note, before: wallet.coins, after: next },
  });

  return updated;
}

export async function setGiftCatalogActive(
  actorId: string,
  giftId: string,
  active: boolean,
) {
  const gift = await prisma.liveGiftCatalog
    .update({
      where: { id: giftId },
      data: { isActive: active },
    })
    .catch(() => {
      throw new AppError("Gift not found", 404);
    });
  await writeAudit({
    actorId,
    action: "admin.payments.catalog.active",
    target: giftId,
    meta: { active },
  });
  return gift;
}
