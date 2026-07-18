import { PostStatus, Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { pageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { createNotification, dismissActorNotifications } from "@/modules/notifications/services/notify";
import { broadcastFollowUpdate } from "@/modules/users/services/broadcast";
import { canFollow } from "@/modules/users/services/privacy-gate";
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

const REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function assertNotBlocked(a: string, b: string) {
  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  if (blocked) throw new AppError("This user is unavailable", 403);
}

async function clampFollowCounts(
  tx: Prisma.TransactionClient,
  userIds: string[],
) {
  const ids = [...new Set(userIds)];
  await tx.user.updateMany({
    where: { id: { in: ids }, followersCount: { lt: 0 } },
    data: { followersCount: 0 },
  });
  await tx.user.updateMany({
    where: { id: { in: ids }, followingCount: { lt: 0 } },
    data: { followingCount: 0 },
  });
}

async function ensureFollowEdge(
  tx: Prisma.TransactionClient,
  followerId: string,
  followingId: string,
) {
  const existing = await tx.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { id: true },
  });
  if (existing) return false;
  try {
    await tx.follow.create({ data: { followerId, followingId } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return false;
    }
    throw err;
  }
  await tx.user.update({
    where: { id: followerId },
    data: { followingCount: { increment: 1 } },
  });
  await tx.user.update({
    where: { id: followingId },
    data: { followersCount: { increment: 1 } },
  });
  return true;
}

export async function areFriends(a: string, b: string) {
  if (a === b) return false;
  const [ab, ba] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: a, followingId: b } },
      select: { id: true },
    }),
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: b, followingId: a } },
      select: { id: true },
    }),
  ]);
  return Boolean(ab && ba);
}

/** Friend IDs for a user (mutual follows). */
export async function listFriendIds(userId: string) {
  const rows = await prisma.follow.findMany({
    where: {
      followerId: userId,
      following: { following: { some: { followingId: userId } } },
    },
    select: { followingId: true },
  });
  return rows.map((r) => r.followingId);
}

/**
 * Send an explicit friendship request (mutual on accept).
 * Allowed for public and private accounts (subject to canFollow / blocks).
 */
export async function sendFriendshipRequest(
  fromUserId: string,
  toUserId: string,
) {
  if (fromUserId === toUserId) {
    throw new AppError("You cannot friend yourself", 400);
  }
  await assertNotBlocked(fromUserId, toUserId);
  const target = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true, status: true },
  });
  if (!target || target.status !== "ACTIVE") {
    throw new AppError("User not found", 404);
  }
  if (!(await canFollow(fromUserId, toUserId))) {
    throw new AppError("This user is unavailable", 403);
  }
  if (await areFriends(fromUserId, toUserId)) {
    throw new AppError("You are already friends", 409);
  }

  const existing = await prisma.friendRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    select: { id: true, status: true, kind: true, updatedAt: true },
  });

  if (existing?.status === "PENDING") {
    return existing;
  }
  if (
    existing &&
    (existing.status === "DECLINED" || existing.status === "CANCELLED")
  ) {
    const elapsed = Date.now() - existing.updatedAt.getTime();
    if (elapsed < REQUEST_COOLDOWN_MS) {
      throw new AppError("Please wait before sending another request", 429);
    }
  }

  const request = await prisma.friendRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    create: { fromUserId, toUserId, kind: "FRIEND", status: "PENDING" },
    update: { kind: "FRIEND", status: "PENDING" },
  });

  await createNotification({
    userId: toUserId,
    actorId: fromUserId,
    type: "FRIEND_REQUEST",
    body: "sent you a friend request",
  });
  broadcastFollowUpdate({
    actorId: fromUserId,
    targetId: toUserId,
    status: "requested",
  });
  return request;
}

/** Accept a FRIEND-kind request → mutual follows. */
export async function acceptFriendshipRequest(
  userId: string,
  requestId: string,
) {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw new AppError("Friend request not found", 404);
  if (request.toUserId !== userId) throw new AppError("Forbidden", 403);
  if (request.status !== "PENDING") {
    throw new AppError("This request is no longer pending", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.friendRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", kind: "FRIEND" },
    });
    await ensureFollowEdge(tx, request.fromUserId, request.toUserId);
    await ensureFollowEdge(tx, request.toUserId, request.fromUserId);
    await clampFollowCounts(tx, [request.fromUserId, request.toUserId]);
    await tx.friendRequest.updateMany({
      where: {
        fromUserId: request.toUserId,
        toUserId: request.fromUserId,
        status: "PENDING",
      },
      data: { status: "ACCEPTED", kind: "FRIEND" },
    });
    return next;
  });

  await createNotification({
    userId: request.fromUserId,
    actorId: request.toUserId,
    type: "FOLLOW",
    body: "accepted your friend request",
  });
  await dismissActorNotifications(userId, request.fromUserId, [
    "FRIEND_REQUEST",
  ]);
  broadcastFollowUpdate({
    actorId: request.fromUserId,
    targetId: request.toUserId,
    status: "following",
  });
  broadcastFollowUpdate({
    actorId: request.toUserId,
    targetId: request.fromUserId,
    status: "following",
  });
  getIoFriendBroadcast(request.fromUserId, request.toUserId);
  return updated;
}

