import type {
  MediaKind,
  PostVisibility,
  Prisma,
  ReactionType,
} from "@prisma/client";
import { PostStatus, PostType } from "@prisma/client";

import {
  assertContentSafe,
  assertNotDuplicatePost,
} from "@/lib/ai-content-gate";
import { cached, cacheDelPrefix } from "@/lib/cache";
import { AppError } from "@/lib/errors";
import { assertOwnedReadyAsset } from "@/lib/media-asset";
import { extractHashtags, extractMentions } from "@/lib/post-text";
import { prisma } from "@/lib/prisma";
import {
  bumpReactionCount,
  emptyReactionCounts,
  normalizeReactionCounts,
  totalReactions,
  type ReactionCounts,
  type ReactionKey,
} from "@/lib/reactions";
import { uniqueById } from "@/lib/utils";
import { getSetting } from "@/modules/admin/services/settings";
import { rankPosts } from "@/modules/feed/services/rank";
import { notifyMentions } from "@/modules/notifications/services/notify";
import {
  assertCanInteractWithPost,
  canViewPostContent,
  filterVisiblePostIds,
  getProfileVisibility,
} from "@/modules/users/services/visibility";

export type FeedMode = "home" | "following" | "latest" | "trending" | "foryou";

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
  poll: {
    include: {
      options: { orderBy: { sortOrder: "asc" as const } },
    },
  },
};

type MediaInput = {
  url: string;
  kind: MediaKind;
  thumbUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
};

type PollInput = {
  options: string[];
  endsAt?: Date | string | null;
};

export async function createPost(
  authorId: string,
  data: {
    body?: string;
    type?: PostType;
    visibility?: PostVisibility;
    linkUrl?: string;
    locationName?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    media?: MediaInput[];
    poll?: PollInput;
    status?: Extract<PostStatus, "PUBLISHED" | "DRAFT" | "SCHEDULED">;
    scheduledAt?: Date | string | null;
  },
) {
  const pollOptions = (data.poll?.options ?? [])
    .map((label) => label.trim())
    .filter(Boolean);
  if (data.poll && (pollOptions.length < 2 || pollOptions.length > 6)) {
    throw new AppError("Polls need 2–6 options", 400);
  }
  if (!data.body?.trim() && !data.media?.length && !pollOptions.length) {
    throw new AppError("A post needs content", 400);
  }

  if (data.body?.trim()) {
    assertContentSafe(data.body, "Post");
    if ((data.status ?? "PUBLISHED") !== "DRAFT") {
      await assertNotDuplicatePost(authorId, data.body);
    }
  }

  let status: PostStatus = data.status ?? "PUBLISHED";
  let scheduledAt: Date | null = data.scheduledAt
    ? new Date(data.scheduledAt)
    : null;

  if (status === "SCHEDULED") {
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      throw new AppError("Scheduled posts need a future date", 400);
    }
    if (scheduledAt.getTime() <= Date.now() + 60_000) {
      throw new AppError("Schedule at least one minute ahead", 400);
    }
  } else if (status === "DRAFT") {
    scheduledAt = null;
  } else {
    status = "PUBLISHED";
    scheduledAt = null;
  }

  let type = data.type ?? "TEXT";
  if (pollOptions.length) type = "POLL";
  else if (!data.type && data.media?.length) {
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
  if (type === "SHORT") {
    const videoLimits =
      (await getSetting<{
        allowShorts?: boolean;
        maxDurationSec?: number;
      }>("videoLimits")) ?? {};
    if (videoLimits.allowShorts === false) {
      throw new AppError("Shorts uploads are disabled", 403);
    }
    const video = data.media?.find((item) => item.kind === "VIDEO");
    if (!video) {
      throw new AppError("Shorts need a video", 400);
    }
    const maxDuration = videoLimits.maxDurationSec ?? 600;
    if (video.duration && video.duration > maxDuration) {
      throw new AppError(
        `Shorts must be ${maxDuration} seconds or shorter`,
        400,
      );
    }
  }

  if (data.media?.length) {
    for (const item of data.media) {
      if (item.url.startsWith("/api/media/")) {
        throw new AppError(
          "Private message media cannot be attached to posts",
          400,
        );
      }
      await assertOwnedReadyAsset(authorId, item.url, {
        kinds: ["IMAGE", "GIF", "VIDEO"],
      });
      if (item.thumbUrl) {
        if (item.thumbUrl.startsWith("/api/media/")) {
          throw new AppError(
            "Private message media cannot be attached to posts",
            400,
          );
        }
        await assertOwnedReadyAsset(authorId, item.thumbUrl, {
          kinds: ["IMAGE", "GIF"],
        });
      }
    }
  }

  let locationName =
    data.locationName === undefined
      ? undefined
      : data.locationName?.trim().slice(0, 120) || null;
  let locationLat =
    data.locationLat === undefined ? undefined : data.locationLat;
  let locationLng =
    data.locationLng === undefined ? undefined : data.locationLng;
  if (
    (locationLat != null && !Number.isFinite(locationLat)) ||
    (locationLng != null && !Number.isFinite(locationLng)) ||
    (locationLat != null && (locationLat < -90 || locationLat > 90)) ||
    (locationLng != null && (locationLng < -180 || locationLng > 180))
  ) {
    throw new AppError("Invalid location coordinates", 400);
  }
  if (!locationName && (locationLat != null || locationLng != null)) {
    locationName = "Shared location";
  }

  const tags = extractHashtags(data.body);
  const publishedAt = status === "PUBLISHED" ? new Date() : null;

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        authorId,
        body: data.body?.trim() ?? "",
        type,
        status,
        visibility: data.visibility ?? "PUBLIC",
        linkUrl: data.linkUrl,
        locationName: locationName ?? null,
        locationLat: locationLat ?? null,
        locationLng: locationLng ?? null,
        scheduledAt,
        publishedAt,
        media: {
          create: data.media?.map((m, sortOrder) => ({
            url: m.url,
            kind: m.kind,
            thumbUrl: m.thumbUrl,
            width: m.width,
            height: m.height,
            duration: m.duration,
            sortOrder,
          })),
        },
        hashtags: {
          create: await Promise.all(
            tags.map(async (tag) => ({
              hashtag: {
                connectOrCreate: { where: { tag }, create: { tag } },
              },
            })),
          ),
        },
        ...(pollOptions.length
          ? {
              poll: {
                create: {
                  endsAt: data.poll?.endsAt ? new Date(data.poll.endsAt) : null,
                  options: {
                    create: pollOptions.map((label, sortOrder) => ({
                      label,
                      sortOrder,
                    })),
                  },
                },
              },
            }
          : {}),
      },
      include,
    });

    if (status === "PUBLISHED") {
      await tx.user.update({
        where: { id: authorId },
        data: {
          postsCount: { increment: 1 },
          ...(created.type === "VIDEO" || created.type === "SHORT"
            ? { videosCount: { increment: 1 } }
            : {}),
        },
      });
      for (const tag of tags) {
        await tx.hashtag.update({
          where: { tag },
          data: { postCount: { increment: 1 } },
        });
      }
    }

    return created;
  });

  if (status === "PUBLISHED") {
    await notifyMentions({
      actorId: authorId,
      text: data.body ?? "",
      postId: post.id,
    });
    await invalidateFeedCaches().catch(() => undefined);
  }

  return post;
}

