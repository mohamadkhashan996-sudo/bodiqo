import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { filterVisiblePostIds } from "@/modules/users/services/visibility";
import { serializePost } from "@/modules/feed/services/posts";

const include = {
  author: {
    select: {
      id: true,
      handle: true,
      name: true,
      displayName: true,
      image: true,
      isVerified: true,
      isOfficial: true,
      isPrivate: true,
    },
  },
  media: { orderBy: { sortOrder: "asc" as const } },
  hashtags: { include: { hashtag: true } },
};

export async function getHashtagFeed(
  tag: string,
  viewerId?: string,
  cursor?: string,
  limit = 20,
) {
  const normalized = tag.toLowerCase().replace(/^#/, "");
  const hashtag = await prisma.hashtag.findUnique({ where: { tag: normalized } });
  if (!hashtag) throw new AppError("Hashtag not found", 404);

  const take = Math.min(Math.max(limit, 1), 50);
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      visibility: "PUBLIC",
      hashtags: { some: { hashtagId: hashtag.id } },
      author: { status: "ACTIVE" },
    },
    include,
    orderBy: { publishedAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const visible = await filterVisiblePostIds(viewerId, posts);
  const page = visible.slice(0, take);
  const nextCursor = visible.length > take ? visible[take].id : null;

  return {
    hashtag,
    posts: await Promise.all(page.map((post) => serializePost(post, viewerId))),
    nextCursor,
  };
}