function getIoFriendBroadcast(a: string, b: string) {
  void import("@/lib/socket").then(({ getIo }) => {
    const io = getIo();
    if (!io) return;
    const payload = { type: "friends" as const, userIds: [a, b] };
    io.to(`user:${a}`).emit("friend:update", payload);
    io.to(`user:${b}`).emit("friend:update", payload);
  });
}

/**
 * Remove friendship: delete both follow edges + close-friend rows.
 */
export async function removeFriend(userId: string, friendId: string) {
  if (userId === friendId) {
    throw new AppError("Invalid friend", 400);
  }
  if (!(await areFriends(userId, friendId))) {
    throw new AppError("You are not friends with this user", 400);
  }

  await prisma.$transaction(async (tx) => {
    const edges = await tx.follow.findMany({
      where: {
        OR: [
          { followerId: userId, followingId: friendId },
          { followerId: friendId, followingId: userId },
        ],
      },
    });
    for (const edge of edges) {
      await tx.follow.delete({ where: { id: edge.id } });
      await tx.user.update({
        where: { id: edge.followerId },
        data: { followingCount: { decrement: 1 } },
      });
      await tx.user.update({
        where: { id: edge.followingId },
        data: { followersCount: { decrement: 1 } },
      });
    }
    await tx.closeFriend.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });
    await clampFollowCounts(tx, [userId, friendId]);
  });

  broadcastFollowUpdate({
    actorId: userId,
    targetId: friendId,
    status: "none",
  });
  broadcastFollowUpdate({
    actorId: friendId,
    targetId: userId,
    status: "none",
  });
  getIoFriendBroadcast(userId, friendId);
  return { ok: true };
}

export async function addCloseFriend(userId: string, friendId: string) {
  if (!(await areFriends(userId, friendId))) {
    throw new AppError("Best friends must already be friends", 400);
  }
  const count = await prisma.closeFriend.count({ where: { userId } });
  if (count >= 50) throw new AppError("Best friends list is full (50)", 400);
  return prisma.closeFriend.upsert({
    where: { userId_friendId: { userId, friendId } },
    create: { userId, friendId },
    update: {},
  });
}

export async function removeCloseFriend(userId: string, friendId: string) {
  await prisma.closeFriend.deleteMany({ where: { userId, friendId } });
  return { ok: true };
}

export async function listCloseFriends(userId: string) {
  const rows = await prisma.closeFriend.findMany({
    where: { userId },
    include: { friend: { select: userSelect } },
    orderBy: { createdAt: "desc" },
  });
  return {
    users: rows.map((row) => ({ ...row.friend, isBestFriend: true })),
  };
}

