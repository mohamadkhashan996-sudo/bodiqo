import { PrivacyAudience } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function audienceAllows(actorId: string, targetId: string, audience: PrivacyAudience) {
  if (actorId === targetId) return true;
  if (audience === "EVERYONE") return true;
  if (audience === "NOBODY") return false;

  const [followsTarget, targetFollows] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: actorId, followingId: targetId } },
      select: { id: true },
    }),
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: targetId, followingId: actorId } },
      select: { id: true },
    }),
  ]);
  if (audience === "FOLLOWERS") return Boolean(followsTarget);
  if (audience === "FOLLOWING") return Boolean(targetFollows);
  return Boolean(followsTarget && targetFollows);
}

async function canContact(actorId: string, targetId: string, setting: "whoCanMessage" | "whoCanCall") {
  const [target, blocked, restricted] = await Promise.all([
    prisma.privacySettings.findUnique({ where: { userId: targetId }, select: { [setting]: true } }),
    prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: actorId, blockedId: targetId },
          { blockerId: targetId, blockedId: actorId },
        ],
      },
      select: { id: true },
    }),
    prisma.restrict.findFirst({
      where: { restrictorId: targetId, restrictedId: actorId },
      select: { id: true },
    }),
  ]);
  if (blocked || restricted) return false;
  return audienceAllows(
    actorId,
    targetId,
    target?.[setting] ?? (setting === "whoCanMessage" ? "EVERYONE" : "FOLLOWERS"),
  );
}

export function canMessage(actorId: string, targetId: string) {
  return canContact(actorId, targetId, "whoCanMessage");
}

export function canCall(actorId: string, targetId: string) {
  return canContact(actorId, targetId, "whoCanCall");
}

export async function canFollow(actorId: string, targetId: string) {
  if (actorId === targetId) return false;
  const [privacy, blocked] = await Promise.all([
    prisma.privacySettings.findUnique({
      where: { userId: targetId },
      select: { whoCanFollow: true },
    }),
    prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: actorId, blockedId: targetId },
          { blockerId: targetId, blockedId: actorId },
        ],
      },
      select: { id: true },
    }),
  ]);
  if (blocked) return false;
  return audienceAllows(actorId, targetId, privacy?.whoCanFollow ?? "EVERYONE");
}

export async function getMessagingPrivacy(userId: string) {
  return (
    (await prisma.privacySettings.findUnique({
      where: { userId },
      select: {
        showReadReceipts: true,
        showTyping: true,
        whoCanSeeOnline: true,
      },
    })) ?? {
      showReadReceipts: true,
      showTyping: true,
      whoCanSeeOnline: "FOLLOWERS" as PrivacyAudience,
    }
  );
}

export async function canSeeOnlineStatus(viewerId: string, targetId: string) {
  if (viewerId === targetId) return true;
  const privacy = await prisma.privacySettings.findUnique({
    where: { userId: targetId },
    select: { whoCanSeeOnline: true },
  });
  return audienceAllows(viewerId, targetId, privacy?.whoCanSeeOnline ?? "FOLLOWERS");
}

export async function shouldShowTyping(userId: string) {
  const privacy = await getMessagingPrivacy(userId);
  return privacy.showTyping;
}

export async function shouldShowReadReceipts(userId: string) {
  const privacy = await getMessagingPrivacy(userId);
  return privacy.showReadReceipts;
}
