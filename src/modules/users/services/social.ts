import { FriendRequestStatus, ReportCategory, ReportTarget } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { scoreContentModeration } from "@/modules/ai/services/intelligence";
import { createNotification } from "@/modules/notifications/services/notify";
import { canFollow } from "@/modules/messaging/services/privacy-gate";

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
  if (already) return { status: "following" as const };

  if (target.isPrivate) {
    await sendFriendRequest(followerId, followingId);
    return { status: "requested" as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.follow.create({ data: { followerId, followingId } });
    await tx.user.update({
      where: { id: followerId },
      data: { followingCount: { increment: 1 } },
    });
    await tx.user.update({
      where: { id: followingId },
      data: { followersCount: { increment: 1 } },
    });
  });
  await createNotification({
    userId: followingId,
    actorId: followerId,
    type: "FOLLOW",
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
    return true;
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
    const comment = await prisma.comment.findUnique({
      where: { id: targetId },
      select: { body: true },
    });
    contentText = [comment?.body, details].filter(Boolean).join("\n");
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
        : ai.categories.includes("HARASSMENT") || /harass|bully|toxic/i.test(reason)
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

export async function sendFriendRequest(fromUserId: string, toUserId: string) {
  await assertDistinct(fromUserId, toUserId);
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

  const alreadyFollowing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: fromUserId, followingId: toUserId },
    },
    select: { id: true },
  });
  if (alreadyFollowing) return alreadyFollowing;

  const existingRequest = await prisma.friendRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    select: { id: true, status: true },
  });

  const request = await prisma.friendRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    create: { fromUserId, toUserId },
    update: { status: "PENDING" },
  });

  if (!existingRequest || existingRequest.status !== "PENDING") {
    await createNotification({
      userId: toUserId,
      actorId: fromUserId,
      type: "FRIEND_REQUEST",
    });
  }
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
  if (!request) throw new AppError("Friend request not found", 404);
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
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.friendRequest.update({
        where: { id: requestId },
        data: { status },
      });

      // Create mutual follows so accept becomes a friendship.
      for (const [followerId, followingId] of [
        [request.fromUserId, request.toUserId],
        [request.toUserId, request.fromUserId],
      ] as const) {
        const existing = await tx.follow.findUnique({
          where: {
            followerId_followingId: { followerId, followingId },
          },
        });
        if (existing) continue;
        await tx.follow.create({ data: { followerId, followingId } });
        await tx.user.update({
          where: { id: followerId },
          data: { followingCount: { increment: 1 } },
        });
        await tx.user.update({
          where: { id: followingId },
          data: { followersCount: { increment: 1 } },
        });
      }

      // Clear any reverse pending request between the same pair.
      await tx.friendRequest.updateMany({
        where: {
          fromUserId: request.toUserId,
          toUserId: request.fromUserId,
          status: "PENDING",
        },
        data: { status: "ACCEPTED" },
      });

      return next;
    });
    await createNotification({
      userId: request.fromUserId,
      actorId: request.toUserId,
      type: "FOLLOW",
    });
    return updated;
  }

  return prisma.friendRequest.update({
    where: { id: requestId },
    data: { status },
  });
}
