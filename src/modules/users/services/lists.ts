import { AppError } from "@/lib/errors";
import { pageSize, splitCursorPage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import {
  blockedIdsFor,
  getProfileVisibility,
} from "@/modules/users/services/visibility";

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
type ListedUser = {
  id: string;
  handle: string | null;
  name: string | null;
  displayName: string | null;
  image: string | null;
  isVerified: boolean;
  isOfficial: boolean;
  isPrivate: boolean;
  bio: string | null;
};

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

async function filterBlockedUsers<T extends { id: string }>(
  users: T[],
  viewerId?: string,
) {
  if (!viewerId || !users.length) return users;
  const blocked = new Set(await blockedIdsFor(viewerId));
  return users.filter((user) => !blocked.has(user.id));
}

async function decorateUsers(users: ListedUser[], viewerId?: string) {
  const visible = await filterBlockedUsers(users, viewerId);
  const relations = await relationMap(
    viewerId,
    visible.map((u) => u.id),
  );
  return visible.map((u) => ({
    ...u,
    relation:
      viewerId === u.id ? ("self" as const) : (relations.get(u.id) ?? "none"),
  }));
}

async function resolveListOwner(handle: string, viewerId?: string) {
  const user = await prisma.user.findFirst({
    where: { handle: handle.toLowerCase(), status: "ACTIVE" },
    select: { id: true, isPrivate: true },
  });
  if (!user) throw new AppError("User not found", 404);
  const visibility = await getProfileVisibility(user, viewerId);
  return { user, visibility };
}

export async function listFollowers(
  handle: string,
  viewerId?: string,
  cursor?: string,
  limit = 30,
) {
  const { user, visibility } = await resolveListOwner(handle, viewerId);
  if (!visibility.canViewFollowers)
    throw new AppError("Followers are private", 403);

  const take = pageSize(limit);
  const blocked = viewerId ? await blockedIdsFor(viewerId) : [];
  const rows = await prisma.follow.findMany({
    where: {
      followingId: user.id,
      ...(blocked.length ? { followerId: { notIn: blocked } } : {}),
    },
    include: { follower: { select: userSelect } },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const { items, nextCursor } = splitCursorPage(rows, take);
  return {
    users: await decorateUsers(
      items.map((row) => row.follower),
      viewerId,
    ),
    nextCursor,
  };
}

export async function listFollowing(
  handle: string,
  viewerId?: string,
  cursor?: string,
  limit = 30,
) {
  const { user, visibility } = await resolveListOwner(handle, viewerId);
  if (!visibility.canViewFollowing)
    throw new AppError("Following is private", 403);

  const take = pageSize(limit);
  const blocked = viewerId ? await blockedIdsFor(viewerId) : [];
  const rows = await prisma.follow.findMany({
    where: {
      followerId: user.id,
      ...(blocked.length ? { followingId: { notIn: blocked } } : {}),
    },
    include: { following: { select: userSelect } },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const { items, nextCursor } = splitCursorPage(rows, take);
  return {
    users: await decorateUsers(
      items.map((row) => row.following),
      viewerId,
    ),
    nextCursor,
  };
}

export async function listFriends(
  handle: string,
  viewerId?: string,
  cursor?: string,
  limit = 30,
) {
  const { user, visibility } = await resolveListOwner(handle, viewerId);
  if (!visibility.canViewFriends) throw new AppError("Friends are private", 403);

  const take = pageSize(limit);
  const blocked = viewerId ? await blockedIdsFor(viewerId) : [];
  const rows = await prisma.follow.findMany({
    where: {
      followerId: user.id,
      ...(blocked.length ? { followingId: { notIn: blocked } } : {}),
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
  const { items, nextCursor } = splitCursorPage(rows, take);
  const users = await decorateUsers(
    items.map((row) => row.following),
    viewerId,
  );

  let best = new Set<string>();
  if (viewerId && viewerId === user.id) {
    const close = await prisma.closeFriend.findMany({
      where: {
        userId: viewerId,
        friendId: { in: users.map((u) => u.id) },
      },
      select: { friendId: true },
    });
    best = new Set(close.map((c) => c.friendId));
  }

  return {
    users: users.map((u) => ({
      ...u,
      isBestFriend: best.has(u.id),
      isFriend: true,
    })),
    nextCursor,
  };
}

export async function listFriendRequests(userId: string, limit = 50) {
  const take = pageSize(limit, 100);
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
  const take = pageSize(limit, 200);
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
  const take = pageSize(limit, 200);
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
