import { prisma } from "@/lib/prisma";

export type ProfileVisibility = {
  isPrivate: boolean;
  canViewContent: boolean;
  canViewFollowers: boolean;
  canViewFollowing: boolean;
  followStatus: "none" | "following" | "requested";
  isMuted: boolean;
  isBlockedByMe: boolean;
  isBlockedByThem: boolean;
};

type AuthorLike = { id: string; isPrivate?: boolean };

export async function isFollowing(viewerId: string | undefined, authorId: string) {
  if (!viewerId || viewerId === authorId) return viewerId === authorId;
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: authorId } },
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

export async function getBlockState(viewerId: string | undefined, authorId: string) {
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

export async function isMutedBy(viewerId: string | undefined, authorId: string) {
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
  const [following, requested, mute, block] = await Promise.all([
    isFollowing(viewerId, author.id),
    hasPendingFollowRequest(viewerId, author.id),
    isMutedBy(viewerId, author.id),
    getBlockState(viewerId, author.id),
  ]);
  const blocked = block.isBlockedByMe || block.isBlockedByThem;
  return {
    isPrivate: Boolean(author.isPrivate),
    canViewContent: self || (!blocked && (following || !author.isPrivate)),
    canViewFollowers: self || (!blocked && (following || !author.isPrivate)),
    canViewFollowing: self || (!blocked && (following || !author.isPrivate)),
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
  if (visibility === "PRIVATE") return viewerId === author.id;
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
    if (post.visibility === "PRIVATE") return viewerId === post.authorId;
    if (post.visibility === "FOLLOWERS") {
      return Boolean(viewerId && following.has(post.authorId));
    }
    if (post.author.isPrivate && viewerId !== post.authorId) {
      return following.has(post.authorId);
    }
    return post.visibility === "PUBLIC";
  });
}
