import { prisma } from "@/lib/prisma";
import { getProfileVisibility } from "@/modules/users/services/visibility";

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

  const visibility = await getProfileVisibility(user, viewerId);
  const friendsCount = visibility.canViewFollowers
    ? await countMutualFriends(user.id)
    : null;

  return {
    ...user,
    interests: user.interests.map((row) => row.interest),
    followersCount: visibility.canViewFollowers ? user.followersCount : null,
    followingCount: visibility.canViewFollowing ? user.followingCount : null,
    friendsCount,
    postsCount: visibility.canViewContent ? user.postsCount : null,
    visibility,
  };
}
