import { prisma } from "@/lib/prisma";

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

async function blockedIds(viewerId: string) {
  const rows = await prisma.block.findMany({
    where: {
      OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
    },
    select: { blockerId: true, blockedId: true },
  });
  return [
    ...new Set(
      rows.flatMap((row) =>
        row.blockerId === viewerId ? [row.blockedId] : [row.blockerId],
      ),
    ),
  ];
}

/** People worth following: popular public accounts the viewer does not already follow. */
export async function getSuggestedUsers(limit = 8, viewerId?: string) {
  const take = Math.min(Math.max(limit, 1), 24);
  const exclude = new Set<string>();
  if (viewerId) exclude.add(viewerId);

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
      blockedIds(viewerId),
    ]);
    for (const row of following) exclude.add(row.followingId);
    for (const row of pending) exclude.add(row.toUserId);
    for (const id of blocked) exclude.add(id);
  }

  const excluded = [...exclude];

  // Prefer shared interests when signed in
  if (viewerId) {
    const myInterests = await prisma.userInterest.findMany({
      where: { userId: viewerId },
      select: { interestId: true },
    });
    const interestIds = myInterests.map((x) => x.interestId);
    if (interestIds.length) {
      const byInterest = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          id: excluded.length ? { notIn: excluded } : undefined,
          interests: { some: { interestId: { in: interestIds } } },
        },
        select: userSelect,
        orderBy: { followersCount: "desc" },
        take,
      });
      if (byInterest.length >= Math.min(3, take)) {
        return byInterest;
      }
      for (const user of byInterest) exclude.add(user.id);
    }
  }

  const more = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      isPrivate: false,
      id: exclude.size ? { notIn: [...exclude] } : undefined,
    },
    select: userSelect,
    orderBy: [{ isOfficial: "desc" }, { followersCount: "desc" }],
    take,
  });

  return more;
}
