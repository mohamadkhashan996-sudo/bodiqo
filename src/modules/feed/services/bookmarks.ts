import type { CollectionVisibility, PostType, Prisma } from "@prisma/client";
import { PostStatus, PostType as PT } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  assertCanInteractWithPost,
  filterVisiblePostIds,
} from "@/modules/users/services/visibility";

const postInclude = {
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
      status: true,
    },
  },
  media: { orderBy: { sortOrder: "asc" as const } },
  poll: { include: { options: { orderBy: { sortOrder: "asc" as const } } } },
  hashtags: { include: { hashtag: true } },
} as const;

async function serialize(posts: unknown[], viewerId?: string) {
  const { serializePosts } = await import("@/modules/feed/services/posts");
  return serializePosts(posts as never[], viewerId);
}

export type BookmarkFilter = "all" | "videos" | "posts";
export type BookmarkSort = "newest" | "oldest";

export async function bookmarkPost(
  userId: string,
  postId: string,
  opts?: { collectionId?: string; note?: string },
) {
  await assertCanInteractWithPost(userId, postId);
  if (opts?.collectionId) {
    await assertOwnCollection(userId, opts.collectionId);
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.bookmark.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { id: true },
    });
    let bookmarkId: string;
    let isNew = false;
    if (existing) {
      bookmarkId = existing.id;
      if (opts?.note !== undefined) {
        await tx.bookmark.update({
          where: { id: existing.id },
          data: { note: opts.note?.slice(0, 500) || null },
        });
      }
    } else {
      const bookmark = await tx.bookmark.create({
        data: {
          postId,
          userId,
          note: opts?.note?.slice(0, 500) || null,
        },
      });
      bookmarkId = bookmark.id;
      isNew = true;
      await tx.post.update({
        where: { id: postId },
        data: { bookmarkCount: { increment: 1 } },
      });
    }

    if (opts?.collectionId) {
      await addToCollectionTx(tx, opts.collectionId, postId);
    }

    return { id: bookmarkId, postId, userId, isNew };
  });
}

export async function unbookmarkPost(userId: string, postId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.bookmark.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { id: true },
    });
    if (!existing) {
      return { ok: true, deleted: false };
    }
    await tx.bookmark.delete({ where: { id: existing.id } });
    // Drop from all of this user's collections
    const owned = await tx.bookmarkCollection.findMany({
      where: { userId },
      select: { id: true },
    });
    if (owned.length) {
      const ids = owned.map((c) => c.id);
      const removed = await tx.bookmarkCollectionItem.deleteMany({
        where: { postId, collectionId: { in: ids } },
      });
      if (removed.count) {
        for (const collectionId of ids) {
          await tx.bookmarkCollection.update({
            where: { id: collectionId },
            data: {
              itemCount: {
                set: await tx.bookmarkCollectionItem.count({
                  where: { collectionId },
                }),
              },
            },
          });
        }
      }
    }
    await tx.post.update({
      where: { id: postId },
      data: { bookmarkCount: { decrement: 1 } },
    });
    await tx.post.updateMany({
      where: { id: postId, bookmarkCount: { lt: 0 } },
      data: { bookmarkCount: 0 },
    });
    return { ok: true, deleted: true };
  });
}

