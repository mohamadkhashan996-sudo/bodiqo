import type {
  FriendRequestStatus,
  ReportCategory,
  ReportTarget,
} from "@prisma/client";
import { Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { scoreContentModeration } from "@/modules/ai/services/intelligence";
import { createNotification, dismissActorNotifications } from "@/modules/notifications/services/notify";
import { broadcastFollowUpdate } from "@/modules/users/services/broadcast";
import { canFollow } from "@/modules/users/services/privacy-gate";
import { assertCanInteractWithPost } from "@/modules/users/services/visibility";

/** Cooldown before re-requesting after decline/cancel. */
const REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function assertDistinct(actorId: string, targetId: string) {
  if (actorId === targetId) {
    throw new AppError("You cannot perform this action on yourself", 400);
  }
}

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
  if (!ids.length) return;
  await tx.user.updateMany({
    where: { id: { in: ids }, followersCount: { lt: 0 } },
    data: { followersCount: 0 },
  });
  await tx.user.updateMany({
    where: { id: { in: ids }, followingCount: { lt: 0 } },
    data: { followingCount: 0 },
  });
}

/** Create a directed follow edge if missing; returns whether it was new. */
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

export async function followUser(followerId: string, followingId: string) {
  await assertDistinct(followerId, followingId);
  const target = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true, status: true, isPrivate: true },
  });
  if (!target || target.status !== "ACTIVE") {
    throw new AppError("User not found", 404);
  }
  if (!(await canFollow(followerId, followingId))) {
    throw new AppError("This user is unavailable", 403);
  }
  await assertNotBlocked(followerId, followingId);

  const already = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId, followingId },
    },
    select: { id: true },
  });
  if (already) {
    broadcastFollowUpdate({
      actorId: followerId,
      targetId: followingId,
      status: "following",
    });
    return { status: "following" as const };
  }

  if (target.isPrivate) {
    await sendFriendRequest(followerId, followingId, { asFollowRequest: true });
    broadcastFollowUpdate({
      actorId: followerId,
      targetId: followingId,
      status: "requested",
    });
    return { status: "requested" as const };
  }

  await prisma.$transaction(async (tx) => {
    await ensureFollowEdge(tx, followerId, followingId);
    await clampFollowCounts(tx, [followerId, followingId]);
  });
  await createNotification({
    userId: followingId,
    actorId: followerId,
    type: "FOLLOW",
  });
  broadcastFollowUpdate({
    actorId: followerId,
    targetId: followingId,
    status: "following",
  });
  return { status: "following" as const };
}

export async function unfollowUser(followerId: string, followingId: string) {
  await prisma.friendRequest.deleteMany({
    where: {
      fromUserId: followerId,
      toUserId: followingId,
      status: "PENDING",
    },
  });
  const deleted = await prisma.$transaction(async (tx) => {
    const existing = await tx.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
    if (!existing) return false;
    await tx.follow.delete({ where: { id: existing.id } });
    await tx.user.update({
      where: { id: followerId },
      data: { followingCount: { decrement: 1 } },
    });
    await tx.user.update({
      where: { id: followingId },
      data: { followersCount: { decrement: 1 } },
    });
    await clampFollowCounts(tx, [followerId, followingId]);
    return true;
  });
  broadcastFollowUpdate({
    actorId: followerId,
    targetId: followingId,
    status: "none",
  });
  return { deleted, status: "none" as const };
}

export async function blockUser(blockerId: string, blockedId: string) {
  await assertDistinct(blockerId, blockedId);
  return prisma.$transaction(async (tx) => {
    const block = await tx.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });

    const follows = await tx.follow.findMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    });
    for (const follow of follows) {
      await tx.follow.delete({ where: { id: follow.id } });
      await tx.user.update({
        where: { id: follow.followerId },
        data: { followingCount: { decrement: 1 } },
      });
      await tx.user.update({
        where: { id: follow.followingId },
        data: { followersCount: { decrement: 1 } },
      });
    }
    await clampFollowCounts(tx, [blockerId, blockedId]);

    await tx.friendRequest.deleteMany({
      where: {
        OR: [
          { fromUserId: blockerId, toUserId: blockedId },
          { fromUserId: blockedId, toUserId: blockerId },
        ],
      },
    });
    await tx.mute.deleteMany({
      where: {
        OR: [
          { muterId: blockerId, mutedId: blockedId },
          { muterId: blockedId, mutedId: blockerId },
        ],
      },
    });

    return block;
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  return prisma.block.deleteMany({ where: { blockerId, blockedId } });
}

