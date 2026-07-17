import { prisma } from "@/lib/prisma";
import {
  blockedIdsFor,
  getProfileVisibility,
} from "@/modules/users/services/visibility";

export async function countMutualFriends(userId: string) {
  return prisma.follow.count({
    where: {
      followerId: userId,
      following: {
        following: {
          some: { followingId: userId },
        },
      },
    },
  });
}

/** Friends of both users (mutual-follow intersection). */
export async function countMutualFriendsWithViewer(
  userId: string,
  viewerId: string,
) {
  if (userId === viewerId) return countMutualFriends(userId);

  const [mine, theirs] = await Promise.all([
    prisma.follow.findMany({
      where: {
        followerId: viewerId,
        following: { following: { some: { followingId: viewerId } } },
      },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: {
        followerId: userId,
        following: { following: { some: { followingId: userId } } },
      },
      select: { followingId: true },
    }),
  ]);
  const theirSet = new Set(theirs.map((row) => row.followingId));
  return mine.filter((row) => theirSet.has(row.followingId)).length;
}

export async function getPublicProfile(handle: string, viewerId?: string) {
  const user = await prisma.user.findFirst({
    where: { handle: handle.toLowerCase(), status: "ACTIVE" },
    select: {
      id: true,
      handle: true,
      name: true,
      displayName: true,
      bio: true,
      website: true,
      country: true,
      city: true,
      image: true,
      coverImage: true,
      isVerified: true,
      isOfficial: true,
      isPrivate: true,
      followersCount: true,
      followingCount: true,
      postsCount: true,
      createdAt: true,
      interests: {
        include: { interest: { select: { id: true, slug: true, name: true } } },
      },
    },
  });
  if (!user) return null;

  if (viewerId && viewerId !== user.id) {
    const blocked = await blockedIdsFor(viewerId);
    if (blocked.includes(user.id)) return null;
  }

  const visibility = await getProfileVisibility(user, viewerId);
  const friendsCount = visibility.canViewFollowers
    ? await countMutualFriends(user.id)
    : null;
  const mutualFriendsCount =
    viewerId && viewerId !== user.id && visibility.canViewFollowers
      ? await countMutualFriendsWithViewer(user.id, viewerId)
      : null;

  return {
    ...user,
    interests: user.interests.map((row) => row.interest),
    followersCount: visibility.canViewFollowers ? user.followersCount : null,
    followingCount: visibility.canViewFollowing ? user.followingCount : null,
    friendsCount,
    mutualFriendsCount,
    postsCount: visibility.canViewContent ? user.postsCount : null,
    visibility,
  };
}
