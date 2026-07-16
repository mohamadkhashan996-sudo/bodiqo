import { prisma } from "@/lib/prisma";
import { getProfileVisibility } from "@/modules/users/services/visibility";

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
    },
  });
  if (!user) return null;

  const visibility = await getProfileVisibility(user, viewerId);
  return {
    ...user,
    followersCount: visibility.canViewFollowers ? user.followersCount : null,
    followingCount: visibility.canViewFollowing ? user.followingCount : null,
    postsCount: visibility.canViewContent ? user.postsCount : null,
    visibility,
  };
}
