import type { MediaKind, Prisma, ReactionType } from "@prisma/client";

import { assertContentSafe } from "@/lib/ai-content-gate";
import { AppError } from "@/lib/errors";
import { assertOwnedReadyAsset } from "@/lib/media-asset";
import { prisma } from "@/lib/prisma";
import type { ReactionKey } from "@/lib/reactions";
import { canComment } from "@/modules/users/services/privacy-gate";
import {
  assertCanInteractWithPost,
  canViewPostContent,
} from "@/modules/users/services/visibility";

/** Max nest depth: 0 = top-level, 1 = reply, 2 = nested reply. */
export const COMMENT_MAX_DEPTH = 2;

const authorSelect = {
  id: true,
  handle: true,
  name: true,
  displayName: true,
  image: true,
  isVerified: true,
  isOfficial: true,
} as const;

const include = {
  author: { select: authorSelect },
};

export type CommentSort = "newest" | "top";

export type CommentDTO = {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  mediaUrl?: string | null;
  mediaKind?: MediaKind | null;
  likeCount: number;
  liked: boolean;
  reaction: ReactionKey | null;
  isPinned: boolean;
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    handle: string | null;
    name: string | null;
    displayName: string | null;
    image: string | null;
    isVerified: boolean;
    isOfficial: boolean;
  };
  replies?: CommentDTO[];
  replyCount?: number;
};

async function likedCommentMap(viewerId: string | undefined, ids: string[]) {
  const liked = new Set<string>();
  const reactions = new Map<string, ReactionKey>();
  if (!viewerId || !ids.length) return { liked, reactions };
  const rows = await prisma.commentLike.findMany({
    where: { userId: viewerId, commentId: { in: ids } },
    select: { commentId: true, type: true },
  });
  for (const row of rows) {
    liked.add(row.commentId);
    reactions.set(row.commentId, row.type as ReactionKey);
  }
  return { liked, reactions };
}

async function hiddenAuthorIds(viewerId?: string) {
  if (!viewerId) return [] as string[];
  const [muted, blocked] = await Promise.all([
    prisma.mute.findMany({
      where: { muterId: viewerId },
      select: { mutedId: true },
    }),
    prisma.block.findMany({
      where: {
        OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
      },
      select: { blockerId: true, blockedId: true },
    }),
  ]);
  return [
    ...muted.map((x) => x.mutedId),
    ...blocked.flatMap((x) => [x.blockerId, x.blockedId]),
  ].filter((id) => id !== viewerId);
}

function isEdited(createdAt: Date, updatedAt: Date) {
  return updatedAt.getTime() - createdAt.getTime() > 1500;
}

function mapComment(
  comment: {
    id: string;
    postId: string;
    parentId: string | null;
    body: string;
    mediaUrl?: string | null;
    mediaKind?: MediaKind | null;
    likeCount: number;
    isPinned?: boolean;
    createdAt: Date;
    updatedAt?: Date;
    author: CommentDTO["author"];
  },
  liked: Set<string>,
  reactions: Map<string, ReactionKey>,
  extras?: { replies?: CommentDTO[]; replyCount?: number },
): CommentDTO {
  const updatedAt = comment.updatedAt ?? comment.createdAt;
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    body: comment.body,
    mediaUrl: comment.mediaUrl ?? null,
    mediaKind: comment.mediaKind ?? null,
    likeCount: comment.likeCount,
    liked: liked.has(comment.id),
    reaction: reactions.get(comment.id) ?? null,
    isPinned: Boolean(comment.isPinned),
    edited: isEdited(comment.createdAt, updatedAt),
    createdAt: comment.createdAt,
    updatedAt,
    author: comment.author,
    replies: extras?.replies,
    replyCount: extras?.replyCount,
  };
}

async function depthOfComment(
  tx: Prisma.TransactionClient | typeof prisma,
  commentId: string,
) {
  let depth = 0;
  let current: string | null = commentId;
  while (current && depth <= COMMENT_MAX_DEPTH + 1) {
    const row: { parentId: string | null } | null =
      await tx.comment.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
    if (!row?.parentId) break;
    depth += 1;
    current = row.parentId;
  }
  return depth;
}

