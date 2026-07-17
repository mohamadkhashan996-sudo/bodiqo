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

async function audienceSetting(
  actorId: string,
  targetId: string,
  setting: "whoCanComment" | "whoCanSeeStories" | "whoCanSeeActivity",
  fallback: PrivacyAudience,
) {
  if (actorId === targetId) return true;
  const [privacy, blocked] = await Promise.all([
    prisma.privacySettings.findUnique({
      where: { userId: targetId },
      select: { [setting]: true },
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
  return audienceAllows(
    actorId,
    targetId,
    (privacy?.[setting] as PrivacyAudience | undefined) ?? fallback,
  );
}

/** Whether actor may comment on target author's posts. */
export function canComment(actorId: string, authorId: string) {
  return audienceSetting(actorId, authorId, "whoCanComment", "EVERYONE");
}

/** Whether viewer may see target author's stories. */
export function canSeeStories(viewerId: string | undefined, authorId: string) {
  if (!viewerId) {
    return prisma.privacySettings
      .findUnique({
        where: { userId: authorId },
        select: { whoCanSeeStories: true },
      })
      .then((privacy) => (privacy?.whoCanSeeStories ?? "EVERYONE") === "EVERYONE");
  }
  return audienceSetting(viewerId, authorId, "whoCanSeeStories", "EVERYONE");
}

/**
 * Batch story visibility for a rail of authors (avoids N+1 privacy/follow lookups).
 * Returns the set of author IDs the viewer may see stories from.
 */
export async function filterVisibleStoryAuthors(
  viewerId: string | undefined,
  authorIds: string[],
) {
  const unique = [...new Set(authorIds)];
  if (!unique.length) return new Set<string>();

  if (!viewerId) {
    const settings = await prisma.privacySettings.findMany({
      where: { userId: { in: unique } },
      select: { userId: true, whoCanSeeStories: true },
    });
    const byUser = new Map(
      settings.map((row) => [row.userId, row.whoCanSeeStories]),
    );
    return new Set(
      unique.filter(
        (id) => (byUser.get(id) ?? "EVERYONE") === "EVERYONE",
      ),
    );
  }

  const [settings, blocks, followsOut, followsIn] = await Promise.all([
    prisma.privacySettings.findMany({
      where: { userId: { in: unique } },
      select: { userId: true, whoCanSeeStories: true },
    }),
    prisma.block.findMany({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: { in: unique } },
          { blockedId: viewerId, blockerId: { in: unique } },
        ],
      },
      select: { blockerId: true, blockedId: true },
    }),
    prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: unique } },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followingId: viewerId, followerId: { in: unique } },
      select: { followerId: true },
    }),
  ]);

  const audience = new Map(
    settings.map((row) => [row.userId, row.whoCanSeeStories]),
  );
  const blocked = new Set(
    blocks.flatMap((row) =>
      row.blockerId === viewerId ? [row.blockedId] : [row.blockerId],
    ),
  );
  const following = new Set(followsOut.map((row) => row.followingId));
  const followers = new Set(followsIn.map((row) => row.followerId));

  const allowed = new Set<string>();
  for (const id of unique) {
    if (id === viewerId) {
      allowed.add(id);
      continue;
    }
    if (blocked.has(id)) continue;
    const rule = audience.get(id) ?? "EVERYONE";
    if (rule === "EVERYONE") {
      allowed.add(id);
    } else if (rule === "NOBODY") {
      continue;
    } else if (rule === "FOLLOWERS" && following.has(id)) {
      allowed.add(id);
    } else if (rule === "FOLLOWING" && followers.has(id)) {
      allowed.add(id);
    } else if (rule === "MUTUAL" && following.has(id) && followers.has(id)) {
      allowed.add(id);
    }
  }
  return allowed;
}

/** Whether viewer may see target author's activity (likes, etc.). */
export function canSeeActivity(viewerId: string, authorId: string) {
  return audienceSetting(viewerId, authorId, "whoCanSeeActivity", "FOLLOWERS");
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
