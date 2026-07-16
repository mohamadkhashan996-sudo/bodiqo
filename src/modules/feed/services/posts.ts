import { MediaKind, PostType, PostVisibility } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  canViewPostContent,
  filterVisiblePostIds,
  getProfileVisibility,
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
      isPrivate: true,
    },
  },
  media: { orderBy: { sortOrder: "asc" as const } },
  hashtags: { include: { hashtag: true } },
};

type MediaInput = {
  url: string;
  kind: MediaKind;
  width?: number;
  height?: number;
  duration?: number;
};

export async function createPost(
  authorId: string,
  data: {
    body?: string;
    type?: PostType;
    visibility?: PostVisibility;
    linkUrl?: string;
    media?: MediaInput[];
  },
) {
  if (!data.body?.trim() && !data.media?.length)
    throw new AppError("A post needs content", 400);
  const tags = [
    ...new Set(
      (data.body?.match(/#([\p{L}\p{N}_]{1,50})/gu) ?? []).map((tag) =>
        tag.slice(1).toLowerCase(),
      ),
    ),
  ];
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        authorId,
        body: data.body?.trim() ?? "",
        type: data.type ?? "TEXT",
        visibility: data.visibility ?? "PUBLIC",
        linkUrl: data.linkUrl,
        publishedAt: new Date(),
        media: {
          create: data.media?.map((m, sortOrder) => ({ ...m, sortOrder })),
        },
        hashtags: {
          create: await Promise.all(
            tags.map(async (tag) => ({
              hashtag: { connectOrCreate: { where: { tag }, create: { tag } } },
            })),
          ),
        },
      },
      include,
    });
    await tx.user.update({
      where: { id: authorId },
      data: {
        postsCount: { increment: 1 },
        ...(post.type === "VIDEO" || post.type === "SHORT"
          ? { videosCount: { increment: 1 } }
          : {}),
      },
    });
    for (const tag of tags)
      await tx.hashtag.update({
        where: { tag },
        data: { postCount: { increment: 1 } },
      });
    return post;
  });
}

export async function updatePost(
  authorId: string,
  id: string,
  data: { body?: string; visibility?: PostVisibility; commentsEnabled?: boolean },
) {
  const post = await prisma.post.findFirst({
    where: { id, authorId, deletedAt: null },
  });
  if (!post) throw new AppError("Post not found", 404);
  return prisma.post.update({ where: { id }, data, include });
}

export async function deletePost(authorId: string, id: string) {
  const post = await prisma.post.findFirst({
    where: { id, authorId, deletedAt: null },
  });
  if (!post) throw new AppError("Post not found", 404);
  return prisma.$transaction([
    prisma.post.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DELETED" },
    }),
    prisma.user.update({
      where: { id: authorId },
      data: { postsCount: { decrement: 1 } },
    }),
  ]);
}

export async function likePost(userId: string, postId: string) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!p) throw new AppError("Post not found", 404);
    const existing = await tx.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) return existing;
    const like = await tx.postLike.create({ data: { postId, userId } });
    await tx.post.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
    return like;
  });
}

export async function unlikePost(userId: string, postId: string) {
  return prisma.$transaction(async (tx) => {
    const like = await tx.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!like) return { deleted: false };
    await tx.postLike.delete({ where: { id: like.id } });
    await tx.post.update({
      where: { id: postId },
      data: { likeCount: { decrement: 1 } },
    });
    return { deleted: true };
  });
}

export async function bookmarkPost(userId: string, postId: string) {
  return prisma.bookmark.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId },
    update: {},
  });
}

async function hiddenAuthorIds(userId: string) {
  const muted = await prisma.mute.findMany({
    where: { muterId: userId },
    select: { mutedId: true },
  });
  const blocked = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [
    ...muted.map((x) => x.mutedId),
    ...blocked.flatMap((x) => [x.blockerId, x.blockedId]),
  ].filter((id) => id !== userId);
}