export async function getBookmarks(
  userId: string,
  opts: {
    cursor?: string;
    limit?: number;
    filter?: BookmarkFilter;
    sort?: BookmarkSort;
    q?: string;
    collectionId?: string;
  } = {},
) {
  const take = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const filter = opts.filter ?? "all";
  const sort = opts.sort ?? "newest";
  const q = opts.q?.trim();

  const typeFilter =
    filter === "videos"
      ? { type: { in: [PT.SHORT, PT.VIDEO] as PostType[] } }
      : filter === "posts"
        ? { type: { notIn: [PT.SHORT, PT.VIDEO] as PostType[] } }
        : {};

  const postWhere: Prisma.PostWhereInput = {
    deletedAt: null,
    status: PostStatus.PUBLISHED,
    ...typeFilter,
    ...(q
      ? {
          OR: [
            { body: { contains: q, mode: "insensitive" } },
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
        }
      : {}),
  };

  if (opts.collectionId) {
    await assertOwnCollection(userId, opts.collectionId);
    const items = await prisma.bookmarkCollectionItem.findMany({
      where: {
        collectionId: opts.collectionId,
        post: postWhere,
      },
      include: { post: { include: postInclude } },
      orderBy:
        sort === "oldest"
          ? [{ sortOrder: "asc" }, { createdAt: "asc" }]
          : [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
    const page = items.slice(0, take);
    const visible = await filterVisiblePostIds(
      userId,
      page.map((row) => row.post),
    );
    const visibleIds = new Set(visible.map((p) => p.id));
    const posts = page
      .map((row) => row.post)
      .filter((p) => visibleIds.has(p.id));
    return {
      posts: await serialize(posts, userId),
      nextCursor: items.length > take ? (items[take]?.id ?? null) : null,
      unavailableCount: page.length - posts.length,
    };
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId, post: postWhere },
    include: { post: { include: postInclude } },
    orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const page = bookmarks.slice(0, take);
  const visible = await filterVisiblePostIds(
    userId,
    page.map((row) => row.post),
  );
  const visibleIds = new Set(visible.map((p) => p.id));
  const posts = page.map((row) => row.post).filter((p) => visibleIds.has(p.id));

  return {
    posts: await serialize(posts, userId),
    nextCursor:
      bookmarks.length > take ? (bookmarks[take]?.id ?? null) : null,
    unavailableCount: page.length - posts.length,
  };
}

async function assertOwnCollection(userId: string, collectionId: string) {
  const collection = await prisma.bookmarkCollection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true },
  });
  if (!collection) throw new AppError("Collection not found", 404);
  return collection;
}

async function addToCollectionTx(
  tx: Prisma.TransactionClient,
  collectionId: string,
  postId: string,
) {
  const existing = await tx.bookmarkCollectionItem.findUnique({
    where: { collectionId_postId: { collectionId, postId } },
    select: { id: true },
  });
  if (existing) return existing;
  const item = await tx.bookmarkCollectionItem.create({
    data: { collectionId, postId },
  });
  await tx.bookmarkCollection.update({
    where: { id: collectionId },
    data: { itemCount: { increment: 1 } },
  });
  return item;
}

export async function listCollections(userId: string) {
  const collections = await prisma.bookmarkCollection.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      visibility: true,
      coverUrl: true,
      sortOrder: true,
      itemCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return { collections };
}

export async function createCollection(
  userId: string,
  input: {
    name: string;
    description?: string;
    visibility?: CollectionVisibility;
  },
) {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new AppError("Name is required", 400);
  const count = await prisma.bookmarkCollection.count({ where: { userId } });
  if (count >= 50) throw new AppError("Collection limit reached (50)", 400);
  const collection = await prisma.bookmarkCollection.create({
    data: {
      userId,
      name,
      description: input.description?.trim().slice(0, 280) || null,
      visibility: input.visibility ?? "PRIVATE",
      sortOrder: count,
    },
  });
  return collection;
}

export async function updateCollection(
  userId: string,
  collectionId: string,
  input: {
    name?: string;
    description?: string | null;
    visibility?: CollectionVisibility;
    sortOrder?: number;
  },
) {
  await assertOwnCollection(userId, collectionId);
  return prisma.bookmarkCollection.update({
    where: { id: collectionId },
    data: {
      ...(input.name !== undefined
        ? { name: input.name.trim().slice(0, 80) }
        : {}),
      ...(input.description !== undefined
        ? {
            description: input.description
              ? input.description.trim().slice(0, 280)
              : null,
          }
        : {}),
      ...(input.visibility ? { visibility: input.visibility } : {}),
      ...(typeof input.sortOrder === "number"
        ? { sortOrder: input.sortOrder }
        : {}),
    },
  });
}

export async function deleteCollection(userId: string, collectionId: string) {
  await assertOwnCollection(userId, collectionId);
  await prisma.bookmarkCollection.delete({ where: { id: collectionId } });
  return { ok: true };
}

export async function addPostToCollection(
  userId: string,
  collectionId: string,
  postId: string,
) {
  await assertOwnCollection(userId, collectionId);
  await assertCanInteractWithPost(userId, postId);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.bookmark.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { id: true },
    });
    if (!existing) {
      await tx.bookmark.create({ data: { postId, userId } });
      await tx.post.update({
        where: { id: postId },
        data: { bookmarkCount: { increment: 1 } },
      });
    }
    const item = await addToCollectionTx(tx, collectionId, postId);
    return item;
  });
}

export async function removePostFromCollection(
  userId: string,
  collectionId: string,
  postId: string,
) {
  await assertOwnCollection(userId, collectionId);
  const deleted = await prisma.bookmarkCollectionItem.deleteMany({
    where: { collectionId, postId },
  });
  if (deleted.count) {
    await prisma.bookmarkCollection.update({
      where: { id: collectionId },
      data: {
        itemCount: {
          set: await prisma.bookmarkCollectionItem.count({
            where: { collectionId },
          }),
        },
      },
    });
  }
  return { ok: true, deleted: deleted.count > 0 };
}

export async function getPublicCollection(collectionId: string, viewerId?: string) {
  const collection = await prisma.bookmarkCollection.findFirst({
    where: { id: collectionId, visibility: "PUBLIC" },
    include: {
      user: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          name: true,
          image: true,
          isPrivate: true,
        },
      },
    },
  });
  if (!collection) throw new AppError("Collection not found", 404);
  if (collection.user.isPrivate && collection.userId !== viewerId) {
    throw new AppError("Collection not found", 404);
  }

  const items = await prisma.bookmarkCollectionItem.findMany({
    where: {
      collectionId,
      post: { deletedAt: null, status: PostStatus.PUBLISHED },
    },
    include: { post: { include: postInclude } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 48,
  });

  const visible = await filterVisiblePostIds(
    viewerId,
    items.map((row) => row.post),
  );
  // Public collections only show posts the viewer can also see
  const posts = await serialize(visible, viewerId);

  return {
    collection: {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      visibility: collection.visibility,
      itemCount: collection.itemCount,
      owner: {
        handle: collection.user.handle,
        displayName: collection.user.displayName,
        name: collection.user.name,
        image: collection.user.image,
      },
    },
    posts,
  };
}

export async function getBookmarkCount(userId: string) {
  return prisma.bookmark.count({
    where: {
      userId,
      post: { deletedAt: null, status: PostStatus.PUBLISHED },
    },
  });
}