export async function updatePost(
  authorId: string,
  id: string,
  data: {
    body?: string;
    visibility?: PostVisibility;
    commentsEnabled?: boolean;
    isPinned?: boolean;
    locationName?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
  },
) {
  const post = await prisma.post.findFirst({
    where: {
      id,
      authorId,
      deletedAt: null,
      status: { in: ["PUBLISHED", "DRAFT", "SCHEDULED", "ARCHIVED"] },
    },
  });
  if (!post) throw new AppError("Post not found", 404);

  if (data.body !== undefined) {
    assertContentSafe(data.body, "Post");
  }

  // Cap pinned posts so profiles stay scannable.
  if (data.isPinned === true) {
    const pinned = await prisma.post.count({
      where: {
        authorId,
        deletedAt: null,
        status: "PUBLISHED",
        isPinned: true,
        NOT: { id },
      },
    });
    if (pinned >= 3) {
      throw new AppError("You can pin up to 3 posts on your profile", 400);
    }
  }

  let locationName = data.locationName;
  if (typeof locationName === "string") {
    locationName = locationName.trim().slice(0, 120) || null;
  }
  if (
    (data.locationLat != null &&
      (!Number.isFinite(data.locationLat) ||
        data.locationLat < -90 ||
        data.locationLat > 90)) ||
    (data.locationLng != null &&
      (!Number.isFinite(data.locationLng) ||
        data.locationLng < -180 ||
        data.locationLng > 180))
  ) {
    throw new AppError("Invalid location coordinates", 400);
  }

  const updated = await prisma.post.update({
    where: { id },
    data: {
      ...(data.body !== undefined ? { body: data.body.trim() } : {}),
      ...(data.visibility !== undefined
        ? { visibility: data.visibility }
        : {}),
      ...(data.commentsEnabled !== undefined
        ? { commentsEnabled: data.commentsEnabled }
        : {}),
      ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
      ...(locationName !== undefined ? { locationName } : {}),
      ...(data.locationLat !== undefined
        ? { locationLat: data.locationLat }
        : {}),
      ...(data.locationLng !== undefined
        ? { locationLng: data.locationLng }
        : {}),
    },
    include,
  });
  await invalidateFeedCaches().catch(() => undefined);
  return updated;
}

