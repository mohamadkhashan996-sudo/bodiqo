import { MediaKind, PostStatus, PostType, PostVisibility } from "@prisma/client";
import { AppError } from "@/lib/errors";
import {
  assertContentSafe,
  assertNotDuplicatePost,
} from "@/lib/ai-content-gate";
import { prisma } from "@/lib/prisma";
import { cached, cacheDelPrefix } from "@/lib/cache";
import { extractHashtags, extractMentions } from "@/lib/post-text";
import { notifyMentions } from "@/modules/notifications/services/notify";
import { rankPosts } from "@/modules/feed/services/rank";
import {
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
    const hasVideo = Boolean(
      data.media?.some((item) => item.kind === "VIDEO"),
    );
    if (!hasVideo) {
      throw new AppError("Shorts need a video", 400);
    }
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
        scheduledAt,
        publishedAt,
        media: {
          create: data.media?.map((m, sortOrder) => ({ ...m, sortOrder })),
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
                  endsAt: data.poll?.endsAt
                    ? new Date(data.poll.endsAt)
                    : null,
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

export async function sharePost(postId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!post) throw new AppError("Post not found", 404);
  return prisma.post.update({
    where: { id: postId },
    data: { shareCount: { increment: 1 } },
    select: { id: true, shareCount: true },
  });
}

export async function recordPostView(postId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!post) throw new AppError("Post not found", 404);
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
}: {
  userId?: string;
  cursor?: string;
  limit?: number;
  mode?: FeedMode;
}) {
  const take = Math.min(Math.max(limit, 1), 50);
  const hidden = userId ? await hiddenAuthorIds(userId) : [];

  let followingIds: string[] = [];
  let interestTerms: string[] = [];
  if (userId) {
    const [following, interests] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      mode === "home" || mode === "foryou" || mode === "trending"
        ? prisma.userInterest.findMany({
            where: { userId },
            include: { interest: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);
    followingIds = following.map((f) => f.followingId);
    interestTerms = interests.map((row) => row.interest.name.toLowerCase());
  }

  const followingSet = new Set(followingIds);
  const windowStart = new Date(Date.now() - 14 * 24 * 60 * 60_000);

  // Ranked modes over-fetch a candidate window, then score + page in memory.
  const ranked = mode === "trending" || mode === "foryou";
  const candidateTake = ranked ? Math.min(take * 4, 80) : take + 1;

  let where: Record<string, unknown> = {
    status: "PUBLISHED",
    deletedAt: null,
    authorId: hidden.length ? { notIn: hidden } : undefined,
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
    where = {
      status: "PUBLISHED",
      deletedAt: null,
      visibility: "PUBLIC",
      publishedAt: { gte: windowStart },
      author: { status: "ACTIVE", isPrivate: false },
      ...(exclude.size ? { authorId: { notIn: [...exclude] } } : {}),
    };
  } else {
    // home: hybrid of public + self + following
    where = {
      ...where,
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
            ].filter(Boolean),
          }
        : {
            visibility: "PUBLIC",
            author: { status: "ACTIVE", isPrivate: false },
          }),
    };
  }

  const posts = await prisma.post.findMany({
    where: where as never,
    include,
    orderBy:
      mode === "trending" || mode === "foryou"
        ? [{ likeCount: "desc" }, { publishedAt: "desc" }]
        : { publishedAt: "desc" },
    take: candidateTake,
    ...(!ranked && cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let visible = await filterVisiblePostIds(userId, posts);

  if (ranked) {
    const ordered = rankPosts(visible as Parameters<typeof rankPosts>[0], {
      followingIds: followingSet,
      interestTerms,
    });
    const byId = new Map(visible.map((post) => [post.id, post]));
    visible = ordered
      .map((post) => byId.get(post.id))
      .filter((post): post is (typeof visible)[number] => Boolean(post));
    if (cursor) {
      const idx = visible.findIndex((p) => p.id === cursor);
      visible = idx >= 0 ? visible.slice(idx + 1) : visible;
    }
  }

  const page = visible.slice(0, take);
  return {
    posts: await serializePosts(page, userId),
    nextCursor: visible.length > take ? visible[take].id : null,
    mode,
  };
}

export async function getExplore(cursor?: string, limit = 20, viewerId?: string) {
  const cacheKey = `feed:explore:${viewerId ?? "guest"}:${cursor ?? "start"}:${limit}`;
  return cached(cacheKey, 30, () =>
    getFeed({ userId: viewerId, cursor, limit, mode: "trending" }),
  );
}

export async function getTrendingFeed(
  cursor?: string,
  limit = 20,
  viewerId?: string,
) {
  const cacheKey = `feed:trending:${viewerId ?? "guest"}:${cursor ?? "start"}:${limit}`;
  return cached(cacheKey, 45, async () => {
    const feed = await getFeed({
      userId: viewerId,
      cursor,
      limit,
      mode: "trending",
    });
    const hashtags = await prisma.hashtag.findMany({
      orderBy: { postCount: "desc" },
      take: Math.min(Math.max(limit, 1), 30),
    });
    return { ...feed, hashtags };
  });
}

export async function invalidateFeedCaches() {
  await Promise.all([
    cacheDelPrefix("feed:"),
    cacheDelPrefix("reco:"),
  ]);
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

export async function getShorts(
  viewerId?: string,
  cursor?: string,
  limit = 20,
  mode: "latest" | "forYou" = "forYou",
) {
  const cacheKey = `feed:shorts:${viewerId ?? "guest"}:${mode}:${cursor ?? "start"}:${limit}`;
  return cached(cacheKey, 30, () =>
    loadShorts(viewerId, cursor, limit, mode),
  );
}

async function loadShorts(
  viewerId?: string,
  cursor?: string,
  limit = 20,
  mode: "latest" | "forYou" = "forYou",
) {
  const take = Math.min(Math.max(limit, 1), 50);
  const ranked = mode === "forYou";
  const candidateTake = ranked ? Math.min(take * 5, 100) : take + 1;
  const hidden = viewerId ? await hiddenAuthorIds(viewerId) : [];
  const windowStart = new Date(Date.now() - 21 * 24 * 60 * 60_000);

  let followingIds: string[] = [];
  let interestTerms: string[] = [];
  if (viewerId && ranked) {
    const [following, interests] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      prisma.userInterest.findMany({
        where: { userId: viewerId },
        include: { interest: { select: { name: true } } },
      }),
    ]);
    followingIds = following.map((f) => f.followingId);
    interestTerms = interests.map((row) => row.interest.name.toLowerCase());
  }
  const followingSet = new Set(followingIds);

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      visibility: "PUBLIC",
      author: { status: "ACTIVE" },
      ...(hidden.length ? { authorId: { notIn: hidden } } : {}),
      ...(ranked ? { publishedAt: { gte: windowStart } } : {}),
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
      ? [{ likeCount: "desc" }, { publishedAt: "desc" }]
      : { publishedAt: "desc" },
    take: candidateTake,
    ...(!ranked && cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let visible = await filterVisiblePostIds(viewerId, posts);

  if (ranked) {
    const ordered = rankPosts(visible as Parameters<typeof rankPosts>[0], {
      followingIds: followingSet,
      interestTerms,
    });
    const byId = new Map(visible.map((post) => [post.id, post]));
    visible = ordered
      .map((post) => byId.get(post.id))
      .filter((post): post is (typeof visible)[number] => Boolean(post));
    if (cursor) {
      const idx = visible.findIndex((p) => p.id === cursor);
      visible = idx >= 0 ? visible.slice(idx + 1) : visible;
    }
  }

  const page = visible.slice(0, take);
  return {
    posts: await serializePosts(page, viewerId),
    nextCursor: visible.length > take ? visible[take].id : null,
    mode,
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
        select: { postId: true },
      }),
      prisma.bookmark.findMany({
        where: { userId: viewerId, postId: { in: ids } },
        select: { postId: true },
      }),
      pollIds.length
        ? prisma.pollVote.findMany({
            where: {
              userId: viewerId,
              option: { pollId: { in: pollIds } },
            },
            select: { optionId: true, option: { select: { pollId: true } } },
          })
        : Promise.resolve([]),
    ]);
    for (const row of likeRows) liked.add(row.postId);
    for (const row of bookmarkRows) bookmarked.add(row.postId);
    for (const row of voteRows) {
      votedOption.set(row.option.pollId, row.optionId);
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
            ? votedOption.get(post.poll.id) ?? null
            : null,
          options: post.poll.options.map((option) => ({
            id: option.id,
            label: option.label,
            voteCount: option.voteCount,
            sortOrder: option.sortOrder,
          })),
        }
      : null;

    return {
      ...post,
      hashtags: post.hashtags?.map((entry) => entry.hashtag) ?? [],
      poll,
      liked: liked.has(post.id),
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

  await prisma.$transaction(async (tx) => {
    const previous = await tx.pollVote.findMany({
      where: {
        userId,
        option: { pollId: post.poll!.id },
      },
      select: { id: true, optionId: true },
    });
    for (const vote of previous) {
      await tx.pollVote.delete({ where: { id: vote.id } });
      await tx.pollOption.update({
        where: { id: vote.optionId },
        data: { voteCount: { decrement: 1 } },
      });
    }
    await tx.pollVote.create({ data: { userId, optionId } });
    await tx.pollOption.update({
      where: { id: optionId },
      data: { voteCount: { increment: 1 } },
    });
  });

  return getPostById(postId, userId);
}

export async function getAuthorWorkspacePosts(
  authorId: string,
  status: Extract<PostStatus, "DRAFT" | "SCHEDULED">,
  limit = 30,
) {
  const posts = await prisma.post.findMany({
    where: { authorId, status, deletedAt: null },
    include,
    orderBy:
      status === "SCHEDULED"
        ? { scheduledAt: "asc" }
        : { updatedAt: "desc" },
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
