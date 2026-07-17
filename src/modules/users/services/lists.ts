import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { getProfileVisibility } from "@/modules/users/services/visibility";

const userSelect = {
  id: true,
  handle: true,
  name: true,
  displayName: true,
  image: true,
  isVerified: true,
  isOfficial: true,
  isPrivate: true,
  bio: true,
} as const;

type RelationStatus = "none" | "following" | "requested";

async function relationMap(viewerId: string | undefined, userIds: string[]) {
  const map = new Map<string, RelationStatus>();
  for (const id of userIds) map.set(id, "none");
  if (!viewerId || !userIds.length) return map;

  const [following, pending] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: userIds } },
      select: { followingId: true },
    }),
    prisma.friendRequest.findMany({
      where: {
        fromUserId: viewerId,
        toUserId: { in: userIds },
        status: "PENDING",
      },
      select: { toUserId: true },
    }),
  ]);
  for (const row of following) map.set(row.followingId, "following");
  for (const row of pending) {
    if (map.get(row.toUserId) !== "following") {
      map.set(row.toUserId, "requested");
    }
  }
  return map;
}

export async function listFollowers(
  handle: string,
  viewerId?: string,
  cursor?: string,
  limit = 30,
) {
  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true, isPrivate: true },
  });
  if (!user) throw new AppError("User not found", 404);
  const visibility = await getProfileVisibility(user, viewerId);
  if (!visibility.canViewFollowers) throw new AppError("Followers are private", 403);

  const take = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.follow.findMany({
    where: { followingId: user.id },
    include: { follower: { select: userSelect } },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor = rows.length > take ? rows.pop()!.id : null;
  const users = rows.map((row) => row.follower);
  const relations = await relationMap(
    viewerId,
    users.map((u) => u.id),
  );

  return {
    users: users.map((u) => ({
      ...u,
      relation: viewerId === u.id ? ("self" as const) : relations.get(u.id) ?? "none",
    })),
    nextCursor,
  };
}

export async function listFollowing(
  handle: string,
  viewerId?: string,
  cursor?: string,
  limit = 30,
) {
  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true, isPrivate: true },
  });
  if (!user) throw new AppError("User not found", 404);
  const visibility = await getProfileVisibility(user, viewerId);
  if (!visibility.canViewFollowing) throw new AppError("Following is private", 403);

  const take = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.follow.findMany({
    where: { followerId: user.id },
    include: { following: { select: userSelect } },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor = rows.length > take ? rows.pop()!.id : null;
  const users = rows.map((row) => row.following);
  const relations = await relationMap(
    viewerId,
    users.map((u) => u.id),
  );

  return {
    users: users.map((u) => ({
      ...u,
      relation: viewerId === u.id ? ("self" as const) : relations.get(u.id) ?? "none",
    })),
    nextCursor,
  };
}

export async function listFriends(
  handle: string,
  viewerId?: string,
  cursor?: string,
  limit = 30,
) {
  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true, isPrivate: true },
  });
  if (!user) throw new AppError("User not found", 404);
  const visibility = await getProfileVisibility(user, viewerId);
  if (!visibility.canViewFollowers) throw new AppError("Friends are private", 403);

  const take = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.follow.findMany({
    where: {
      followerId: user.id,
      following: {
        following: {
          some: { followingId: user.id },
        },
      },
    },
    include: { following: { select: userSelect } },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor = rows.length > take ? rows.pop()!.id : null;
  const users = rows.map((row) => row.following);
  const relations = await relationMap(
    viewerId,
    users.map((u) => u.id),
  );

  return {
    users: users.map((u) => ({
      ...u,
      relation: viewerId === u.id ? ("self" as const) : relations.get(u.id) ?? "none",
    })),
    nextCursor,
  };
}

export async function listFriendRequests(userId: string, limit = 50) {
  const take = Math.min(Math.max(limit, 1), 100);
  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { toUserId: userId, status: "PENDING" },
      include: {
        fromUser: { select: userSelect },
      },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.friendRequest.findMany({
      where: { fromUserId: userId, status: "PENDING" },
      include: {
        toUser: { select: userSelect },
      },
      orderBy: { createdAt: "desc" },
      take,
    }),
  ]);
  return { incoming, outgoing };
}

export async function listBlocked(userId: string, limit = 100) {
  const take = Math.min(Math.max(limit, 1), 200);
  const rows = await prisma.block.findMany({
    where: { blockerId: userId },
    include: { blocked: { select: userSelect } },
    orderBy: { createdAt: "desc" },
    take,
  });
  return {
    users: rows.map((row) => ({ ...row.blocked, blockedAt: row.createdAt })),
  };
}

export async function listMuted(userId: string, limit = 100) {
  const take = Math.min(Math.max(limit, 1), 200);
  const rows = await prisma.mute.findMany({
    where: { muterId: userId },
    include: { muted: { select: userSelect } },
    orderBy: { createdAt: "desc" },
    take,
  });
  return {
    users: rows.map((row) => ({ ...row.muted, mutedAt: row.createdAt })),
  };
}