export async function archivePost(authorId: string, id: string) {
  const post = await prisma.post.findFirst({
    where: { id, authorId, deletedAt: null, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!post) throw new AppError("Post not found", 404);
  const updated = await prisma.post.update({
    where: { id },
    data: { status: "ARCHIVED", isPinned: false },
    include,
  });
  await invalidateFeedCaches().catch(() => undefined);
  return updated;
}

export async function unarchivePost(authorId: string, id: string) {
  const post = await prisma.post.findFirst({
    where: { id, authorId, deletedAt: null, status: "ARCHIVED" },
    select: { id: true },
  });
  if (!post) throw new AppError("Post not found", 404);
  const updated = await prisma.post.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
    include,
  });
  await invalidateFeedCaches().catch(() => undefined);
  return updated;
}

export async function deletePost(authorId: string, id: string) {
  const post = await prisma.post.findFirst({
    where: { id, authorId, deletedAt: null },
    include: { hashtags: { include: { hashtag: { select: { tag: true } } } } },
  });
  if (!post) throw new AppError("Post not found", 404);
  const isVideo = post.type === "VIDEO" || post.type === "SHORT";
  const wasPublished = post.status === "PUBLISHED";
  const deleted = await prisma.$transaction(async (tx) => {
    const row = await tx.post.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DELETED", isPinned: false },
    });
    if (wasPublished) {
      await tx.user.update({
        where: { id: authorId },
        data: {
          postsCount: { decrement: 1 },
          ...(isVideo ? { videosCount: { decrement: 1 } } : {}),
        },
      });
      await tx.user.updateMany({
        where: { id: authorId, postsCount: { lt: 0 } },
        data: { postsCount: 0 },
      });
      if (isVideo) {
        await tx.user.updateMany({
          where: { id: authorId, videosCount: { lt: 0 } },
          data: { videosCount: 0 },
        });
      }
      for (const rowTag of post.hashtags) {
        await tx.hashtag.update({
          where: { tag: rowTag.hashtag.tag },
          data: { postCount: { decrement: 1 } },
        });
        await tx.hashtag.updateMany({
          where: { tag: rowTag.hashtag.tag, postCount: { lt: 0 } },
          data: { postCount: 0 },
        });
      }
    }
    return row;
  });
  await invalidateFeedCaches().catch(() => undefined);
  return deleted;
}

export async function reactToPost(
  userId: string,
  postId: string,
  type: ReactionType = "LIKE",
) {
  await assertCanInteractWithPost(userId, postId);
  return prisma.$transaction(async (tx) => {
    const p = await tx.post.findFirst({
      where: { id: postId, deletedAt: null, status: "PUBLISHED" },
      select: { id: true, likeCount: true, reactionCounts: true },
    });
    if (!p) throw new AppError("Post not found", 404);

    let counts = normalizeReactionCounts(p.reactionCounts);
    const existing = await tx.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing?.type === type) {
      return {
        isNew: false,
        changed: false,
        liked: true,
        reaction: type as ReactionKey,
        previousReaction: type as ReactionKey,
        likeCount: p.likeCount,
        reactionCounts: counts,
      };
    }

    if (existing) {
      counts = bumpReactionCount(counts, existing.type as ReactionKey, -1);
      counts = bumpReactionCount(counts, type as ReactionKey, 1);
      await tx.postLike.update({
        where: { id: existing.id },
        data: { type },
      });
      const updated = await tx.post.update({
        where: { id: postId },
        data: { reactionCounts: counts },
        select: { likeCount: true },
      });
      return {
        isNew: false,
        changed: true,
        liked: true,
        reaction: type as ReactionKey,
        previousReaction: existing.type as ReactionKey,
        likeCount: updated.likeCount,
        reactionCounts: counts,
      };
    }

    counts = bumpReactionCount(counts, type as ReactionKey, 1);
    await tx.postLike.create({ data: { postId, userId, type } });
    const updated = await tx.post.update({
      where: { id: postId },
      data: {
        likeCount: { increment: 1 },
        reactionCounts: counts,
      },
      select: { likeCount: true },
    });
    return {
      isNew: true,
      changed: true,
      liked: true,
      reaction: type as ReactionKey,
      previousReaction: null,
      likeCount: updated.likeCount,
      reactionCounts: counts,
    };
  });
}