export async function muteUser(muterId: string, mutedId: string) {
  await assertDistinct(muterId, mutedId);
  return prisma.mute.upsert({
    where: { muterId_mutedId: { muterId, mutedId } },
    create: { muterId, mutedId },
    update: {},
  });
}

export async function unmuteUser(muterId: string, mutedId: string) {
  return prisma.mute.deleteMany({ where: { muterId, mutedId } });
}

export async function reportEntity(
  reporterId: string,
  targetType: ReportTarget,
  targetId: string,
  reason: string,
  details?: string,
  category?: ReportCategory,
) {
  let contentText = details ?? "";
  if (targetType === "POST") {
    const post = await prisma.post.findUnique({
      where: { id: targetId },
      select: { body: true },
    });
    contentText = [post?.body, details].filter(Boolean).join("\n");
  } else if (targetType === "COMMENT") {
    const comment = await prisma.comment.findFirst({
      where: { id: targetId, deletedAt: null },
      select: {
        body: true,
        authorId: true,
        postId: true,
      },
    });
    if (!comment) throw new AppError("Comment not found", 404);
    if (comment.authorId === reporterId) {
      throw new AppError("You cannot report your own comment", 400);
    }
    await assertCanInteractWithPost(reporterId, comment.postId);
    const open = await prisma.report.findFirst({
      where: {
        reporterId,
        targetType: "COMMENT",
        targetId,
        status: { in: ["OPEN", "ESCALATED", "IN_REVIEW"] },
      },
      select: { id: true },
    });
    if (open) throw new AppError("You already reported this comment", 409);
    contentText = [comment.body, details].filter(Boolean).join("\n");
  } else if (targetType === "MESSAGE") {
    const message = await prisma.message.findUnique({
      where: { id: targetId },
      select: { body: true },
    });
    contentText = [message?.body, details].filter(Boolean).join("\n");
  } else if (targetType === "USER") {
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: { bio: true, displayName: true },
    });
    contentText = [user?.displayName, user?.bio, details]
      .filter(Boolean)
      .join("\n");
  }

  const ai = scoreContentModeration(`${reason}\n${contentText}`);

  const inferred =
    category ??
    (ai.categories.includes("SPAM") || /spam/i.test(reason)
      ? "SPAM"
      : /scam|phish/i.test(reason)
        ? "SCAM"
        : ai.categories.includes("HARASSMENT") ||
            /harass|bully|toxic/i.test(reason)
          ? "HARASSMENT"
          : ai.categories.includes("VIOLENCE") || /violen|threat/i.test(reason)
            ? "VIOLENCE"
            : /copyright|dmca/i.test(reason)
              ? "COPYRIGHT"
              : /fake/i.test(reason)
                ? "FAKE_ACCOUNT"
                : "OTHER");

  const aiNote = `AI risk ${ai.riskScore}/100 · spam ${ai.spam.score} · toxicity ${ai.toxicity.score}${
    ai.recommendEscalate ? " · auto-escalated" : ""
  }`;

  return prisma.report.create({
    data: {
      reporterId,
      targetType,
      targetId,
      reason,
      details: details ? `${details}\n\n[${aiNote}]` : `[${aiNote}]`,
      category: inferred,
      status: ai.recommendEscalate ? "ESCALATED" : "OPEN",
    },
  });
}