export async function getFeed({
  userId,
  cursor,
  limit = 20,
}: {
  userId?: string;
  cursor?: string;
  limit?: number;
}) {
  const take = Math.min(Math.max(limit, 1), 50);
  const hidden = userId ? await hiddenAuthorIds(userId) : [];

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      visibility: "PUBLIC",
      authorId: hidden.length ? { notIn: hidden } : undefined,
      author: { status: "ACTIVE", isPrivate: false },
    },
    include,
    orderBy: { publishedAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const visible = await filterVisiblePostIds(userId, posts);
  const page = visible.slice(0, take);

  return {
    posts: await Promise.all(page.map((p) => serializePost(p, userId))),
    nextCursor: visible.length > take ? visible[take].id : null,
  };
}

export async function getExplore(cursor?: string, limit = 20, viewerId?: string) {
  return getFeed({ userId: viewerId, cursor, limit });
}

export async function getSuggestedUsers(limit = 5) {
  return prisma.user.findMany({
    where: { status: "ACTIVE", isPrivate: false },
    select: {
      id: true,
      handle: true,
      name: true,
      displayName: true,
      image: true,
      isVerified: true,
    },
    orderBy: { followersCount: "desc" },
    take: Math.min(limit, 20),
  });
}

export async function getPostsByHandle(
  handle: string,
  limit = 30,
  viewerId?: string,
) {
  const author = await prisma.user.findFirst({
    where: { handle: handle.toLowerCase(), status: "ACTIVE" },
    select: { id: true, isPrivate: true },
  });
  if (!author) throw new AppError("User not found", 404);

  const visibility = await getProfileVisibility(author, viewerId);
  if (!visibility.canViewContent) {
    return {
      posts: [],
      authorId: author.id,
      visibility,
      locked: true,
    };
  }

  const posts = await prisma.post.findMany({
    where: {
      authorId: author.id,
      status: "PUBLISHED",
      deletedAt: null,
      visibility: { in: ["PUBLIC", "FOLLOWERS"] },
    },
    include,
    orderBy: { publishedAt: "desc" },
    take: Math.min(limit, 50),
  });

  const visible = await filterVisiblePostIds(viewerId, posts);

  return {
    posts: await Promise.all(visible.map((p) => serializePost(p, viewerId))),
    authorId: author.id,
    visibility,
    locked: false,
  };
}

export async function getPostById(id: string, viewerId?: string) {
  const post = await prisma.post.findFirst({
    where: { id, deletedAt: null, status: "PUBLISHED" },
    include,
  });
  if (!post) throw new AppError("Post not found", 404);
  const allowed = await canViewPostContent(
    viewerId,
    post.author,
    post.visibility,
  );
  if (!allowed) throw new AppError("Post not found", 404);
  return serializePost(post, viewerId);
}

export async function getShorts(viewerId?: string, limit = 50) {
  const posts = await prisma.post.findMany({
    where: {
      type: "SHORT",
      status: "PUBLISHED",
      deletedAt: null,
      visibility: "PUBLIC",
      author: { status: "ACTIVE" },
    },
    include,
    orderBy: { publishedAt: "desc" },
    take: Math.min(limit, 50),
  });
  const visible = await filterVisiblePostIds(viewerId, posts);
  return Promise.all(visible.map((p) => serializePost(p, viewerId)));
}

export async function serializePost<T extends { id: string; hashtags?: { hashtag: unknown }[] }>(
  post: T,
  viewerId?: string,
) {
  let liked = false;
  let bookmarked = false;
  if (viewerId) {
    const [likeRow, bookmarkRow] = await Promise.all([
      prisma.postLike.findUnique({
        where: { postId_userId: { postId: post.id, userId: viewerId } },
        select: { id: true },
      }),
      prisma.bookmark.findUnique({
        where: { postId_userId: { postId: post.id, userId: viewerId } },
        select: { id: true },
      }),
    ]);
    liked = Boolean(likeRow);
    bookmarked = Boolean(bookmarkRow);
  }

  return {
    ...post,
    hashtags: post.hashtags?.map((entry) => entry.hashtag) ?? [],
    liked,
    bookmarked,
  };
}