export async function removePostReaction(userId: string, postId: string) {
  await assertCanInteractWithPost(userId, postId);
  return prisma.$transaction(async (tx) => {
    const like = await tx.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!like) {
      const p = await tx.post.findFirst({
        where: { id: postId, deletedAt: null },
        select: { likeCount: true, reactionCounts: true },
      });
      return {
        deleted: false,
        liked: false,
        reaction: null,
        previousReaction: null,
        likeCount: p?.likeCount ?? 0,
        reactionCounts: normalizeReactionCounts(p?.reactionCounts),
      };
    }

    const p = await tx.post.findUnique({
      where: { id: postId },
      select: { reactionCounts: true },
    });
    let counts = normalizeReactionCounts(p?.reactionCounts);
    counts = bumpReactionCount(counts, like.type as ReactionKey, -1);

    await tx.postLike.delete({ where: { id: like.id } });
    const updated = await tx.post.update({
      where: { id: postId },
      data: {
        likeCount: { decrement: 1 },
        reactionCounts: counts,
      },
      select: { likeCount: true },
    });
    await tx.post.updateMany({
      where: { id: postId, likeCount: { lt: 0 } },
      data: { likeCount: 0 },
    });
    return {
      deleted: true,
      liked: false,
      reaction: null,
      previousReaction: like.type as ReactionKey,
      likeCount: Math.max(0, updated.likeCount),
      reactionCounts: counts,
    };
  });
}

/** @deprecated Prefer reactToPost — kept for LIKE-compatible callers. */
export async function likePost(userId: string, postId: string) {
  const result = await reactToPost(userId, postId, "LIKE");
  return {
    isNew: result.isNew,
    liked: result.liked,
    likeCount: result.likeCount,
    reaction: result.reaction,
    reactionCounts: result.reactionCounts,
  };
}

export async function unlikePost(userId: string, postId: string) {
  const result = await removePostReaction(userId, postId);
  return {
    deleted: result.deleted,
    liked: result.liked,
    likeCount: result.likeCount,
    reaction: result.reaction,
    reactionCounts: result.reactionCounts,
  };
}

export {
  bookmarkPost,
  unbookmarkPost,
  getBookmarks,
} from "@/modules/feed/services/bookmarks";

export { sharePost } from "@/modules/feed/services/share";

export async function recordPostView(
  postId: string,
  viewerId?: string,
  opts?: { dwellMs?: number; completed?: boolean },
) {
  await assertCanInteractWithPost(viewerId, postId, {
    requireAuth: false,
  });

  const dwellMs = Math.min(Math.max(opts?.dwellMs ?? 0, 0), 600_000);
  const completed = Boolean(opts?.completed);

  if (viewerId) {
    const existing = await prisma.postView.findUnique({
      where: { postId_viewerId: { postId, viewerId } },
      select: { id: true },
    });
    if (existing) {
      await prisma.postView.update({
        where: { id: existing.id },
        data: {
          ...(dwellMs > 0 ? { dwellMs } : {}),
          ...(completed ? { completed: true } : {}),
        },
      });
      return prisma.post.findUniqueOrThrow({
        where: { id: postId },
        select: { id: true, viewCount: true },
      });
    }

    const [, post] = await prisma.$transaction([
      prisma.postView.create({
        data: { postId, viewerId, dwellMs, completed },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
        select: { id: true, viewCount: true },
      }),
    ]);
    return post;
  }

  return prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
    select: { id: true, viewCount: true },
  });
}

