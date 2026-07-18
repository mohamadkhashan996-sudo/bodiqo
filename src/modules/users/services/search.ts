import { prisma } from "@/lib/prisma";
import { smartSearchExpand } from "@/modules/ai/services/intelligence";
import {
  blockedIdsFor,
  filterVisiblePostIds,
} from "@/modules/users/services/visibility";

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
  isPrivate: true,
  status: true,
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

function scoreTextMatch(
  haystack: string | null | undefined,
  q: string,
  weight = 1,
) {
  if (!haystack) return 0;
  const h = haystack.toLowerCase();
  const needle = q.toLowerCase();
  if (h === needle) return 100 * weight;
  if (h.startsWith(needle)) return 70 * weight;
  if (h.includes(needle)) return 40 * weight;
  return 0;
}

function scoreAgainstTerms(
  haystack: string | null | undefined,
  terms: string[],
  weight = 1,
) {
  let best = 0;
  for (const term of terms) {
    best = Math.max(best, scoreTextMatch(haystack, term, weight));
  }
  return best;
}

async function blockedIds(userId?: string) {
  if (!userId) return [] as string[];
  return blockedIdsFor(userId);
}

async function searchUsers(
  q: string,
  excludedIds: string[],
  limit: number,
  expansions: string[] = [],
) {
  const terms = [...new Set([q, ...expansions])].filter(Boolean).slice(0, 8);
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      ...(excludedIds.length ? { id: { notIn: excludedIds } } : {}),
      OR: terms.flatMap((term) => [
        { handle: { contains: term, mode: "insensitive" as const } },
        { name: { contains: term, mode: "insensitive" as const } },
        { displayName: { contains: term, mode: "insensitive" as const } },
        { bio: { contains: term, mode: "insensitive" as const } },
      ]),
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
    take: Math.min(limit * 4, 80),
  });

  return users
    .map((user) => {
      let score =
        scoreAgainstTerms(user.handle, terms, 3) +
        scoreAgainstTerms(user.displayName, terms, 2) +
        scoreAgainstTerms(user.name, terms, 1.5) +
        scoreAgainstTerms(user.bio, terms, 0.5);
      // Prefer exact primary query matches over synonym-only hits.
      score += scoreTextMatch(user.handle, q, 1.5);
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
  viewerId?: string,
  videoOnly = false,
  expansions: string[] = [],
) {
  const terms = [...new Set([q, ...expansions])].filter(Boolean).slice(0, 8);
  const tag = q.toLowerCase().replace(/^#/, "");
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      visibility: "PUBLIC",
      author: {
        status: "ACTIVE",
        ...(excludedIds.length ? { id: { notIn: excludedIds } } : {}),
      },
      ...(excludedIds.length ? { authorId: { notIn: excludedIds } } : {}),
      ...(videoOnly
        ? {
            OR: [
              { type: { in: ["VIDEO", "SHORT"] } },
              { media: { some: { kind: "VIDEO" } } },
            ],
          }
        : {}),
      OR: [
        ...terms.map((term) => ({
          body: { contains: term, mode: "insensitive" as const },
        })),
        {
          hashtags: {
            some: {
              hashtag: {
                tag: { contains: tag, mode: "insensitive" as const },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ likeCount: "desc" }, { publishedAt: "desc" }],
    take: Math.min(limit * 6, 120),
    include: {
      author: { select: AUTHOR_SELECT },
      media: { orderBy: { sortOrder: "asc" as const }, take: 4 },
      hashtags: { include: { hashtag: true }, take: 8 },
    },
  });

  const visibleIds = new Set(
    (await filterVisiblePostIds(viewerId, posts)).map((p) => p.id),
  );
  const visible = posts.filter((p) => visibleIds.has(p.id));

  return visible
    .map((post) => {
      const ageHours = Math.max(
        0,
        (Date.now() - new Date(post.publishedAt ?? post.createdAt).getTime()) /
          3_600_000,
      );
      const tagBlob = post.hashtags.map((h) => h.hashtag.tag).join(" ");
      let score =
        scoreAgainstTerms(post.body, terms, 2) +
        scoreAgainstTerms(tagBlob, terms, 2.5) +
        scoreTextMatch(post.body, q, 1) +
        scoreTextMatch(post.author.handle, q, 1.5) +
        scoreTextMatch(post.author.displayName, q, 1);
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

async function searchCommunities(
  q: string,
  limit: number,
  expansions: string[] = [],
) {
  const terms = [...new Set([q, ...expansions])].filter(Boolean).slice(0, 8);
  const communities = await prisma.community.findMany({
    where: {
      visibility: "PUBLIC",
      OR: terms.flatMap((term) => [
        { name: { contains: term, mode: "insensitive" as const } },
        { slug: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { category: { contains: term, mode: "insensitive" as const } },
        { tags: { contains: term, mode: "insensitive" as const } },
      ]),
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
        scoreAgainstTerms(c.name, terms, 3) +
        scoreAgainstTerms(c.slug, terms, 2.5) +
        scoreAgainstTerms(c.description, terms, 1) +
        scoreAgainstTerms(c.category, terms, 1.5) +
        scoreAgainstTerms(c.tags, terms, 1.2) +
        scoreTextMatch(c.name, q, 1);
      score += Math.min(25, Math.log10((c.membersCount ?? 0) + 1) * 10);
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function searchHashtags(
  q: string,
  limit: number,
  expansions: string[] = [],
) {
  const terms = [
    ...new Set([
      q.replace(/^#/, ""),
      ...expansions.map((e) => e.replace(/^#/, "")),
    ]),
  ]
    .filter(Boolean)
    .slice(0, 8);
  const hashtags = await prisma.hashtag.findMany({
    where: {
      OR: terms.map((term) => ({
        tag: { contains: term, mode: "insensitive" as const },
      })),
    },
    orderBy: { postCount: "desc" },
    take: Math.min(limit * 2, 40),
  });
  return hashtags
    .map((h) => ({
      ...h,
      score:
        scoreAgainstTerms(h.tag, terms, 3) +
        Math.min(30, Math.log10((h.postCount ?? 0) + 1) * 12),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function enrichUserRelations<T extends { id: string }>(
  users: T[],
  userId?: string,
) {
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
  options?: { type?: SearchType; limit?: number; record?: boolean },
) {
  const q = normalizeQuery(query);
  const type = options?.type ?? "all";
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 40);
  const shouldRecord = options?.record !== false;

  if (!q) {
    const recent = userId ? await listSearchHistory(userId) : [];
    return {
      query: "",
      type,
      users: [],
      posts: [],
      videos: [],
      communities: [],
      hashtags: [],
      recent,
    };
  }

  const excluded = await blockedIds(userId);
  const want = (t: SearchType) => type === "all" || type === t;
  const { expansions } = smartSearchExpand(q);
  const expandTerms = expansions.filter(
    (term) => term.toLowerCase() !== q.toLowerCase(),
  );

  const [usersRaw, posts, videos, communities, hashtags] = await Promise.all([
    want("users")
      ? searchUsers(q, excluded, limit, expandTerms)
      : Promise.resolve([]),
    want("posts")
      ? searchPosts(q, excluded, limit, userId, false, expandTerms)
      : Promise.resolve([]),
    want("videos")
      ? searchPosts(q, excluded, limit, userId, true, expandTerms)
      : Promise.resolve([]),
    want("communities")
      ? searchCommunities(q, limit, expandTerms)
      : Promise.resolve([]),
    want("hashtags")
      ? searchHashtags(q, limit, expandTerms)
      : Promise.resolve([]),
  ]);

  const users = await enrichUserRelations(usersRaw, userId);
  if (userId && shouldRecord) await recordSearch(userId, q);

  return {
    query: q,
    type,
    users,
    posts,
    videos,
    communities,
    hashtags,
    tokens: tokens(q),
    expansions,
    smart: true,
  };
}

/** Lightweight prefix suggestions for autocomplete (does not write history). */
export async function suggestSearch(query: string, userId?: string, limit = 6) {
  const q = normalizeQuery(query);
  if (q.length < 1) {
    const [recent, trending] = await Promise.all([
      userId ? listSearchHistory(userId, 8) : Promise.resolve([]),
      trendingHashtags(8),
    ]);
    return { query: "", users: [], hashtags: trending, recent };
  }

  const excluded = await blockedIds(userId);
  const take = Math.min(Math.max(limit, 1), 12);
  const [usersRaw, hashtags, recent] = await Promise.all([
    searchUsers(q, excluded, take),
    searchHashtags(q, take),
    userId ? listSearchHistory(userId, 6) : Promise.resolve([]),
  ]);
  const users = await enrichUserRelations(usersRaw, userId);
  const recentMatches = recent.filter((row) =>
    row.query.toLowerCase().includes(q.toLowerCase()),
  );
  return {
    query: q,
    users,
    hashtags,
    recent: recentMatches,
  };
}

export async function recordSearch(userId: string, query: string) {
  const q = query.trim().slice(0, 200);
  if (!q) return null;
  // Case-insensitive dedupe: bump existing row instead of inserting duplicates.
  const recent = await prisma.searchHistory.findFirst({
    where: { userId, query: { equals: q, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    if (Date.now() - recent.createdAt.getTime() < 120_000) {
      return recent;
    }
    return prisma.searchHistory.update({
      where: { id: recent.id },
      data: { query: q, createdAt: new Date() },
    });
  }
  // Cap history size per user (keep newest 40).
  const count = await prisma.searchHistory.count({ where: { userId } });
  if (count >= 40) {
    const oldest = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: count - 39,
      select: { id: true },
    });
    if (oldest.length) {
      await prisma.searchHistory.deleteMany({
        where: { id: { in: oldest.map((r) => r.id) } },
      });
    }
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
  const take = Math.min(Math.max(limit, 1), 50);
  const { getWindowedTrendingHashtags } = await import(
    "@/modules/feed/services/trending"
  );
  return getWindowedTrendingHashtags(take);
}
