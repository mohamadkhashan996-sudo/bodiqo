import { CallStatus, CallType } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { canCall } from "@/modules/messaging/services/privacy-gate";

export async function createCall(callerId: string, input: { conversationId?: string; calleeIds: string[]; type: CallType }) {
  const calleeIds = [...new Set(input.calleeIds)].filter((id) => id !== callerId);
  if (!calleeIds.length) throw new AppError("Select at least one person to call", 400);
  const users = await prisma.user.count({ where: { id: { in: calleeIds }, status: "ACTIVE" } });
  if (users !== calleeIds.length) throw new AppError("One or more users were not found", 404);
  const permissions = await Promise.all(calleeIds.map((id) => canCall(callerId, id)));
  if (permissions.some((allowed) => !allowed)) throw new AppError("One or more users cannot be called", 403);
  if (input.conversationId) {
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: input.conversationId, userId: callerId } } });
    if (!membership || membership.leftAt) throw new AppError("Conversation not found", 404);
  }
  return prisma.call.create({
    data: {
      callerId, conversationId: input.conversationId, type: input.type,
      participants: { create: [{ userId: callerId, joinedAt: new Date() }, ...calleeIds.map((userId) => ({ userId }))] },
    },
    include: { caller: { select: { id: true, handle: true, name: true, image: true } }, participants: { include: { user: { select: { id: true, handle: true, name: true, image: true } } } } },
  });
}

export async function updateCallStatus(userId: string, callId: string, status: CallStatus) {
  const call = await prisma.call.findUnique({ where: { id: callId }, select: { callerId: true, status: true } });
  if (!call) throw new AppError("Call not found", 404);
  const participant = await prisma.callParticipant.findUnique({ where: { callId_userId: { callId, userId } } });
  if (!participant) throw new AppError("Forbidden", 403);
  const now = new Date();
  const data = {
    status,
    ...(status === "ACTIVE" && !call.status.includes("ACTIVE") ? { startedAt: now } : {}),
    ...(status === "ENDED" || status === "DECLINED" || status === "MISSED" || status === "FAILED" ? { endedAt: now } : {}),
  };
  return prisma.call.update({ where: { id: callId }, data });
}

export async function addParticipant(callId: string, userId: string, joined = false) {
  return prisma.callParticipant.upsert({
    where: { callId_userId: { callId, userId } },
    create: { callId, userId, ...(joined ? { joinedAt: new Date() } : {}) },
    update: joined ? { joinedAt: new Date(), leftAt: null } : {},
  });
}

export async function updateParticipantMedia(
  userId: string,
  callId: string,
  flags: { muted?: boolean; cameraOff?: boolean },
) {
  const participant = await prisma.callParticipant.findUnique({
    where: { callId_userId: { callId, userId } },
  });
  if (!participant) throw new AppError("Forbidden", 403);
  return prisma.callParticipant.update({
    where: { id: participant.id },
    data: flags,
  });
}

export async function listCallParticipants(callId: string) {
  return prisma.callParticipant.findMany({
    where: { callId },
    select: { userId: true },
  });
}

export async function listCallHistory(userId: string, cursor?: string, limit = 30) {
  const take = Math.min(Math.max(limit, 1), 50);
  const calls = await prisma.call.findMany({
    where: { participants: { some: { userId } } },
    include: {
      caller: { select: { id: true, handle: true, name: true, image: true } },
      participants: {
        include: {
          user: { select: { id: true, handle: true, name: true, image: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor = calls.length > take ? calls.pop()!.id : null;
  return { calls, nextCursor };
}

