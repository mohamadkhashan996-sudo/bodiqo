import { prisma } from "@/lib/prisma";

export async function searchAll(query: string, userId?: string) {
  const q = query.trim();
  if (!q) return { users: [], posts: [], hashtags: [] };

  let excludedIds: string[] = [];
  if (userId) {
    const blocks = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    excludedIds = [
      ...new Set(
        blocks.flatMap((row) =>
          row.blockerId === userId ? [row.blockedId] : [row.blockerId],
        ),
      ),
      userId,
    ];
  }

  const [users, posts, hashtags] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
        ...(excludedIds.length ? { id: { notIn: excludedIds } } : {}),
        OR: [
          { handle: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        handle: true,
        name: true,
        displayName: true,
        image: true,
        bio: true,
        isVerified: true,
        isOfficial: true,
        isPrivate: true,
        followersCount: true,
      },
      orderBy: { followersCount: "desc" },
      take: 20,
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        visibility: "PUBLIC",
        body: { contains: q, mode: "insensitive" },
        ...(excludedIds.length
          ? { authorId: { notIn: excludedIds } }
          : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            handle: true,
            name: true,
            displayName: true,
            image: true,
            isVerified: true,
            isOfficial: true,
          },
        },
        media: true,
      },
      take: 20,
      orderBy: { publishedAt: "desc" },
    }),
    prisma.hashtag.findMany({
      where: { tag: { contains: q.toLowerCase() } },
      orderBy: { postCount: "desc" },
      take: 10,
    }),
  ]);

  let usersWithRelation: Array<
    (typeof users)[number] & {
      relation?: "none" | "following" | "requested";
    }
  > = users;
  if (userId && users.length) {
    const ids = users.map((u) => u.id);
    const [following, pending] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId, followingId: { in: ids } },
        select: { followingId: true },
      }),
      prisma.friendRequest.findMany({
        where: {
          fromUserId: userId,
          toUserId: { in: ids },
          status: "PENDING",
        },
        select: { toUserId: true },
      }),
    ]);
    const followingSet = new Set(following.map((f) => f.followingId));
    const pendingSet = new Set(pending.map((p) => p.toUserId));
    usersWithRelation = users.map((u) => ({
      ...u,
      relation: followingSet.has(u.id)
        ? ("following" as const)
        : pendingSet.has(u.id)
          ? ("requested" as const)
          : ("none" as const),
    }));
  }

  if (userId) await recordSearch(userId, q);
  return { users: usersWithRelation, posts, hashtags };
}

export async function recordSearch(userId: string, query: string) {
  return prisma.searchHistory.create({
    data: { userId, query: query.slice(0, 200) },
  });
}

export async function trendingHashtags(limit = 10) {
  return prisma.hashtag.findMany({
    orderBy: { postCount: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
  });
}