export async function addComment(
  authorId: string,
  postId: string,
  body: string,
  parentId?: string,
  media?: { url: string; kind?: MediaKind },
) {
  const text = body.trim();
  if (!text && !media?.url) {
    throw new AppError("Comment cannot be empty", 400);
  }
  if (text) assertContentSafe(text, "Comment");

  const accessible = await assertCanInteractWithPost(authorId, postId);
  if (!accessible.commentsEnabled) {
    throw new AppError("Comments are unavailable", 404);
  }

  let mediaUrl: string | null = null;
  let mediaKind: MediaKind | null = null;
  if (media?.url) {
    if (media.url.startsWith("/api/media/")) {
      throw new AppError("Private media cannot be attached to comments", 400);
    }
    const asset = await assertOwnedReadyAsset(authorId, media.url, {
      kinds: ["IMAGE", "GIF"],
    });
    mediaUrl = media.url;
    mediaKind = media.kind ?? asset.kind;
  }

  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findFirst({
      where: {
        id: postId,
        deletedAt: null,
        status: "PUBLISHED",
        commentsEnabled: true,
      },
    });
    if (!post) throw new AppError("Comments are unavailable", 404);
    if (!(await canComment(authorId, post.authorId))) {
      throw new AppError("You cannot comment on this post", 403);
    }

    if (parentId) {
      const parent = await tx.comment.findFirst({
        where: { id: parentId, postId, deletedAt: null },
        select: { id: true, parentId: true },
      });
      if (!parent) throw new AppError("Parent comment not found", 404);
      const parentDepth = await depthOfComment(tx, parent.id);
      if (parentDepth >= COMMENT_MAX_DEPTH) {
        throw new AppError("Maximum reply depth reached", 400);
      }
    }

    const comment = await tx.comment.create({
      data: {
        authorId,
        postId,
        body: text,
        parentId: parentId || null,
        mediaUrl,
        mediaKind,
      },
      include,
    });
    const postUpdated = await tx.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
      select: { commentCount: true },
    });
    return { comment, commentCount: postUpdated.commentCount };
  });
}

export async function editComment(authorId: string, id: string, body: string) {
  if (!body.trim()) throw new AppError("Comment cannot be empty", 400);
  assertContentSafe(body, "Comment");
  const comment = await prisma.comment.findFirst({
    where: { id, authorId, deletedAt: null },
  });
  if (!comment) throw new AppError("Comment not found", 404);
  await assertCanInteractWithPost(authorId, comment.postId).catch(() => {
    // Author may still edit their comment even if post visibility tightened.
  });
  return prisma.comment.update({
    where: { id },
    data: { body: body.trim() },
    include,
  });
}

export async function deleteComment(authorId: string, id: string) {
  const comment = await prisma.comment.findFirst({
    where: { id, authorId, deletedAt: null },
  });
  if (!comment) throw new AppError("Comment not found", 404);

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    // Soft-delete this comment and all live descendants so threads don't orphan.
    const children = await tx.comment.findMany({
      where: { parentId: id, deletedAt: null },
      select: { id: true },
    });
    const grandchildIds: string[] = [];
    if (children.length) {
      const grands = await tx.comment.findMany({
        where: {
          parentId: { in: children.map((c) => c.id) },
          deletedAt: null,
        },
        select: { id: true },
      });
      grandchildIds.push(...grands.map((g) => g.id));
    }
    const ids = [id, ...children.map((c) => c.id), ...grandchildIds];
    await tx.comment.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: now, isPinned: false },
    });
    const post = await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: ids.length } },
      select: { commentCount: true },
    });
    await tx.post.updateMany({
      where: { id: comment.postId, commentCount: { lt: 0 } },
      data: { commentCount: 0 },
    });
    return {
      id,
      postId: comment.postId,
      parentId: comment.parentId,
      deletedIds: ids,
      commentCount: Math.max(0, post.commentCount),
    };
  });
  return result;
}

export async function pinComment(
  actorId: string,
  commentId: string,
  pinned: boolean,
) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null, parentId: null },
    select: {
      id: true,
      postId: true,
      isPinned: true,
      post: { select: { authorId: true } },
    },
  });
  if (!comment) throw new AppError("Comment not found", 404);
  if (comment.post.authorId !== actorId) {
    throw new AppError("Only the post author can pin comments", 403);
  }
  await assertCanInteractWithPost(actorId, comment.postId);

  if (pinned) {
    await prisma.comment.updateMany({
      where: { postId: comment.postId, isPinned: true, deletedAt: null },
      data: { isPinned: false },
    });
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { isPinned: pinned },
    include,
  });
  return updated;
}