async function hiddenAuthorIds(userId: string) {
  const [muted, blocked] = await Promise.all([
    prisma.mute.findMany({
      where: { muterId: userId },
      select: { mutedId: true },
    }),
    prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);
  return [
    ...muted.map((x) => x.mutedId),
    ...blocked.flatMap((x) => [x.blockerId, x.blockedId]),
  ].filter((id) => id !== userId);
}

export async function getFeed({
  userId,
  cursor,
  limit = 20,
  mode = "home",
  personalize = true,
  media = "all",
}: {
  userId?: string;
  cursor?: string;
  limit?: number;
  mode?: FeedMode;
  /** When false, trending/foryou skip follow/interest boosts (global ranking). */
  personalize?: boolean;
  /** Restrict to video/short content for trending videos. */
  media?: "all" | "video";
}) {
  const take = Math.min(Math.max(limit, 1), 50);
  const hidden = userId ? await hiddenAuthorIds(userId) : [];

  let followingIds: string[] = [];
  let affinity: Awaited<
    ReturnType<typeof import("@/modules/feed/services/affinity").buildViewerAffinity>
  > | null = null;

  const wantsAffinity =
    personalize &&
    userId &&
    (mode === "home" || mode === "foryou");

  if (wantsAffinity && userId) {
    const { buildViewerAffinity } = await import(
      "@/modules/feed/services/affinity"
    );
    affinity = await buildViewerAffinity(userId);
    followingIds = [...(affinity.followingIds ?? [])];
  } else if (userId && (mode === "following" || mode === "home" || mode === "trending")) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });
    followingIds = following.map((f) => f.followingId);
  }

  const followingSet = new Set(followingIds);
  const windowStart = new Date(Date.now() - 14 * 24 * 60 * 60_000);

  // Ranked modes over-fetch a candidate window, then score + page in memory.
  const ranked = mode === "trending" || mode === "foryou";
  const candidateTake = ranked
    ? Math.min(take * 5, affinity?.coldStart ? 120 : 100)
    : take + 1;

  let where: Prisma.PostWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
    ...(hidden.length ? { authorId: { notIn: hidden } } : {}),
  };

  if (mode === "following") {
    if (!userId) {
      return { posts: [], nextCursor: null, mode };
    }
    const blocked = new Set(hidden);
    const authors = [...followingIds, userId].filter((id) => !blocked.has(id));
    where = {
      ...where,
      authorId: { in: authors.length ? authors : [userId] },
      visibility: { in: ["PUBLIC", "FOLLOWERS"] },
      author: { status: "ACTIVE" },
    };
  } else if (mode === "latest") {
    where = {
      ...where,
      visibility: "PUBLIC",
      author: { status: "ACTIVE", isPrivate: false },
    };
  } else if (mode === "trending") {
    where = {
      ...where,
      visibility: "PUBLIC",
      publishedAt: { gte: windowStart },
      author: { status: "ACTIVE", isPrivate: false },
    };
  } else if (mode === "foryou") {
    const exclude = new Set([...(userId ? [userId] : []), ...hidden]);
    const seen =
      affinity && !affinity.coldStart
        ? affinity.seenPostIds.slice(0, 40)
        : [];
    where = {
      status: "PUBLISHED",
      deletedAt: null,
      visibility: "PUBLIC",
      publishedAt: { gte: windowStart },
      author: { status: "ACTIVE", isPrivate: false },
      ...(exclude.size ? { authorId: { notIn: [...exclude] } } : {}),
      ...(seen.length ? { id: { notIn: seen } } : {}),
    };
  } else if (userId) {
    // home: hybrid of public + self + following
    const or: Prisma.PostWhereInput[] = [
      {
        visibility: "PUBLIC",
        author: { status: "ACTIVE", isPrivate: false },
      },
      { authorId: userId },
    ];
    if (followingIds.length) {
      or.push({
        authorId: { in: followingIds },
        visibility: { in: ["PUBLIC", "FOLLOWERS"] },
        author: { status: "ACTIVE" },
      });
    }
    where = { ...where, OR: or };
  } else {
    where = {
      ...where,
      visibility: "PUBLIC",
      author: { status: "ACTIVE", isPrivate: false },
    };
  }

  if (media === "video") {
    where = {
      ...where,
      OR: [
        { type: { in: ["VIDEO", "SHORT"] } },
        { media: { some: { kind: "VIDEO" } } },
      ],
    };
  }

  const posts = await prisma.post.findMany({
    where,
    include,
    orderBy:
      mode === "trending" || mode === "foryou"
        ? [
            { likeCount: "desc" },
            { commentCount: "desc" },
            { shareCount: "desc" },
            { publishedAt: "desc" },
          ]
        : { publishedAt: "desc" },
    take: candidateTake,
    ...(!ranked && cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let visible = await filterVisiblePostIds(userId, posts);

  if (ranked) {
    const ordered = rankPosts(visible as Parameters<typeof rankPosts>[0], {
      followingIds: personalize ? followingSet : undefined,
      friendIds: personalize ? affinity?.friendIds : undefined,
      interestTerms: personalize ? affinity?.interestTerms : undefined,
      authorAffinity: personalize ? affinity?.authorAffinity : undefined,
      diversify: personalize ? affinity?.diversify !== false : true,
      maxPerAuthor: affinity?.maxPerAuthor,
    });
    const byId = new Map(visible.map((post) => [post.id, post]));
    visible = ordered
      .map((post) => byId.get(post.id))
      .filter((post): post is (typeof visible)[number] => Boolean(post));
    if (cursor) {
      const idx = visible.findIndex((p) => p.id === cursor);
      // Cursor missing (rank shifted / stale) → end the feed instead of
      // re-emitting the first page (duplicate React keys like official-intro).
      visible = idx >= 0 ? visible.slice(idx + 1) : [];
    }
  }

  const page = uniqueById(visible.slice(0, take));
  return {
    posts: await serializePosts(page, userId),
    nextCursor: visible.length > take ? (visible[take]?.id ?? null) : null,
    mode,
  };
}

export async function getExplore(
  cursor?: string,
  limit = 20,
  viewerId?: string,
  opts?: { fresh?: boolean },
) {
  const cacheKey = `feed:explore:${viewerId ?? "guest"}:${cursor ?? "start"}:${limit}`;
  if (opts?.fresh) {
    const { cacheDel } = await import("@/lib/cache");
    await cacheDel(cacheKey);
  }
  return cached(cacheKey, 30, () =>
    getFeed({ userId: viewerId, cursor, limit, mode: "trending" }),
  );
}

export async function getTrendingFeed(
  cursor?: string,
  limit = 20,
  viewerId?: string,
  opts?: { media?: "all" | "video" },
) {
  const media = opts?.media ?? "all";
  const cacheKey = `feed:trending:${media}:${viewerId ?? "guest"}:${cursor ?? "start"}:${limit}`;
  return cached(cacheKey, 45, async () => {
    const [
      feed,
      hashtags,
      users,
      searches,
    ] = await Promise.all([
      getFeed({
        userId: viewerId,
        cursor,
        limit,
        mode: "trending",
        personalize: false,
        media,
      }),
      cursor
        ? Promise.resolve([])
        : import("@/modules/feed/services/trending").then((m) =>
            m.getWindowedTrendingHashtags(Math.min(Math.max(limit, 1), 20)),
          ),
      cursor
        ? Promise.resolve([])
        : import("@/modules/feed/services/trending").then((m) =>
            m.getTrendingUsers(8, viewerId),
          ),
      cursor
        ? Promise.resolve([])
        : import("@/modules/feed/services/trending").then((m) =>
            m.getTrendingSearches(8),
          ),
    ]);
    return {
      ...feed,
      hashtags,
      users,
      searches,
      media,
      ranking: "global-engagement-recency",
    };
  });
}

export async function invalidateFeedCaches() {
  await Promise.all([
    cacheDelPrefix("feed:"),
    cacheDelPrefix("reco:"),
    cacheDelPrefix("trending:"),
  ]);
}

export async function getPostsByHandle(
  handle: string,
  limit = 30,
  viewerId?: string,
  options?: { types?: PostType[] },
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
      ...(viewerId === author.id
        ? {}
        : { visibility: { in: ["PUBLIC", "FOLLOWERS"] } }),
      ...(options?.types?.length ? { type: { in: options.types } } : {}),
    },
    include,
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: Math.min(Math.max(limit, 1), 50),
  });

  const visible = uniqueById(await filterVisiblePostIds(viewerId, posts));

  return {
    posts: await serializePosts(visible, viewerId),
    authorId: author.id,
    visibility,
    locked: false,
  };
}

