import { prisma } from "@/lib/prisma";

export async function searchAll(query: string, userId?: string) {
  const q = query.trim();
  if (!q) return { users: [], posts: [], hashtags: [] };
  const [users, posts, hashtags] = await Promise.all([
    prisma.user.findMany({ where: { status: "ACTIVE", OR: [{ handle: { contains: q } }, { name: { contains: q } }, { displayName: { contains: q } }] }, select: { id: true, handle: true, name: true, displayName: true, image: true, isVerified: true }, take: 10 }),
    prisma.post.findMany({ where: { status: "PUBLISHED", deletedAt: null, visibility: "PUBLIC", body: { contains: q } }, include: { author: { select: { id: true, handle: true, name: true, image: true } }, media: true }, take: 20, orderBy: { publishedAt: "desc" } }),
    prisma.hashtag.findMany({ where: { tag: { contains: q.toLowerCase() } }, orderBy: { postCount: "desc" }, take: 10 }),
  ]);
  if (userId) await recordSearch(userId, q);
  return { users, posts, hashtags };
}
export async function recordSearch(userId: string, query: string) {
  return prisma.searchHistory.create({ data: { userId, query: query.slice(0, 200) } });
}
export async function trendingHashtags(limit = 10) {
  return prisma.hashtag.findMany({ orderBy: { postCount: "desc" }, take: Math.min(Math.max(limit, 1), 50) });
}
