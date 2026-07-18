import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export type ProfileVisibility = {
  isPrivate: boolean;
  canViewContent: boolean;
  canViewFollowers: boolean;
  canViewFollowing: boolean;
  canViewFriends: boolean;
  followStatus: "none" | "following" | "requested";
  isMuted: boolean;
  isBlockedByMe: boolean;
  isBlockedByThem: boolean;
};

type AuthorLike = { id: string; isPrivate?: boolean };

export async function isFollowing(
  viewerId: string | undefined,
  authorId: string,
) {
  if (!viewerId || viewerId === authorId) return viewerId === authorId;
  const row = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: viewerId, followingId: authorId },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function hasPendingFollowRequest(
  viewerId: string | undefined,
  authorId: string,
) {
  if (!viewerId) return false;
  const row = await prisma.friendRequest.findFirst({
    where: {
      fromUserId: viewerId,
      toUserId: authorId,
      status: "PENDING",
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function getBlockState(
  viewerId: string | undefined,
  authorId: string,
) {
  if (!viewerId || viewerId === authorId) {
    return { isBlockedByMe: false, isBlockedByThem: false };
  }
  const rows = await prisma.block.findMany({
    where: {
      OR: [
        { blockerId: viewerId, blockedId: authorId },
        { blockerId: authorId, blockedId: viewerId },
      ],
    },
    select: { blockerId: true },
  });
  return {
    isBlockedByMe: rows.some((row) => row.blockerId === viewerId),
    isBlockedByThem: rows.some((row) => row.blockerId === authorId),
  };
}

export async function isMutedBy(
  viewerId: string | undefined,
  authorId: string,
) {
  if (!viewerId || viewerId === authorId) return false;
  const row = await prisma.mute.findUnique({
    where: { muterId_mutedId: { muterId: viewerId, mutedId: authorId } },
    select: { id: true },
  });
  return Boolean(row);
}

/** Bidirectional block IDs to exclude from lists/suggestions for a viewer. */
export async function blockedIdsFor(viewerId: string) {
  const rows = await prisma.block.findMany({
    where: {
      OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
    },
    select: { blockerId: true, blockedId: true },
  });
  return [
    ...new Set(
      rows.flatMap((row) =>
        row.blockerId === viewerId ? [row.blockedId] : [row.blockerId],
      ),
    ),
  ];
}

export async function getProfileVisibility(
  author: AuthorLike,
  viewerId?: string,
): Promise<ProfileVisibility> {
  const self = viewerId === author.id;
  const [following, requested, mute, block, privacy] = await Promise.all([
    isFollowing(viewerId, author.id),
    hasPendingFollowRequest(viewerId, author.id),
    isMutedBy(viewerId, author.id),
    getBlockState(viewerId, author.id),
    prisma.privacySettings.findUnique({
      where: { userId: author.id },
      select: { whoCanSeeFriends: true },
    }),
  ]);
  const blocked = block.isBlockedByMe || block.isBlockedByThem;
  const baseLists = self || (!blocked && (following || !author.isPrivate));

  let canViewFriends = baseLists;
  if (!self && !blocked && viewerId) {
    const audience = privacy?.whoCanSeeFriends ?? "FOLLOWERS";
    if (audience === "NOBODY") canViewFriends = false;
    else if (audience === "EVERYONE") {
      canViewFriends = !author.isPrivate || following;
    } else if (audience === "FOLLOWERS") canViewFriends = following;
    else if (audience === "FOLLOWING") {
      canViewFriends = await isFollowing(author.id, viewerId);
    } else if (audience === "MUTUAL") {
      canViewFriends =
        following && (await isFollowing(author.id, viewerId));
    }
  } else if (!self) {
    canViewFriends = false;
  }

  return {
    isPrivate: Boolean(author.isPrivate),
    canViewContent: self || (!blocked && (following || !author.isPrivate)),
    canViewFollowers: baseLists,
    canViewFollowing: baseLists,
    canViewFriends,
    followStatus: following ? "following" : requested ? "requested" : "none",
    isMuted: mute,
    isBlockedByMe: block.isBlockedByMe,
    isBlockedByThem: block.isBlockedByThem,
  };
}

export async function canViewPostContent(
  viewerId: string | undefined,
  author: AuthorLike,
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE",
) {
  // Authors always see their own posts (including FOLLOWERS/PRIVATE).
  if (viewerId && viewerId === author.id) return true;
  if (visibility === "PRIVATE") return false;
  if (visibility === "FOLLOWERS") {
    if (!viewerId) return false;
    return isFollowing(viewerId, author.id);
  }
  if (author.isPrivate && viewerId !== author.id) {
    return isFollowing(viewerId, author.id);
  }
  return visibility === "PUBLIC";
}

export async function filterVisiblePostIds(
  viewerId: string | undefined,
  posts: Array<{
    id: string;
    authorId: string;
    visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
    author: AuthorLike;
  }>,
) {
  if (!posts.length) return posts;

  const authorIds = [...new Set(posts.map((p) => p.authorId))];
  const following = new Set<string>();
  if (viewerId) {
    following.add(viewerId);
    const rows = await prisma.follow.findMany({
      where: {
        followerId: viewerId,
        followingId: { in: authorIds },
      },
      select: { followingId: true },
    });
    for (const row of rows) following.add(row.followingId);
  }

  return posts.filter((post) => {
    if (viewerId && viewerId === post.authorId) return true;
    if (post.visibility === "PRIVATE") return false;
    if (post.visibility === "FOLLOWERS") {
      return Boolean(viewerId && following.has(post.authorId));
    }
    if (post.author.isPrivate && viewerId !== post.authorId) {
      return following.has(post.authorId);
    }
    return post.visibility === "PUBLIC";
  });
}

/**
 * Load a published post and enforce the same visibility policy used for reads.
 * Use before likes, bookmarks, shares, views, poll votes, and comments.
 */
export async function assertCanInteractWithPost(
  viewerId: string | undefined,
  postId: string,
  opts?: {
    /** Require a signed-in viewer (default true). */
    requireAuth?: boolean;
    /** Return 404 instead of 403 to avoid leaking private posts. */
    obscure?: boolean;
  },
) {
  const requireAuth = opts?.requireAuth !== false;
  if (requireAuth && !viewerId) {
    throw new AppError("Sign in required", 401);
  }

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: {
      id: true,
      authorId: true,
      status: true,
      visibility: true,
      commentsEnabled: true,
      type: true,
      author: {
        select: { id: true, isPrivate: true, status: true },
      },
    },
  });

  const hide = () => {
    throw new AppError(
      opts?.obscure === false ? "Forbidden" : "Post not found",
      opts?.obscure === false ? 403 : 404,
    );
  };

  if (!post || post.author.status !== "ACTIVE") hide();
  if (post!.status !== "PUBLISHED") hide();

  const allowed = await canViewPostContent(
    viewerId,
    post!.author,
    post!.visibility,
  );
  if (!allowed) hide();

  return post!;
}
