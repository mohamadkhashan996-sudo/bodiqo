import { ConversationType } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { canMessage, canSeeOnlineStatus } from "./privacy-gate";

const memberSelect = {
  id: true, userId: true, role: true, isPinned: true, isMuted: true, isArchived: true,
  isFavorite: true, unreadCount: true, lastReadAt: true, leftAt: true,
  user: { select: { id: true, handle: true, name: true, displayName: true, image: true, presence: true, lastSeenAt: true } },
} as const;
const messageInclude = {
  sender: { select: { id: true, handle: true, name: true, image: true } },
  reactions: { include: { user: { select: { id: true, handle: true } } } },
} as const;

type MemberWithUser = {
  userId: string;
  user: {
    id: string;
    handle?: string | null;
    name?: string | null;
    displayName?: string | null;
    image?: string | null;
    presence: string;
    lastSeenAt: Date | null;
  };
};

async function maskPresenceForViewer<T extends MemberWithUser>(
  viewerId: string,
  members: T[],
): Promise<T[]> {
  return Promise.all(
    members.map(async (member) => {
      if (member.userId === viewerId) return member;
      const allowed = await canSeeOnlineStatus(viewerId, member.userId);
      if (allowed) return member;
      return {
        ...member,
        user: {
          ...member.user,
          presence: "OFFLINE",
          lastSeenAt: null,
        },
      };
    }),
  );
}

export async function assertConversationMember(userId: string, conversationId: string) {
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!membership || membership.leftAt) throw new AppError("Conversation not found", 404);
  return membership;
}

export async function listConversations(userId: string, cursor?: string, limit = 30) {
  const take = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.conversationMember.findMany({
    where: { userId, leftAt: null, isArchived: false },
    include: {
      conversation: {
        include: {
          members: { where: { leftAt: null }, select: memberSelect },
          messages: { where: { deletedForAll: false }, orderBy: { createdAt: "desc" }, take: 1, include: messageInclude },
        },
      },
    },
    orderBy: [{ isPinned: "desc" }, { conversation: { lastMessageAt: "desc" } }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor = rows.length > take ? rows.pop()!.id : null;
  const conversations = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      conversation: {
        ...row.conversation,
        members: await maskPresenceForViewer(
          userId,
          row.conversation.members as MemberWithUser[],
        ),
      },
    })),
  );
  return { conversations, nextCursor };
}

export async function getConversation(userId: string, conversationId: string) {
  await assertConversationMember(userId, conversationId);
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      members: {
        where: { leftAt: null },
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              name: true,
              displayName: true,
              image: true,
              presence: true,
              lastSeenAt: true,
            },
          },
        },
      },
    },
  });
  if (!conversation) throw new AppError("Conversation not found", 404);
  return {
    ...conversation,
    members: await maskPresenceForViewer(
      userId,
      conversation.members as MemberWithUser[],
    ),
  };
}

export async function getOrCreateDirect(userId: string, otherUserId: string) {
  if (userId === otherUserId) throw new AppError("You cannot message yourself", 400);
  const target = await prisma.user.findUnique({ where: { id: otherUserId }, select: { id: true, status: true } });
  if (!target || target.status !== "ACTIVE") throw new AppError("User not found", 404);
  if (!(await canMessage(userId, otherUserId))) throw new AppError("This user is unavailable", 403);
  const existing = await prisma.conversation.findFirst({
    where: {
      type: ConversationType.DIRECT,
      members: { every: { userId: { in: [userId, otherUserId] }, leftAt: null } },
      AND: [
        { members: { some: { userId, leftAt: null } } },
        { members: { some: { userId: otherUserId, leftAt: null } } },
      ],
    },
    include: { members: { select: memberSelect } },
  });
  if (existing && existing.members.length === 2) return existing;
  return prisma.conversation.create({
    data: { type: ConversationType.DIRECT, members: { create: [{ userId }, { userId: otherUserId }] } },
    include: { members: { select: memberSelect } },
  });
}

export async function createGroup(ownerId: string, input: { title: string; memberIds: string[]; image?: string; description?: string }) {
  const memberIds = [...new Set([ownerId, ...input.memberIds])];
  if (memberIds.length < 2) throw new AppError("A group needs at least two members", 400);
  const users = await prisma.user.count({ where: { id: { in: memberIds }, status: "ACTIVE" } });
  if (users !== memberIds.length) throw new AppError("One or more users were not found", 404);
  const allowed = await Promise.all(memberIds.filter((id) => id !== ownerId).map((id) => canMessage(ownerId, id)));
  if (allowed.some((value) => !value)) throw new AppError("One or more users cannot be messaged", 403);
  return prisma.conversation.create({
    data: {
      type: ConversationType.GROUP, title: input.title, image: input.image, description: input.description,
      members: { create: memberIds.map((userId) => ({ userId, role: userId === ownerId ? "OWNER" : "MEMBER" })) },
    },
    include: { members: { select: memberSelect } },
  });
}

export async function updateMemberFlags(userId: string, conversationId: string, flags: { isPinned?: boolean; isMuted?: boolean; isArchived?: boolean; isFavorite?: boolean; draftText?: string | null }) {
  await assertConversationMember(userId, conversationId);
  return prisma.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: flags });
}

export async function leaveConversation(userId: string, conversationId: string) {
  const membership = await assertConversationMember(userId, conversationId);
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { type: true } });
  if (conversation?.type === "DIRECT") return updateMemberFlags(userId, conversationId, { isArchived: true });
  return prisma.conversationMember.update({ where: { id: membership.id }, data: { leftAt: new Date(), isArchived: true } });
}

export async function addConversationMembers(actorId: string, conversationId: string, userIds: string[]) {
  const actor = await assertConversationMember(actorId, conversationId);
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") throw new AppError("Forbidden", 403);
  const ids = [...new Set(userIds)].filter((id) => id !== actorId);
  const users = await prisma.user.count({ where: { id: { in: ids }, status: "ACTIVE" } });
  if (users !== ids.length) throw new AppError("One or more users were not found", 404);
  await Promise.all(ids.map((userId) => prisma.conversationMember.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId },
    update: { leftAt: null, isArchived: false },
  })));
  return prisma.conversationMember.findMany({ where: { conversationId, userId: { in: ids } }, select: memberSelect });
}

export async function removeConversationMember(actorId: string, conversationId: string, memberId: string) {
  const actor = await assertConversationMember(actorId, conversationId);
  if (actorId !== memberId && actor.role !== "OWNER" && actor.role !== "ADMIN") throw new AppError("Forbidden", 403);
  return prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: memberId } },
    data: { leftAt: new Date(), isArchived: true },
  });
}

export async function searchConversations(userId: string, query: string) {
  const { conversations } = await listConversations(userId, undefined, 50);
  const q = query.trim().toLowerCase();
  return conversations.filter(({ conversation }) =>
    conversation.title?.toLowerCase().includes(q) ||
    conversation.members.some((member) =>
      member.userId !== userId &&
      [member.user.handle, member.user.name, member.user.displayName].some((value) => value?.toLowerCase().includes(q)),
    ),
  );
}
