import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { uniqueById } from "@/lib/utils";
import { serializePosts } from "@/modules/feed/services/posts";
import {
  blockedIdsFor,
  filterVisiblePostIds,
} from "@/modules/users/services/visibility";

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
  media: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      url: true,
      thumbUrl: true,
      kind: true,
      width: true,
      height: true,
      duration: true,
      sortOrder: true,
    },
  },
  hashtags: { include: { hashtag: true } },
};

export async function getHashtagFeed(
  tag: string,
  viewerId?: string,
  cursor?: string,
  limit = 20,
) {
  const normalized = tag.toLowerCase().replace(/^#/, "");
  const hashtag = await prisma.hashtag.findUnique({
    where: { tag: normalized },
  });
  if (!hashtag) throw new AppError("Hashtag not found", 404);

  const take = Math.min(Math.max(limit, 1), 50);
  const blocked = viewerId ? await blockedIdsFor(viewerId) : [];
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      visibility: "PUBLIC",
      hashtags: { some: { hashtagId: hashtag.id } },
      author: {
        status: "ACTIVE",
        ...(blocked.length ? { id: { notIn: blocked } } : {}),
      },
      ...(blocked.length ? { authorId: { notIn: blocked } } : {}),
    },
    include,
    orderBy: { publishedAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const visible = uniqueById(await filterVisiblePostIds(viewerId, posts));
  const page = visible.slice(0, take);
  const nextCursor = visible.length > take ? (visible[take]?.id ?? null) : null;

  return {
    hashtag,
    posts: await serializePosts(page, viewerId),
    nextCursor,
  };
}