export async function getShorts(
  viewerId?: string,
  cursor?: string,
  limit = 20,
  mode: "latest" | "forYou" | "following" = "forYou",
) {
  // Latest + Following stay fresh so new follows/publishes show immediately.
  if (mode === "latest" || mode === "following") {
    return loadShorts(viewerId, cursor, limit, mode);
  }
  const cacheKey = `feed:shorts:${viewerId ?? "guest"}:${mode}:${cursor ?? "start"}:${limit}`;
  return cached(cacheKey, 30, () => loadShorts(viewerId, cursor, limit, mode));
}

async function loadShorts(
  viewerId?: string,
  cursor?: string,
  limit = 20,
  mode: "latest" | "forYou" | "following" = "forYou",
) {
  const take = Math.min(Math.max(limit, 1), 50);
  const ranked = mode === "forYou";
  const followingOnly = mode === "following";

  if (followingOnly && !viewerId) {
    return { posts: [], nextCursor: null, mode, requiresAuth: true as const };
  }

  const candidateTake = ranked ? Math.min(take * 5, 100) : take + 1;
  const hidden = viewerId ? await hiddenAuthorIds(viewerId) : [];
  const windowStart = new Date(Date.now() - 21 * 24 * 60 * 60_000);

  let followingIds: string[] = [];
  let affinity: Awaited<
    ReturnType<typeof import("@/modules/feed/services/affinity").buildViewerAffinity>
  > | null = null;
  if (viewerId && (ranked || followingOnly)) {
    if (ranked) {
      const { buildViewerAffinity } = await import(
        "@/modules/feed/services/affinity"
      );
      affinity = await buildViewerAffinity(viewerId);
      followingIds = [...(affinity.followingIds ?? [])];
    } else {
      const following = await prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
        orderBy: { createdAt: "desc" },
        take: 2000,
      });
      followingIds = following.map((f) => f.followingId);
    }
  }

  if (followingOnly && followingIds.length === 0) {
    return { posts: [], nextCursor: null, mode, emptyFollowing: true as const };
  }

  const followingSet = new Set(followingIds);
  const seen =
    ranked && affinity && !affinity.coldStart
      ? affinity.seenPostIds.slice(0, 40)
      : [];

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      visibility: followingOnly ? { in: ["PUBLIC", "FOLLOWERS"] } : "PUBLIC",
      author: { status: "ACTIVE" },
      ...(followingOnly ? { authorId: { in: followingIds } } : {}),
      ...(hidden.length && !followingOnly
        ? { authorId: { notIn: hidden } }
        : {}),
      ...(ranked ? { publishedAt: { gte: windowStart } } : {}),
      ...(seen.length ? { id: { notIn: seen } } : {}),
      OR: [
        { type: "SHORT" },
        {
          type: "VIDEO",
          media: { some: { kind: "VIDEO" } },
        },
      ],
    },
    include,
    orderBy: ranked
      ? [
          { likeCount: "desc" },
          { commentCount: "desc" },
          { publishedAt: "desc" },
        ]
      : { publishedAt: "desc" },
    take: candidateTake,
    ...(!ranked && cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let visible = await filterVisiblePostIds(viewerId, posts);

  if (ranked) {
    const ordered = rankPosts(visible as Parameters<typeof rankPosts>[0], {
      followingIds: followingSet,
      friendIds: affinity?.friendIds,
      interestTerms: affinity?.interestTerms,
      authorAffinity: affinity?.authorAffinity,
      diversify: true,
      maxPerAuthor: affinity?.maxPerAuthor,
    });
    const byId = new Map(visible.map((post) => [post.id, post]));
    visible = ordered
      .map((post) => byId.get(post.id))
      .filter((post): post is (typeof visible)[number] => Boolean(post));
    if (cursor) {
      const idx = visible.findIndex((p) => p.id === cursor);
      visible = idx >= 0 ? visible.slice(idx + 1) : [];
    }
  }

  const page = uniqueById(visible.slice(0, take));
  return {
    posts: await serializePosts(page, viewerId),
    nextCursor: visible.length > take ? (visible[take]?.id ?? null) : null,
    mode,
  };
}

