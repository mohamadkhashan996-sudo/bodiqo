import { prisma } from "@/lib/prisma";
import { areFriends } from "@/modules/users/services/friends";
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

/** Friends of both users (mutual-follow intersection) — SQL intersection. */
export async function countMutualFriendsWithViewer(
  userId: string,
  viewerId: string,
) {
  if (userId === viewerId) return countMutualFriends(userId);

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT f1."followingId" AS id
      FROM "Follow" f1
      INNER JOIN "Follow" f1r
        ON f1r."followerId" = f1."followingId"
       AND f1r."followingId" = ${viewerId}
      WHERE f1."followerId" = ${viewerId}
      INTERSECT
      SELECT f2."followingId" AS id
      FROM "Follow" f2
      INNER JOIN "Follow" f2r
        ON f2r."followerId" = f2."followingId"
       AND f2r."followingId" = ${userId}
      WHERE f2."followerId" = ${userId}
    ) AS mutual
  `;
  return Number(rows[0]?.count ?? 0);
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
      languages: true,
      socialLinks: true,
      image: true,
      coverImage: true,
      isVerified: true,
      isOfficial: true,
      isPrivate: true,
      followersCount: true,
      followingCount: true,
      postsCount: true,
      videosCount: true,
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

  const [friendsCount, mutualFriendsCount, likesAgg, friendship] =
    await Promise.all([
      visibility.canViewFriends
        ? countMutualFriends(user.id)
        : Promise.resolve(null),
      viewerId && viewerId !== user.id && visibility.canViewFriends
        ? countMutualFriendsWithViewer(user.id, viewerId)
        : Promise.resolve(null),
      visibility.canViewContent
        ? prisma.post.aggregate({
            where: {
              authorId: user.id,
              deletedAt: null,
              status: "PUBLISHED",
            },
            _sum: { likeCount: true },
          })
        : Promise.resolve(null),
      viewerId && viewerId !== user.id
        ? resolveFriendship(viewerId, user.id)
        : Promise.resolve({
            isFriend: false,
            isBestFriend: false,
            friendRelation: "none" as const,
          }),
    ]);

  return {
    ...user,
    interests: user.interests.map((row) => row.interest),
    followersCount: visibility.canViewFollowers ? user.followersCount : null,
    followingCount: visibility.canViewFollowing ? user.followingCount : null,
    friendsCount,
    mutualFriendsCount,
    postsCount: visibility.canViewContent ? user.postsCount : null,
    videosCount: visibility.canViewContent ? user.videosCount : null,
    likesCount: visibility.canViewContent
      ? (likesAgg?._sum.likeCount ?? 0)
      : null,
    ...friendship,
    visibility,
  };
}

async function resolveFriendship(viewerId: string, userId: string) {
  if (await areFriends(viewerId, userId)) {
    const best = await prisma.closeFriend.findUnique({
      where: {
        userId_friendId: { userId: viewerId, friendId: userId },
      },
      select: { id: true },
    });
    return {
      isFriend: true,
      isBestFriend: Boolean(best),
      friendRelation: "friends" as const,
    };
  }
  const [outgoing, incoming] = await Promise.all([
    prisma.friendRequest.findFirst({
      where: {
        fromUserId: viewerId,
        toUserId: userId,
        status: "PENDING",
        kind: "FRIEND",
      },
      select: { id: true },
    }),
    prisma.friendRequest.findFirst({
      where: {
        fromUserId: userId,
        toUserId: viewerId,
        status: "PENDING",
        kind: "FRIEND",
      },
      select: { id: true },
    }),
  ]);
  return {
    isFriend: false,
    isBestFriend: false,
    friendRelation: outgoing
      ? ("outgoing" as const)
      : incoming
        ? ("incoming" as const)
        : ("none" as const),
  };
}
