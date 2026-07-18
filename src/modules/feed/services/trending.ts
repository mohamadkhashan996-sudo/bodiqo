import { cached } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { blockedIdsFor } from "@/modules/users/services/visibility";

const HASHTAG_WINDOW_MS = 7 * 24 * 60 * 60_000;
const SEARCH_WINDOW_MS = 24 * 60 * 60_000;
const USER_WINDOW_MS = 14 * 24 * 60 * 60_000;

/** Hashtags ranked by public posts in the last 7 days (not all-time postCount). */
export async function getWindowedTrendingHashtags(limit = 12) {
  const take = Math.min(Math.max(limit, 1), 40);
  return cached(`trending:hashtags:7d:${take}`, 60, async () => {
    const since = new Date(Date.now() - HASHTAG_WINDOW_MS);
    const grouped = await prisma.postHashtag.groupBy({
      by: ["hashtagId"],
      where: {
        post: {
          status: "PUBLISHED",
          deletedAt: null,
          visibility: "PUBLIC",
          publishedAt: { gte: since },
          author: { status: "ACTIVE", isPrivate: false },
        },
      },
      _count: { hashtagId: true },
      orderBy: { _count: { hashtagId: "desc" } },
      take,
    });
    if (!grouped.length) {
      // Cold start: fall back to all-time popular tags.
      return prisma.hashtag.findMany({
        orderBy: { postCount: "desc" },
        take,
        select: { id: true, tag: true, postCount: true },
      });
    }
    const tags = await prisma.hashtag.findMany({
      where: { id: { in: grouped.map((row) => row.hashtagId) } },
      select: { id: true, tag: true, postCount: true },
    });
    const rank = new Map(
      grouped.map((row) => [row.hashtagId, row._count.hashtagId]),
    );
    return tags
      .map((tag) => ({
        ...tag,
        recentCount: rank.get(tag.id) ?? 0,
      }))
      .sort((a, b) => (b.recentCount ?? 0) - (a.recentCount ?? 0));
  });
}

/** Creators with the most public engagement in the last 14 days. */
export async function getTrendingUsers(limit = 8, viewerId?: string) {
  const take = Math.min(Math.max(limit, 1), 24);
  return cached(`trending:users:14d:${viewerId ?? "guest"}:${take}`, 60, async () => {
    const since = new Date(Date.now() - USER_WINDOW_MS);
    const blocked = viewerId ? await blockedIdsFor(viewerId) : [];
    const grouped = await prisma.post.groupBy({
      by: ["authorId"],
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        visibility: "PUBLIC",
        publishedAt: { gte: since },
        author: {
          status: "ACTIVE",
          isPrivate: false,
          ...(blocked.length ? { id: { notIn: blocked } } : {}),
        },
        ...(blocked.length ? { authorId: { notIn: blocked } } : {}),
        ...(viewerId ? { authorId: { not: viewerId } } : {}),
      },
      _sum: { likeCount: true, commentCount: true, shareCount: true },
      _count: { id: true },
      orderBy: { _sum: { likeCount: "desc" } },
      take: take * 2,
    });
    if (!grouped.length) return [];

    const users = await prisma.user.findMany({
      where: {
        id: { in: grouped.map((row) => row.authorId) },
        status: "ACTIVE",
        isPrivate: false,
      },
      select: {
        id: true,
        handle: true,
        name: true,
        displayName: true,
        image: true,
        isVerified: true,
        isOfficial: true,
        followersCount: true,
        bio: true,
      },
    });
    const score = new Map(
      grouped.map((row) => [
        row.authorId,
        (row._sum.likeCount ?? 0) * 1.5 +
          (row._sum.commentCount ?? 0) * 2.2 +
          (row._sum.shareCount ?? 0) * 3 +
          row._count.id,
      ]),
    );
    return users
      .map((user) => ({
        ...user,
        trendScore: score.get(user.id) ?? 0,
      }))
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, take);
  });
}

/**
 * Aggregate popular searches (privacy: only queries with enough distinct users).
 * Never returns single-user personal history as "trending".
 */
export async function getTrendingSearches(limit = 8) {
  const take = Math.min(Math.max(limit, 1), 20);
  return cached(`trending:searches:24h:${take}`, 90, async () => {
    const since = new Date(Date.now() - SEARCH_WINDOW_MS);
    const rows = await prisma.searchHistory.findMany({
      where: {
        createdAt: { gte: since },
        query: { not: "" },
      },
      select: { query: true, userId: true },
      take: 2000,
      orderBy: { createdAt: "desc" },
    });

    const byQuery = new Map<string, Set<string>>();
    for (const row of rows) {
      const key = row.query.trim().toLowerCase().slice(0, 80);
      if (key.length < 2) continue;
      let users = byQuery.get(key);
      if (!users) {
        users = new Set();
        byQuery.set(key, users);
      }
      users.add(row.userId);
    }

    return [...byQuery.entries()]
      .filter(([, users]) => users.size >= 3)
      .map(([query, users]) => ({
        query,
        count: users.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, take);
  });
}