export async function getPostById(id: string, viewerId?: string) {
  const post = await prisma.post.findFirst({
    where: { id, deletedAt: null, status: { not: "DELETED" } },
    include,
  });
  if (!post) throw new AppError("Post not found", 404);

  const isOwner = viewerId === post.authorId;
  if (post.status !== "PUBLISHED" && !isOwner) {
    throw new AppError("Post not found", 404);
  }
  if (post.status === "PUBLISHED") {
    const allowed = await canViewPostContent(
      viewerId,
      post.author,
      post.visibility,
    );
    if (!allowed) throw new AppError("Post not found", 404);
  }
  return serializePost(post, viewerId);
}

export async function serializePosts<
  T extends {
    id: string;
    hashtags?: { hashtag: unknown }[];
    poll?: {
      id: string;
      endsAt: Date | null;
      options: Array<{
        id: string;
        label: string;
        voteCount: number;
        sortOrder: number;
      }>;
    } | null;
  },
>(posts: T[], viewerId?: string) {
  if (!posts.length) return [];

  const liked = new Set<string>();
  const myReaction = new Map<string, ReactionKey>();
  const bookmarked = new Set<string>();
  const votedOption = new Map<string, string>();
  if (viewerId) {
    const ids = posts.map((p) => p.id);
    const pollIds = posts
      .map((p) => p.poll?.id)
      .filter((id): id is string => Boolean(id));
    const [likeRows, bookmarkRows, voteRows] = await Promise.all([
      prisma.postLike.findMany({
        where: { userId: viewerId, postId: { in: ids } },
        select: { postId: true, type: true },
      }),
      prisma.bookmark.findMany({
        where: { userId: viewerId, postId: { in: ids } },
        select: { postId: true },
      }),
      pollIds.length
        ? prisma.pollVote.findMany({
            where: {
              userId: viewerId,
              pollId: { in: pollIds },
            },
            select: { optionId: true, pollId: true },
          })
        : Promise.resolve([]),
    ]);
    for (const row of likeRows) {
      liked.add(row.postId);
      myReaction.set(row.postId, row.type as ReactionKey);
    }
    for (const row of bookmarkRows) bookmarked.add(row.postId);
    for (const row of voteRows) {
      votedOption.set(row.pollId, row.optionId);
    }
  }

  return posts.map((post) => {
    const poll = post.poll
      ? {
          id: post.poll.id,
          endsAt: post.poll.endsAt,
          totalVotes: post.poll.options.reduce(
            (sum, option) => sum + option.voteCount,
            0,
          ),
          votedOptionId: post.poll.id
            ? (votedOption.get(post.poll.id) ?? null)
            : null,
          options: post.poll.options.map((option) => ({
            id: option.id,
            label: option.label,
            voteCount: option.voteCount,
            sortOrder: option.sortOrder,
          })),
        }
      : null;

    const reactionCounts: ReactionCounts =
      "reactionCounts" in post
        ? normalizeReactionCounts(
            (post as { reactionCounts?: unknown }).reactionCounts,
          )
        : emptyReactionCounts();
    const likeCount =
      "likeCount" in post
        ? Number((post as { likeCount?: number }).likeCount ?? 0)
        : 0;
    if (totalReactions(reactionCounts) === 0 && likeCount > 0) {
      reactionCounts.LIKE = likeCount;
    }

    const {
      bookmarkCount: _bookmarkCount,
      viewCount: _viewCount,
      ...rest
    } = post as T & {
      bookmarkCount?: number;
      viewCount?: number;
      hashtags?: { hashtag: unknown }[];
    };

    return {
      ...rest,
      hashtags: rest.hashtags?.map((entry) => entry.hashtag) ?? [],
      poll,
      liked: liked.has(post.id),
      reaction: myReaction.get(post.id) ?? null,
      reactionCounts,
      bookmarked: bookmarked.has(post.id),
    };
  });
}