export async function reactToComment(
  userId: string,
  commentId: string,
  type: ReactionType = "LIKE",
) {
  const existing = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { id: true, postId: true, likeCount: true },
  });
  if (!existing) throw new AppError("Comment not found", 404);
  await assertCanInteractWithPost(userId, existing.postId);

  return prisma.$transaction(async (tx) => {
    const old = await tx.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (old?.type === type) {
      return {
        liked: true,
        isNew: false,
        changed: false,
        reaction: type as ReactionKey,
        previousReaction: type as ReactionKey,
        likeCount: existing.likeCount,
        postId: existing.postId,
        commentId,
      };
    }
    if (old) {
      await tx.commentLike.update({
        where: { id: old.id },
        data: { type },
      });
      return {
        liked: true,
        isNew: false,
        changed: true,
        reaction: type as ReactionKey,
        previousReaction: old.type as ReactionKey,
        likeCount: existing.likeCount,
        postId: existing.postId,
        commentId,
      };
    }
    await tx.commentLike.create({ data: { commentId, userId, type } });
    const updated = await tx.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    });
    return {
      liked: true,
      isNew: true,
      changed: true,
      reaction: type as ReactionKey,
      previousReaction: null,
      likeCount: updated.likeCount,
      postId: existing.postId,
      commentId,
    };
  });
}

/** @deprecated Prefer reactToComment. */
export async function likeComment(userId: string, commentId: string) {
  return reactToComment(userId, commentId, "LIKE");
}

export async function unlikeComment(userId: string, commentId: string) {
  return prisma.$transaction(async (tx) => {
    const c = await tx.comment.findFirst({
      where: { id: commentId },
      select: { id: true, postId: true, likeCount: true, deletedAt: true },
    });
    if (!c) throw new AppError("Comment not found", 404);
    const like = await tx.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (!like) {
      return {
        liked: false,
        deleted: false,
        reaction: null,
        previousReaction: null,
        likeCount: c.likeCount,
        postId: c.postId,
        commentId,
      };
    }
    await tx.commentLike.delete({ where: { id: like.id } });
    const updated = await tx.comment.update({
      where: { id: commentId },
      data: { likeCount: { decrement: 1 } },
      select: { likeCount: true },
    });
    return {
      liked: false,
      deleted: true,
      reaction: null,
      previousReaction: like.type as ReactionKey,
      likeCount: Math.max(0, updated.likeCount),
      postId: c.postId,
      commentId,
    };
  });
}

