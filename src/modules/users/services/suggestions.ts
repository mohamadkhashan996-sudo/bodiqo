import { cached } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { blockedIdsFor } from "@/modules/users/services/visibility";

const userSelect = {
  id: true,
  handle: true,
  name: true,
  displayName: true,
  image: true,
  isVerified: true,
  isOfficial: true,
  isPrivate: true,
  bio: true,
  followersCount: true,
} as const;

/** People worth following: friends-of-friends, shared interests, then popular accounts. */
export async function getSuggestedUsers(limit = 8, viewerId?: string) {
  const take = Math.min(Math.max(limit, 1), 24);
  return cached(`suggest:users:${viewerId ?? "guest"}:${take}`, 60, () =>
    loadSuggestedUsers(take, viewerId),
  );
}

async function loadSuggestedUsers(take: number, viewerId?: string) {
  const exclude = new Set<string>();
  if (viewerId) exclude.add(viewerId);

  const results: Array<{
    id: string;
    handle: string | null;
    name: string | null;
    displayName: string | null;
    image: string | null;
    isVerified: boolean;
    isOfficial: boolean;
    isPrivate: boolean;
    bio: string | null;
    followersCount: number;
  }> = [];

  function pushUnique(users: typeof results) {
    for (const user of users) {
      if (exclude.has(user.id) || results.length >= take) continue;
      exclude.add(user.id);
      results.push(user);
    }
  }

  if (viewerId) {
    const [following, pending, blocked] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
      }),
      prisma.friendRequest.findMany({
        where: { fromUserId: viewerId, status: "PENDING" },
        select: { toUserId: true },
      }),
      blockedIdsFor(viewerId),
    ]);
    for (const row of following) exclude.add(row.followingId);
    for (const row of pending) exclude.add(row.toUserId);
    for (const id of blocked) exclude.add(id);

    const friendIds = following.map((row) => row.followingId);
    if (friendIds.length) {
      // Friends of friends ranked by shared connections.
      const fof = await prisma.follow.groupBy({
        by: ["followingId"],
        where: {
          followerId: { in: friendIds },
          followingId: { notIn: [...exclude] },
          following: { status: "ACTIVE" },
        },
        _count: { followingId: true },
        orderBy: { _count: { followingId: "desc" } },
        take: take * 2,
      });
      if (fof.length) {
        const users = await prisma.user.findMany({
          where: {
            id: { in: fof.map((row) => row.followingId) },
            status: "ACTIVE",
            isPrivate: false,
          },
          select: userSelect,
        });
        const rank = new Map(
          fof.map((row) => [row.followingId, row._count.followingId]),
        );
        users.sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0));
        pushUnique(users);
      }
    }

    if (results.length < take) {
      const myInterests = await prisma.userInterest.findMany({
        where: { userId: viewerId },
        select: { interestId: true },
      });
      const interestIds = myInterests.map((x) => x.interestId);
      if (interestIds.length) {
        const byInterest = await prisma.user.findMany({
          where: {
            status: "ACTIVE",
            isPrivate: false,
            id: { notIn: [...exclude] },
            interests: { some: { interestId: { in: interestIds } } },
          },
          select: userSelect,
          orderBy: { followersCount: "desc" },
          take: take - results.length,
        });
        pushUnique(byInterest);
      }
    }
  }

  if (results.length < take) {
    const more = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        isPrivate: false,
        id: exclude.size ? { notIn: [...exclude] } : undefined,
      },
      select: userSelect,
      orderBy: [{ isOfficial: "desc" }, { followersCount: "desc" }],
      take: take - results.length,
    });
    pushUnique(more);
  }

  return results;
}
