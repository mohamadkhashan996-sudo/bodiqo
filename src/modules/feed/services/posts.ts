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
      isOfficial: true,
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

  let type = data.type ?? "TEXT";
  if (!data.type && data.media?.length) {
    const hasVideo = data.media.some((item) => item.kind === "VIDEO");
    const hasImage = data.media.some(
      (item) => item.kind === "IMAGE" || item.kind === "GIF",
    );
    if (hasVideo) type = "VIDEO";
    else if (hasImage) type = "IMAGE";
  }
  if (
    data.type === "TEXT" &&
    data.media?.length &&
    data.media.every((m) => m.kind === "IMAGE" || m.kind === "GIF")
  ) {
    type = "IMAGE";
  }

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
        type: type ?? "TEXT",
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
    if (existing) return { like: existing, isNew: false };
    const like = await tx.postLike.create({ data: { postId, userId } });
    await tx.post.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
    return { like, isNew: true };
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

  let followingIds: string[] = [];
  if (userId) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    followingIds = following.map((f) => f.followingId);
  }

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      authorId: hidden.length ? { notIn: hidden } : undefined,
      ...(userId
        ? {
            OR: [
              {
                visibility: "PUBLIC",
                author: { status: "ACTIVE", isPrivate: false },
              },
              { authorId: userId },
              followingIds.length
                ? {
                    authorId: { in: followingIds },
                    visibility: { in: ["PUBLIC", "FOLLOWERS"] },
                    author: { status: "ACTIVE" },
                  }
                : undefined,
            ].filter(Boolean) as never,
          }
        : {
            visibility: "PUBLIC",
            author: { status: "ACTIVE", isPrivate: false },
          }),
    },
    include,
    orderBy: { publishedAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const visible = await filterVisiblePostIds(userId, posts);
  const page = visible.slice(0, take);

  return {
    posts: await serializePosts(page, userId),
    nextCursor: visible.length > take ? visible[take].id : null,
  };
}

export async function getExplore(cursor?: string, limit = 20, viewerId?: string) {
  return getFeed({ userId: viewerId, cursor, limit });
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
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: Math.min(limit, 50),
  });

  const visible = await filterVisiblePostIds(viewerId, posts);

  return {
    posts: await serializePosts(visible, viewerId),
    authorId: author.id,
    visibility,
    locked: false,
  };
}

export async function getShorts(viewerId?: string, cursor?: string, limit = 20) {
  const take = Math.min(Math.max(limit, 1), 50);
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      visibility: "PUBLIC",
      author: { status: "ACTIVE" },
      OR: [
        { type: "SHORT" },
        {
          type: "VIDEO",
          media: { some: { kind: "VIDEO" } },
        },
      ],
    },
    include,
    orderBy: { publishedAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const visible = await filterVisiblePostIds(viewerId, posts);
  const page = visible.slice(0, take);
  return {
    posts: await serializePosts(page, viewerId),
    nextCursor: visible.length > take ? visible[take].id : null,
  };
}

export async function getBookmarks(userId: string, cursor?: string, limit = 20) {
  const take = Math.min(Math.max(limit, 1), 50);
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: {
      post: { include },
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const page = bookmarks.slice(0, take);
  const posts = page
    .map((bookmark) => bookmark.post)
    .filter((post) => post && post.status === "PUBLISHED" && !post.deletedAt);

  return {
    posts: await serializePosts(posts, userId),
    nextCursor: bookmarks.length > take ? bookmarks[take].id : null,
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

export async function serializePosts<
  T extends { id: string; hashtags?: { hashtag: unknown }[] },
>(posts: T[], viewerId?: string) {
  if (!posts.length) return [];

  const liked = new Set<string>();
  const bookmarked = new Set<string>();
  if (viewerId) {
    const ids = posts.map((p) => p.id);
    const [likeRows, bookmarkRows] = await Promise.all([
      prisma.postLike.findMany({
        where: { userId: viewerId, postId: { in: ids } },
        select: { postId: true },
      }),
      prisma.bookmark.findMany({
        where: { userId: viewerId, postId: { in: ids } },
        select: { postId: true },
      }),
    ]);
    for (const row of likeRows) liked.add(row.postId);
    for (const row of bookmarkRows) bookmarked.add(row.postId);
  }

  return posts.map((post) => ({
    ...post,
    hashtags: post.hashtags?.map((entry) => entry.hashtag) ?? [],
    liked: liked.has(post.id),
    bookmarked: bookmarked.has(post.id),
  }));
}

export async function serializePost<
  T extends { id: string; hashtags?: { hashtag: unknown }[] },
>(post: T, viewerId?: string) {
  const [serialized] = await serializePosts([post], viewerId);
  return serialized!;
}