export async function listComments(
  postId: string,
  viewerId?: string,
  cursor?: string,
  limit = 30,
  sort: CommentSort = "newest",
) {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null, status: "PUBLISHED" },
    select: {
      id: true,
      visibility: true,
      author: {
        select: {
          id: true,
          isPrivate: true,
          status: true,
        },
      },
    },
  });
  if (!post) throw new AppError("Post not found", 404);
  const allowed = await canViewPostContent(
    viewerId,
    post.author,
    post.visibility,
  );
  if (!allowed) throw new AppError("Forbidden", 403);

  const take = Math.min(Math.max(limit, 1), 50);
  const hidden = await hiddenAuthorIds(viewerId);
  const where: Prisma.CommentWhereInput = {
    postId,
    deletedAt: null,
    parentId: null,
    ...(hidden.length
      ? { authorId: { notIn: hidden }, author: { status: "ACTIVE" } }
      : { author: { status: "ACTIVE" } }),
  };

  const comments = await prisma.comment.findMany({
    where,
    include: {
      ...include,
      replies: {
        where: {
          deletedAt: null,
          ...(hidden.length
            ? { authorId: { notIn: hidden }, author: { status: "ACTIVE" } }
            : { author: { status: "ACTIVE" } }),
        },
        include,
        take: 3,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      _count: { select: { replies: { where: { deletedAt: null } } } },
    },
    orderBy:
      sort === "top"
        ? [
            { isPinned: "desc" },
            { likeCount: "desc" },
            { createdAt: "desc" },
            { id: "desc" },
          ]
        : [{ isPinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = comments.slice(0, take);
  const ids = [
    ...page.map((c) => c.id),
    ...page.flatMap((c) => c.replies.map((r) => r.id)),
  ];
  const { liked, reactions } = await likedCommentMap(viewerId, ids);
  return {
    comments: page.map((c) =>
      mapComment(c, liked, reactions, {
        replies: c.replies.map((r) => mapComment(r, liked, reactions)),
        replyCount: c._count.replies,
      }),
    ),
    nextCursor: comments.length > take ? comments[take]!.id : null,
    sort,
  };
}

export async function listCommentReplies(
  parentId: string,
  viewerId?: string,
  cursor?: string,
  limit = 20,
) {
  const take = Math.min(Math.max(limit, 1), 50);
  const parent = await prisma.comment.findFirst({
    where: { id: parentId, deletedAt: null },
    select: {
      id: true,
      postId: true,
      post: {
        select: {
          visibility: true,
          deletedAt: true,
          status: true,
          author: { select: { id: true, isPrivate: true } },
        },
      },
    },
  });
  if (!parent || parent.post.deletedAt || parent.post.status !== "PUBLISHED") {
    throw new AppError("Comment not found", 404);
  }
  const allowed = await canViewPostContent(
    viewerId,
    parent.post.author,
    parent.post.visibility,
  );
  if (!allowed) throw new AppError("Forbidden", 403);

  const hidden = await hiddenAuthorIds(viewerId);
  const replies = await prisma.comment.findMany({
    where: {
      parentId,
      deletedAt: null,
      ...(hidden.length
        ? { authorId: { notIn: hidden }, author: { status: "ACTIVE" } }
        : { author: { status: "ACTIVE" } }),
    },
    include,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = replies.slice(0, take);
  const { liked, reactions } = await likedCommentMap(
    viewerId,
    page.map((r) => r.id),
  );
  return {
    replies: page.map((r) => mapComment(r, liked, reactions)),
    nextCursor: replies.length > take ? replies[take]!.id : null,
    postId: parent.postId,
  };
}

export async function serializeComment(
  comment: {
    id: string;
    postId: string;
    parentId: string | null;
    body: string;
    mediaUrl?: string | null;
    mediaKind?: MediaKind | null;
    likeCount: number;
    isPinned?: boolean;
    createdAt: Date;
    updatedAt?: Date;
    author: CommentDTO["author"];
  },
  viewerId?: string,
): Promise<CommentDTO> {
  const { liked, reactions } = await likedCommentMap(viewerId, [comment.id]);
  return mapComment(comment, liked, reactions, {
    replies: [],
    replyCount: 0,
  });
}

/** Staff/moderation helper: soft-delete subtree and reconcile counts. */
export async function moderateDeleteCommentSubtree(commentId: string) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId },
  });
  if (!comment) throw new AppError("Comment not found", 404);
  if (comment.deletedAt) {
    return {
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      deletedIds: [] as string[],
      commentCount: (
        await prisma.post.findUnique({
          where: { id: comment.postId },
          select: { commentCount: true },
        })
      )?.commentCount ?? 0,
    };
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const children = await tx.comment.findMany({
      where: { parentId: commentId, deletedAt: null },
      select: { id: true },
    });
    const grands = children.length
      ? await tx.comment.findMany({
          where: {
            parentId: { in: children.map((c) => c.id) },
            deletedAt: null,
          },
          select: { id: true },
        })
      : [];
    const ids = [
      commentId,
      ...children.map((c) => c.id),
      ...grands.map((g) => g.id),
    ];
    await tx.comment.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: now, isPinned: false },
    });
    const post = await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: ids.length } },
      select: { commentCount: true },
    });
    await tx.post.updateMany({
      where: { id: comment.postId, commentCount: { lt: 0 } },
      data: { commentCount: 0 },
    });
    return {
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      deletedIds: ids,
      commentCount: Math.max(0, post.commentCount),
    };
  });
}

export async function moderateRestoreComment(commentId: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Comment not found", 404);
  if (!comment.deletedAt) return comment;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.comment.update({
      where: { id: commentId },
      data: { deletedAt: null },
    });
    await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { increment: 1 } },
    });
    return row;
  });
  return updated;
}
