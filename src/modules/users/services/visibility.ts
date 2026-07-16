import { prisma } from "@/lib/prisma";

export type ProfileVisibility = {
  isPrivate: boolean;
  canViewContent: boolean;
  canViewFollowers: boolean;
  canViewFollowing: boolean;
  followStatus: "none" | "following" | "requested";
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

export async function getProfileVisibility(
  author: AuthorLike,
  viewerId?: string,
): Promise<ProfileVisibility> {
  const self = viewerId === author.id;
  const following = await isFollowing(viewerId, author.id);
  const requested = await hasPendingFollowRequest(viewerId, author.id);
  const isPrivate = Boolean(author.isPrivate) && !self;

  return {
    isPrivate: Boolean(author.isPrivate),
    canViewContent: self || following || !author.isPrivate,
    canViewFollowers: self || following || !author.isPrivate,
    canViewFollowing: self || following || !author.isPrivate,
    followStatus: following ? "following" : requested ? "requested" : "none",
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
  const checks = await Promise.all(
    posts.map(async (post) => ({
      id: post.id,
      ok: await canViewPostContent(viewerId, post.author, post.visibility),
    })),
  );
  const allowed = new Set(checks.filter((c) => c.ok).map((c) => c.id));
  return posts.filter((p) => allowed.has(p.id));
}