export async function listMutualFriends(
  handle: string,
  viewerId: string,
  cursor?: string,
  limit = 30,
) {
  const owner = await prisma.user.findFirst({
    where: { handle: handle.toLowerCase(), status: "ACTIVE" },
    select: { id: true, isPrivate: true },
  });
  if (!owner) throw new AppError("User not found", 404);
  if (owner.id === viewerId) {
    throw new AppError("Use the friends list for your own friends", 400);
  }

  const visibility = await getProfileVisibility(owner, viewerId);
  if (!visibility.canViewFriends) {
    throw new AppError("Friends are private", 403);
  }

  const take = pageSize(limit);
  const blocked = new Set(await blockedIdsFor(viewerId));

  const viewerFriends = await listFriendIds(viewerId);
  const ownerFriends = await listFriendIds(owner.id);
  const ownerSet = new Set(ownerFriends);
  const mutualIds = viewerFriends.filter(
    (id) =>
      ownerSet.has(id) &&
      id !== viewerId &&
      id !== owner.id &&
      !blocked.has(id),
  );

  let start = 0;
  if (cursor) {
    const idx = mutualIds.indexOf(cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }
  const slice = mutualIds.slice(start, start + take + 1);
  const page = slice.slice(0, take);
  const users = await prisma.user.findMany({
    where: { id: { in: page }, status: "ACTIVE" },
    select: userSelect,
  });
  const order = new Map(page.map((id, i) => [id, i]));
  users.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return {
    users: users.map((u) => ({ ...u, relation: "following" as const })),
    nextCursor: slice.length > take ? (slice[take] ?? null) : null,
  };
}

export async function searchFriends(
  userId: string,
  q: string,
  limit = 20,
) {
  const term = q.trim();
  if (term.length < 1) return { users: [] as unknown[] };
  const take = Math.min(Math.max(limit, 1), 30);
  const friendIds = await listFriendIds(userId);
  if (!friendIds.length) return { users: [] };
  const blocked = await blockedIdsFor(userId);
  const allowed = friendIds.filter((id) => !blocked.includes(id));
  if (!allowed.length) return { users: [] };

  const users = await prisma.user.findMany({
    where: {
      id: { in: allowed },
      status: "ACTIVE",
      OR: [
        { handle: { contains: term, mode: "insensitive" } },
        { displayName: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
      ],
    },
    select: userSelect,
    take,
    orderBy: { followersCount: "desc" },
  });
  return { users: users.map((u) => ({ ...u, relation: "following" as const })) };
}

export async function getSuggestedFriends(userId: string, limit = 8) {
  const take = Math.min(Math.max(limit, 1), 24);
  const [friendIds, pending, blocked, close] = await Promise.all([
    listFriendIds(userId),
    prisma.friendRequest.findMany({
      where: { fromUserId: userId, status: "PENDING" },
      select: { toUserId: true },
    }),
    blockedIdsFor(userId),
    prisma.closeFriend.findMany({
      where: { userId },
      select: { friendId: true },
    }),
  ]);
  const exclude = new Set<string>([
    userId,
    ...friendIds,
    ...pending.map((p) => p.toUserId),
    ...blocked,
    ...close.map((c) => c.friendId),
  ]);

  if (!friendIds.length) {
    return { users: [] as unknown[] };
  }

  const fof = await prisma.follow.groupBy({
    by: ["followingId"],
    where: {
      followerId: { in: friendIds },
      followingId: { notIn: [...exclude] },
      following: {
        status: "ACTIVE",
        following: { some: { followingId: { in: friendIds } } },
      },
    },
    _count: { followingId: true },
    orderBy: { _count: { followingId: "desc" } },
    take: take * 2,
  });

  if (!fof.length) return { users: [] };

  const users = await prisma.user.findMany({
    where: {
      id: { in: fof.map((r) => r.followingId) },
      status: "ACTIVE",
    },
    select: userSelect,
  });
  const rank = new Map(fof.map((r) => [r.followingId, r._count.followingId]));
  users.sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0));
  return {
    users: users.slice(0, take).map((u) => ({
      ...u,
      reason: "Friends of friends",
      mutualHint: rank.get(u.id) ?? 0,
    })),
  };
}

/** Recent posts from mutual friends (friend activity). */
export async function getFriendActivity(
  userId: string,
  cursor?: string,
  limit = 20,
) {
  const take = Math.min(Math.max(limit, 1), 40);
  const friendIds = await listFriendIds(userId);
  if (!friendIds.length) {
    return { posts: [], nextCursor: null as string | null };
  }

  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: friendIds },
      deletedAt: null,
      status: PostStatus.PUBLISHED,
      visibility: { in: ["PUBLIC", "FOLLOWERS"] },
    },
    include: {
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
          status: true,
        },
      },
      media: { orderBy: { sortOrder: "asc" } },
      poll: { include: { options: { orderBy: { sortOrder: "asc" } } } },
      hashtags: { include: { hashtag: true } },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const { serializePosts } = await import("@/modules/feed/services/posts");
  const page = posts.slice(0, take);
  return {
    posts: await serializePosts(page, userId),
    nextCursor: posts.length > take ? (posts[take]?.id ?? null) : null,
  };
}

export async function decorateFriendFlags(
  viewerId: string | undefined,
  userIds: string[],
) {
  const friends = new Set<string>();
  const best = new Set<string>();
  if (!viewerId || !userIds.length) {
    return { friends, best };
  }
  const [mutual, close] = await Promise.all([
    prisma.follow.findMany({
      where: {
        followerId: viewerId,
        followingId: { in: userIds },
        following: { following: { some: { followingId: viewerId } } },
      },
      select: { followingId: true },
    }),
    prisma.closeFriend.findMany({
      where: { userId: viewerId, friendId: { in: userIds } },
      select: { friendId: true },
    }),
  ]);
  for (const row of mutual) friends.add(row.followingId);
  for (const row of close) best.add(row.friendId);
  return { friends, best };
}