export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string,
  opts?: { asFollowRequest?: boolean },
) {
  await assertDistinct(fromUserId, toUserId);
  await assertNotBlocked(fromUserId, toUserId);
  const target = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true, status: true, isPrivate: true },
  });
  if (!target || target.status !== "ACTIVE") {
    throw new AppError("User not found", 404);
  }

  // FOLLOW-kind requests are for private-account follow approval only.
  // Explicit friendship requests use sendFriendshipRequest (kind FRIEND).
  if (!opts?.asFollowRequest && !target.isPrivate) {
    throw new AppError(
      "This account is public — use Follow, or send a friend request",
      400,
    );
  }

  if (!(await canFollow(fromUserId, toUserId))) {
    throw new AppError("This user is unavailable", 403);
  }

  const alreadyFollowing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: fromUserId, followingId: toUserId },
    },
    select: { id: true },
  });
  if (alreadyFollowing) return alreadyFollowing;

  const existingRequest = await prisma.friendRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    select: { id: true, status: true, updatedAt: true },
  });

  if (
    existingRequest &&
    (existingRequest.status === "DECLINED" ||
      existingRequest.status === "CANCELLED")
  ) {
    const elapsed = Date.now() - existingRequest.updatedAt.getTime();
    if (elapsed < REQUEST_COOLDOWN_MS) {
      throw new AppError(
        "Please wait before sending another follow request",
        429,
      );
    }
  }

  if (existingRequest?.status === "PENDING") {
    return existingRequest;
  }

  const request = await prisma.friendRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    create: { fromUserId, toUserId, kind: "FOLLOW", status: "PENDING" },
    update: { kind: "FOLLOW", status: "PENDING" },
  });

  await createNotification({
    userId: toUserId,
    actorId: fromUserId,
    type: "FRIEND_REQUEST",
    body: "sent you a follow request",
  });
  return request;
}

export async function respondFriendRequest(
  userId: string,
  requestId: string,
  status: Extract<FriendRequestStatus, "ACCEPTED" | "DECLINED" | "CANCELLED">,
) {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw new AppError("Request not found", 404);
  if (request.toUserId !== userId && request.fromUserId !== userId) {
    throw new AppError("Forbidden", 403);
  }
  if (status === "CANCELLED" && request.fromUserId !== userId) {
    throw new AppError("Forbidden", 403);
  }
  if (status !== "CANCELLED" && request.toUserId !== userId) {
    throw new AppError("Forbidden", 403);
  }
  if (request.status !== "PENDING") {
    throw new AppError("This request is no longer pending", 400);
  }

  if (status === "ACCEPTED") {
    if (request.kind === "FRIEND") {
      const { acceptFriendshipRequest } = await import(
        "@/modules/users/services/friends"
      );
      return acceptFriendshipRequest(userId, requestId);
    }

    // FOLLOW-kind: one-way approve (requester → accepter).
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.friendRequest.update({
        where: { id: requestId },
        data: { status },
      });

      await ensureFollowEdge(tx, request.fromUserId, request.toUserId);
      await clampFollowCounts(tx, [request.fromUserId, request.toUserId]);

      await tx.friendRequest.updateMany({
        where: {
          fromUserId: request.toUserId,
          toUserId: request.fromUserId,
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      });

      return next;
    });
    await createNotification({
      userId: request.fromUserId,
      actorId: request.toUserId,
      type: "FOLLOW",
      body: "accepted your follow request",
    });
    await dismissActorNotifications(userId, request.fromUserId, [
      "FRIEND_REQUEST",
    ]);
    broadcastFollowUpdate({
      actorId: request.fromUserId,
      targetId: request.toUserId,
      status: "following",
    });
    return updated;
  }

  const updated = await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status },
  });
  if (status === "CANCELLED" || status === "DECLINED") {
    if (status === "DECLINED" && request.toUserId === userId) {
      await dismissActorNotifications(userId, request.fromUserId, [
        "FRIEND_REQUEST",
      ]);
    }
    broadcastFollowUpdate({
      actorId: request.fromUserId,
      targetId: request.toUserId,
      status: "none",
    });
  }
  return updated;
}

/**
 * When an account goes public, convert pending incoming follow requests
 * into one-way follows so requesters are not left hanging.
 */
export async function acceptPendingFollowRequestsOnPublic(userId: string) {
  const pending = await prisma.friendRequest.findMany({
    where: { toUserId: userId, status: "PENDING" },
    select: { id: true, fromUserId: true },
    take: 200,
  });
  for (const row of pending) {
    await prisma.$transaction(async (tx) => {
      await tx.friendRequest.update({
        where: { id: row.id },
        data: { status: "ACCEPTED" },
      });
      await ensureFollowEdge(tx, row.fromUserId, userId);
      await clampFollowCounts(tx, [row.fromUserId, userId]);
    });
    await createNotification({
      userId: row.fromUserId,
      actorId: userId,
      type: "FOLLOW",
      body: "accepted your follow request",
    }).catch(() => undefined);
    broadcastFollowUpdate({
      actorId: row.fromUserId,
      targetId: userId,
      status: "following",
    });
  }
  return { accepted: pending.length };
}
