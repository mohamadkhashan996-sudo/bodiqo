import { prisma } from "@/lib/prisma";

export type SearchType =
  | "all"
  | "users"
  | "posts"
  | "videos"
  | "communities"
  | "hashtags";

const AUTHOR_SELECT = {
  id: true,
  handle: true,
  name: true,
  displayName: true,
  image: true,
  isVerified: true,
  isOfficial: true,
} as const;

function normalizeQuery(raw: string) {
  return raw.trim().replace(/^#/, "").slice(0, 120);
}

function tokens(q: string) {
  return q
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.replace(/^@/, "").replace(/^#/, ""))
    .filter((t) => t.length >= 2)
    .slice(0, 6);
}

function scoreTextMatch(haystack: string | null | undefined, q: string, weight = 1) {
  if (!haystack) return 0;
  const h = haystack.toLowerCase();
  const needle = q.toLowerCase();
  if (h === needle) return 100 * weight;
  if (h.startsWith(needle)) return 70 * weight;
  if (h.includes(needle)) return 40 * weight;
  return 0;
}

async function blockedIds(userId?: string) {
  if (!userId) return [] as string[];
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [
    ...new Set(
      blocks.flatMap((row) =>
        row.blockerId === userId ? [row.blockedId] : [row.blockerId],
      ),
    ),
  ];
}

async function searchUsers(q: string, excludedIds: string[], limit: number) {
  const users = await prisma.user.findMany({
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
    take: Math.min(limit * 3, 60),
  });

  return users
    .map((user) => {
      let score =
        scoreTextMatch(user.handle, q, 3) +
        scoreTextMatch(user.displayName, q, 2) +
        scoreTextMatch(user.name, q, 1.5) +
        scoreTextMatch(user.bio, q, 0.5);
      if (user.isOfficial) score += 25;
      if (user.isVerified) score += 12;
      score += Math.min(20, Math.log10((user.followersCount ?? 0) + 1) * 8);
      return { ...user, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function searchPosts(
  q: string,
  excludedIds: string[],
  limit: number,
  videoOnly = false,
) {
  const tag = q.toLowerCase().replace(/^#/, "");
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      visibility: "PUBLIC",
      ...(excludedIds.length ? { authorId: { notIn: excludedIds } } : {}),
      ...(videoOnly
        ? {
            OR: [
              { type: { in: ["VIDEO", "SHORT"] } },
              { media: { some: { kind: "VIDEO" } } },
            ],
          }
        : {}),
      AND: [
        {
          OR: [
            { body: { contains: q, mode: "insensitive" } },
            {
              hashtags: {
                some: { hashtag: { tag: { contains: tag } } },
              },
            },
            {
              author: {
                OR: [
                  { handle: { contains: q, mode: "insensitive" } },
                  { displayName: { contains: q, mode: "insensitive" } },
                  { name: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          ],
        },
      ],
    },
    include: {
      author: { select: AUTHOR_SELECT },
      media: { orderBy: { sortOrder: "asc" } },
      hashtags: { include: { hashtag: true } },
    },
    take: Math.min(limit * 3, 60),
    orderBy: [{ likeCount: "desc" }, { publishedAt: "desc" }],
  });

  return posts
    .map((post) => {
      const ageHours = Math.max(
        0,
        (Date.now() - new Date(post.publishedAt ?? post.createdAt).getTime()) /
          3_600_000,
      );
      let score =
        scoreTextMatch(post.body, q, 2) +
        scoreTextMatch(post.author.handle, q, 1.5) +
        scoreTextMatch(post.author.displayName, q, 1);
      for (const row of post.hashtags) {
        score += scoreTextMatch(row.hashtag.tag, tag, 2.5);
      }
      score +=
        (post.likeCount ?? 0) * 0.4 +
        (post.commentCount ?? 0) * 0.6 +
        (post.shareCount ?? 0) * 0.8;
      score *= Math.exp(-ageHours / 72) * 0.65 + 0.35;
      if (post.type === "SHORT" || post.type === "VIDEO") score += 5;
      return {
        ...post,
        hashtags: post.hashtags.map((h) => h.hashtag),
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function searchCommunities(q: string, limit: number) {
  const communities = await prisma.community.findMany({
    where: {
      visibility: "PUBLIC",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { tags: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      image: true,
      category: true,
      tags: true,
      membersCount: true,
      postsCount: true,
    },
    take: Math.min(limit * 3, 45),
  });

  return communities
    .map((c) => {
      let score =
        scoreTextMatch(c.name, q, 3) +
        scoreTextMatch(c.slug, q, 2.5) +
        scoreTextMatch(c.description, q, 1) +
        scoreTextMatch(c.category, q, 1.5) +
        scoreTextMatch(c.tags, q, 1.2);
      score += Math.min(25, Math.log10((c.membersCount ?? 0) + 1) * 10);
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function searchHashtags(q: string, limit: number) {
  const tag = q.toLowerCase().replace(/^#/, "");
  const hashtags = await prisma.hashtag.findMany({
    where: { tag: { contains: tag } },
    orderBy: { postCount: "desc" },
    take: Math.min(limit * 2, 40),
  });
  return hashtags
    .map((h) => ({
      ...h,
      score:
        scoreTextMatch(h.tag, tag, 3) +
        Math.min(30, Math.log10((h.postCount ?? 0) + 1) * 12),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function enrichUserRelations<
  T extends { id: string },
>(users: T[], userId?: string) {
  if (!userId || !users.length) {
    return users.map((u) => ({ ...u, relation: "none" as const }));
  }
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
  return users.map((u) => ({
    ...u,
    relation: followingSet.has(u.id)
      ? ("following" as const)
      : pendingSet.has(u.id)
        ? ("requested" as const)
        : ("none" as const),
  }));
}

export async function searchAll(
  query: string,
  userId?: string,
  options?: { type?: SearchType; limit?: number },
) {
  const q = normalizeQuery(query);
  const type = options?.type ?? "all";
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 40);

  if (!q) {
    return {
      query: "",
      type,
      users: [],
      posts: [],
      videos: [],
      communities: [],
      hashtags: [],
      recent: userId ? await listSearchHistory(userId) : [],
    };
  }

  const excluded = await blockedIds(userId);
  const want = (t: SearchType) => type === "all" || type === t;

  const [usersRaw, posts, videos, communities, hashtags] = await Promise.all([
    want("users") ? searchUsers(q, excluded, limit) : Promise.resolve([]),
    want("posts") ? searchPosts(q, excluded, limit, false) : Promise.resolve([]),
    want("videos") ? searchPosts(q, excluded, limit, true) : Promise.resolve([]),
    want("communities") ? searchCommunities(q, limit) : Promise.resolve([]),
    want("hashtags") ? searchHashtags(q, limit) : Promise.resolve([]),
  ]);

  const users = await enrichUserRelations(usersRaw, userId);
  if (userId) await recordSearch(userId, q);

  return {
    query: q,
    type,
    users,
    posts,
    videos,
    communities,
    hashtags,
    tokens: tokens(q),
  };
}

export async function recordSearch(userId: string, query: string) {
  const q = query.trim().slice(0, 200);
  if (!q) return null;
  // Dedupe recent identical queries for this user.
  const recent = await prisma.searchHistory.findFirst({
    where: { userId, query: q },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
    return recent;
  }
  return prisma.searchHistory.create({ data: { userId, query: q } });
}

export async function listSearchHistory(userId: string, limit = 12) {
  const rows = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 30),
    select: { id: true, query: true, createdAt: true },
  });
  // Unique by query, keep newest.
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.query.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function clearSearchHistory(userId: string) {
  return prisma.searchHistory.deleteMany({ where: { userId } });
}

export async function trendingHashtags(limit = 10) {
  return prisma.hashtag.findMany({
    orderBy: { postCount: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
  });
}
