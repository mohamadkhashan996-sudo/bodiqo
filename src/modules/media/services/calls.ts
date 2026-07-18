import type { CallStatus, CallType, PresenceStatus } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { canCall } from "@/modules/users/services/privacy-gate";

const TERMINAL: CallStatus[] = ["ENDED", "DECLINED", "MISSED", "FAILED"];

const ALLOWED: Record<CallStatus, CallStatus[]> = {
  RINGING: ["ACTIVE", "DECLINED", "MISSED", "ENDED", "FAILED"],
  ACTIVE: ["ENDED", "FAILED"],
  DECLINED: [],
  MISSED: [],
  ENDED: [],
  FAILED: [],
};

export async function createCall(
  callerId: string,
  input: { conversationId?: string; calleeIds: string[]; type: CallType },
) {
  const calleeIds = [...new Set(input.calleeIds)].filter(
    (id) => id !== callerId,
  );
  if (!calleeIds.length)
    throw new AppError("Select at least one person to call", 400);
  // P2P mesh/SFU for multi-party is not ready — keep voice/video 1:1.
  if (calleeIds.length > 1) {
    throw new AppError(
      "Group calls aren’t available yet — call one person at a time",
      400,
    );
  }

  const users = await prisma.user.findMany({
    where: { id: { in: calleeIds }, status: "ACTIVE" },
    select: { id: true, presence: true },
  });
  if (users.length !== calleeIds.length)
    throw new AppError("One or more users were not found", 404);

  const busy = users.find((u) => u.presence === "IN_CALL");
  if (busy) throw new AppError("User is busy on another call", 409, "BUSY");

  const permissions = await Promise.all(
    calleeIds.map((id) => canCall(callerId, id)),
  );
  if (permissions.some((allowed) => !allowed))
    throw new AppError("One or more users cannot be called", 403);

  if (input.conversationId) {
    const memberships = await prisma.conversationMember.findMany({
      where: {
        conversationId: input.conversationId,
        userId: { in: [callerId, ...calleeIds] },
        leftAt: null,
      },
      select: { userId: true },
    });
    const memberSet = new Set(memberships.map((m) => m.userId));
    if (!memberSet.has(callerId)) {
      throw new AppError("Conversation not found", 404);
    }
    for (const id of calleeIds) {
      if (!memberSet.has(id)) {
        throw new AppError("Callee is not in this conversation", 403);
      }
    }
  }

  return prisma.call.create({
    data: {
      callerId,
      conversationId: input.conversationId,
      type: input.type,
      participants: {
        create: [
          { userId: callerId, joinedAt: new Date() },
          ...calleeIds.map((userId) => ({ userId })),
        ],
      },
    },
    include: {
      caller: { select: { id: true, handle: true, name: true, image: true } },
      participants: {
        include: {
          user: { select: { id: true, handle: true, name: true, image: true } },
        },
      },
    },
  });
}

export async function updateCallStatus(
  userId: string,
  callId: string,
  status: CallStatus,
) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { callerId: true, status: true },
  });
  if (!call) throw new AppError("Call not found", 404);
  const participant = await prisma.callParticipant.findUnique({
    where: { callId_userId: { callId, userId } },
  });
  if (!participant) throw new AppError("Forbidden", 403);

  if (call.status === status) {
    return prisma.call.findUniqueOrThrow({ where: { id: callId } });
  }
  if (TERMINAL.includes(call.status)) {
    throw new AppError("Call already ended", 400);
  }
  if (!ALLOWED[call.status]?.includes(status)) {
    throw new AppError(`Cannot move call from ${call.status} to ${status}`, 400);
  }

  const now = new Date();
  const data = {
    status,
    ...(status === "ACTIVE" && call.status !== "ACTIVE"
      ? { startedAt: now }
      : {}),
    ...(TERMINAL.includes(status) ? { endedAt: now } : {}),
  };
  return prisma.call.update({ where: { id: callId }, data });
}

export async function setCallPresence(
  userId: string,
  status: Extract<PresenceStatus, "IN_CALL" | "ONLINE" | "OFFLINE">,
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      presence: status,
      ...(status === "OFFLINE" ? { lastSeenAt: new Date() } : {}),
    },
  });
}

export async function markParticipantJoined(callId: string, userId: string) {
  const existing = await prisma.callParticipant.findUnique({
    where: { callId_userId: { callId, userId } },
  });
  if (!existing) throw new AppError("Forbidden", 403);
  return prisma.callParticipant.update({
    where: { id: existing.id },
    data: { joinedAt: new Date(), leftAt: null },
  });
}

export async function addParticipant(
  callId: string,
  userId: string,
  joined = false,
) {
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

export async function listCallHistory(
  userId: string,
  cursor?: string,
  limit = 30,
) {
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
  return {
    calls: calls.map((call) => {
      const durationSec =
        call.startedAt && call.endedAt
          ? Math.max(
              0,
              Math.round(
                (call.endedAt.getTime() - call.startedAt.getTime()) / 1000,
              ),
            )
          : null;
      return { ...call, durationSec };
    }),
    nextCursor,
  };
}
