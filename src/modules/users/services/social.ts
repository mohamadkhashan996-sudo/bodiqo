import { FriendRequestStatus, ReportTarget } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/modules/notifications/services/notify";
import { canFollow } from "@/modules/messaging/services/privacy-gate";

async function assertDistinct(actorId: string, targetId: string) {
  if (actorId === targetId) throw new AppError("You cannot perform this action on yourself", 400);
}

export async function followUser(followerId: string, followingId: string) {
  await assertDistinct(followerId, followingId);
  const target = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true, status: true, isPrivate: true },
  });
  if (!target || target.status !== "ACTIVE") throw new AppError("User not found", 404);
  if (!(await canFollow(followerId, followingId))) {
    throw new AppError("This user is unavailable", 403);
  }
  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: followerId, blockedId: followingId },
        { blockerId: followingId, blockedId: followerId },
      ],
    },
  });
  if (blocked) throw new AppError("This user is unavailable", 403);

  if (target.isPrivate) {
    return sendFriendRequest(followerId, followingId);
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.follow.findUnique({ where: { followerId_followingId: { followerId, followingId } } });
    if (existing) return existing;
    const follow = await tx.follow.create({ data: { followerId, followingId } });
    await tx.user.update({ where: { id: followerId }, data: { followingCount: { increment: 1 } } });
    await tx.user.update({ where: { id: followingId }, data: { followersCount: { increment: 1 } } });
    return follow;
  });
  await createNotification({ userId: followingId, actorId: followerId, type: "FOLLOW" });
  return result;
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
    const existing = await tx.follow.findUnique({ where: { followerId_followingId: { followerId, followingId } } });
    if (!existing) return false;
    await tx.follow.delete({ where: { id: existing.id } });
    await tx.user.update({ where: { id: followerId }, data: { followingCount: { decrement: 1 } } });
    await tx.user.update({ where: { id: followingId }, data: { followersCount: { decrement: 1 } } });
    return true;
  });
  return { deleted };
}

export async function blockUser(blockerId: string, blockedId: string) {
  await assertDistinct(blockerId, blockedId);
  return prisma.$transaction(async (tx) => {
    const block = await tx.block.upsert({ where: { blockerId_blockedId: { blockerId, blockedId } }, create: { blockerId, blockedId }, update: {} });
    const follows = await tx.follow.findMany({ where: { OR: [{ followerId: blockerId, followingId: blockedId }, { followerId: blockedId, followingId: blockerId }] } });
    for (const follow of follows) {
      await tx.follow.delete({ where: { id: follow.id } });
      await tx.user.update({ where: { id: follow.followerId }, data: { followingCount: { decrement: 1 } } });
      await tx.user.update({ where: { id: follow.followingId }, data: { followersCount: { decrement: 1 } } });
    }
    return block;
  });
}
export async function unblockUser(blockerId: string, blockedId: string) {
  return prisma.block.deleteMany({ where: { blockerId, blockedId } });
}
export async function muteUser(muterId: string, mutedId: string) {
  await assertDistinct(muterId, mutedId);
  return prisma.mute.upsert({ where: { muterId_mutedId: { muterId, mutedId } }, create: { muterId, mutedId }, update: {} });
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
  category?: import("@prisma/client").ReportCategory,
) {
  const inferred =
    category ??
    (/spam/i.test(reason)
      ? "SPAM"
      : /scam|phish/i.test(reason)
        ? "SCAM"
        : /harass|bully/i.test(reason)
          ? "HARASSMENT"
          : /copyright|dmca/i.test(reason)
            ? "COPYRIGHT"
            : /fake/i.test(reason)
              ? "FAKE_ACCOUNT"
              : "OTHER");
  return prisma.report.create({
    data: {
      reporterId,
      targetType,
      targetId,
      reason,
      details,
      category: inferred,
    },
  });
}

export async function sendFriendRequest(fromUserId: string, toUserId: string) {
  await assertDistinct(fromUserId, toUserId);
  const request = await prisma.friendRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    create: { fromUserId, toUserId },
    update: { status: "PENDING" },
  });
  await createNotification({ userId: toUserId, actorId: fromUserId, type: "FRIEND_REQUEST" });
  return request;
}
export async function respondFriendRequest(userId: string, requestId: string, status: Extract<FriendRequestStatus, "ACCEPTED" | "DECLINED" | "CANCELLED">) {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("Friend request not found", 404);
  if (request.toUserId !== userId && request.fromUserId !== userId) throw new AppError("Forbidden", 403);
  if (status === "CANCELLED" && request.fromUserId !== userId) throw new AppError("Forbidden", 403);
  if (status !== "CANCELLED" && request.toUserId !== userId) throw new AppError("Forbidden", 403);

  if (status === "ACCEPTED") {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.friendRequest.update({
        where: { id: requestId },
        data: { status },
      });
      const existing = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: request.fromUserId,
            followingId: request.toUserId,
          },
        },
      });
      if (!existing) {
        await tx.follow.create({
          data: { followerId: request.fromUserId, followingId: request.toUserId },
        });
        await tx.user.update({
          where: { id: request.fromUserId },
          data: { followingCount: { increment: 1 } },
        });
        await tx.user.update({
          where: { id: request.toUserId },
          data: { followersCount: { increment: 1 } },
        });
      }
      return updated;
    });
  }

  return prisma.friendRequest.update({ where: { id: requestId }, data: { status } });
}