export async function serializePost<
  T extends {
    id: string;
    hashtags?: { hashtag: unknown }[];
    poll?: {
      id: string;
      endsAt: Date | null;
      options: Array<{
        id: string;
        label: string;
        voteCount: number;
        sortOrder: number;
      }>;
    } | null;
  },
>(post: T, viewerId?: string) {
  const [serialized] = await serializePosts([post], viewerId);
  return serialized!;
}

export async function votePoll(
  userId: string,
  postId: string,
  optionId: string,
) {
  await assertCanInteractWithPost(userId, postId);
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null, status: "PUBLISHED" },
    include: {
      poll: { include: { options: true } },
    },
  });
  if (!post?.poll) throw new AppError("Poll not found", 404);
  if (post.poll.endsAt && post.poll.endsAt.getTime() < Date.now()) {
    throw new AppError("This poll has ended", 400);
  }
  const option = post.poll.options.find((row) => row.id === optionId);
  if (!option) throw new AppError("Invalid poll option", 400);
  const pollId = post.poll.id;

  await prisma.$transaction(async (tx) => {
    const previous = await tx.pollVote.findMany({
      where: { userId, pollId },
      select: { id: true, optionId: true },
    });
    if (previous.length) {
      const optionIds = previous.map((v) => v.optionId);
      await tx.pollVote.deleteMany({
        where: { id: { in: previous.map((v) => v.id) } },
      });
      await tx.pollOption.updateMany({
        where: { id: { in: optionIds } },
        data: { voteCount: { decrement: 1 } },
      });
      await tx.pollOption.updateMany({
        where: { id: { in: optionIds }, voteCount: { lt: 0 } },
        data: { voteCount: 0 },
      });
    }
    await tx.pollVote.create({
      data: { userId, optionId, pollId },
    });
    await tx.pollOption.update({
      where: { id: optionId },
      data: { voteCount: { increment: 1 } },
    });
  });

  return getPostById(postId, userId);
}

export async function getAuthorWorkspacePosts(
  authorId: string,
  status: Extract<PostStatus, "DRAFT" | "SCHEDULED" | "ARCHIVED">,
  limit = 30,
) {
  const posts = await prisma.post.findMany({
    where: { authorId, status, deletedAt: null },
    include,
    orderBy:
      status === "SCHEDULED" ? { scheduledAt: "asc" } : { updatedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
  });
  return { posts: await serializePosts(posts, authorId) };
}

export async function publishScheduledPosts(now = new Date()) {
  const due = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      deletedAt: null,
      scheduledAt: { lte: now },
    },
    select: {
      id: true,
      authorId: true,
      type: true,
      body: true,
      hashtags: { include: { hashtag: { select: { tag: true } } } },
    },
    take: 50,
  });
  if (!due.length) return { published: 0 };

  let published = 0;
  for (const post of due) {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.post.updateMany({
        where: { id: post.id, status: "SCHEDULED" },
        data: { status: "PUBLISHED", publishedAt: now },
      });
      if (!updated.count) return;
      await tx.user.update({
        where: { id: post.authorId },
        data: {
          postsCount: { increment: 1 },
          ...(post.type === "VIDEO" || post.type === "SHORT"
            ? { videosCount: { increment: 1 } }
            : {}),
        },
      });
      for (const row of post.hashtags) {
        await tx.hashtag.update({
          where: { tag: row.hashtag.tag },
          data: { postCount: { increment: 1 } },
        });
      }
      published += 1;
    });
    const mentions = extractMentions(post.body);
    if (mentions.length) {
      await notifyMentions({
        actorId: post.authorId,
        text: post.body,
        postId: post.id,
      });
    }
  }
  if (published > 0) {
    await invalidateFeedCaches().catch(() => undefined);
  }
  return { published };
}
