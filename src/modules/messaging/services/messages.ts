import type { MessageType } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { assertContentSafe } from "@/lib/ai-content-gate";
import { AppError } from "@/lib/errors";
import { assertOwnedReadyAsset } from "@/lib/media-asset";
import { prisma } from "@/lib/prisma";

import {
  acceptMessageRequest,
  assertConversationMember,
} from "./conversations";

const include = {
  sender: {
    select: {
      id: true,
      handle: true,
      name: true,
      displayName: true,
      image: true,
    },
  },
  replyTo: {
    include: { sender: { select: { id: true, handle: true, name: true } } },
  },
  reactions: {
    include: { user: { select: { id: true, handle: true, name: true } } },
  },
} as const;

export type SendMessageInput = {
  type: MessageType;
  body: string;
  mediaUrl?: string;
  replyToId?: string;
  mediaMeta?: Prisma.InputJsonValue;
  linkPreview?: Prisma.InputJsonValue;
  isEncrypted?: boolean;
  ciphertext?: string;
  nonce?: string;
  senderEphemeralKey?: string;
  forwardedFromId?: string;
};

/** Block/restrict must always stop sends; reply to a request auto-accepts. */
async function assertMessagingAllowed(
  senderId: string,
  conversationId: string,
) {
  const membership = await assertConversationMember(senderId, conversationId);
  if (membership.isRequest) {
    await acceptMessageRequest(senderId, conversationId);
  }

  const peers = await prisma.conversationMember.findMany({
    where: {
      conversationId,
      leftAt: null,
      userId: { not: senderId },
    },
    select: { userId: true },
  });
  if (!peers.length) return;

  const peerIds = peers.map((p) => p.userId);
  const [blocks, restricts] = await Promise.all([
    prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: { in: peerIds } },
          { blockedId: senderId, blockerId: { in: peerIds } },
        ],
      },
      select: { id: true },
    }),
    prisma.restrict.findFirst({
      where: {
        OR: [
          { restrictorId: { in: peerIds }, restrictedId: senderId },
          { restrictorId: senderId, restrictedId: { in: peerIds } },
        ],
      },
      select: { id: true },
    }),
  ]);
  if (blocks || restricts) {
    throw new AppError("This conversation is unavailable", 403);
  }
}

export async function sendMessage(
  senderId: string,
  conversationId: string,
  input: SendMessageInput,
) {
  await assertMessagingAllowed(senderId, conversationId);
  const hasCipher = Boolean(
    input.isEncrypted && input.ciphertext && input.nonce,
  );
  if (!input.body.trim() && !input.mediaUrl && !hasCipher) {
    throw new AppError("A message needs text or media", 400);
  }
  if (!hasCipher && input.body.trim()) {
    assertContentSafe(input.body, "Message");
  }
  if (input.replyToId) {
    const reply = await prisma.message.findFirst({
      where: { id: input.replyToId, conversationId },
      select: { id: true },
    });
    if (!reply) throw new AppError("Reply message not found", 404);
  }
  if (input.mediaUrl) {
    await assertOwnedReadyAsset(senderId, input.mediaUrl);
  }
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        type: input.type,
        body: hasCipher ? "" : input.body.trim(),
        mediaUrl: input.mediaUrl,
        replyToId: input.replyToId,
        forwardedFromId: input.forwardedFromId,
        mediaMeta: input.mediaMeta,
        linkPreview: input.linkPreview,
        isEncrypted: Boolean(input.isEncrypted),
        ciphertext: input.ciphertext,
        nonce: input.nonce,
        senderEphemeralKey: input.senderEphemeralKey,
        senderId,
        conversationId,
      },
      include,
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });
    await tx.conversationMember.updateMany({
      where: { conversationId, userId: { not: senderId }, leftAt: null },
      data: { unreadCount: { increment: 1 } },
    });
    return message;
  });
}

export async function editMessage(
  userId: string,
  messageId: string,
  body: string,
  crypto?: {
    ciphertext: string;
    nonce: string;
    senderEphemeralKey?: string;
  },
) {
  if (!body.trim() && !crypto?.ciphertext) {
    throw new AppError("Message body cannot be empty", 400);
  }
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      senderId: true,
      deletedForAll: true,
      isEncrypted: true,
      conversationId: true,
    },
  });
  if (!message || message.deletedForAll)
    throw new AppError("Message not found", 404);
  if (message.senderId !== userId) throw new AppError("Forbidden", 403);

  if (message.isEncrypted) {
    if (!crypto?.ciphertext || !crypto.nonce) {
      throw new AppError("Encrypted messages must be re-encrypted to edit", 400);
    }
    return prisma.message.update({
      where: { id: messageId },
      data: {
        body: "",
        isEdited: true,
        editedAt: new Date(),
        ciphertext: crypto.ciphertext,
        nonce: crypto.nonce,
        senderEphemeralKey: crypto.senderEphemeralKey,
        isEncrypted: true,
      },
      include,
    });
  }

  assertContentSafe(body, "Message");
  return prisma.message.update({
    where: { id: messageId },
    data: { body: body.trim(), isEdited: true, editedAt: new Date() },
    include,
  });
}

export async function deleteMessage(
  userId: string,
  messageId: string,
  forEveryone = false,
) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, conversationId: true },
  });
  if (!message) throw new AppError("Message not found", 404);
  await assertConversationMember(userId, message.conversationId);
  if (forEveryone) {
    if (message.senderId !== userId) throw new AppError("Forbidden", 403);
    return prisma.message.update({
      where: { id: messageId },
      data: {
        deletedForAll: true,
        body: "",
        mediaUrl: null,
        mediaMeta: Prisma.JsonNull,
        linkPreview: Prisma.JsonNull,
        ciphertext: null,
        nonce: null,
        senderEphemeralKey: null,
        isEncrypted: false,
      },
    });
  }
  return prisma.messageHide.upsert({
    where: { messageId_userId: { messageId, userId } },
    create: { messageId, userId },
    update: {},
  });
}

export async function forwardMessage(
  userId: string,
  messageId: string,
  toConversationId: string,
) {
  const original = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      conversationId: true,
      type: true,
      body: true,
      mediaUrl: true,
      mediaMeta: true,
      linkPreview: true,
      deletedForAll: true,
      isEncrypted: true,
    },
  });
  if (!original || original.deletedForAll) {
    throw new AppError("Message not found", 404);
  }
  await assertConversationMember(userId, original.conversationId);
  if (original.isEncrypted) {
    throw new AppError("Encrypted messages cannot be forwarded", 400);
  }
  return sendMessage(userId, toConversationId, {
    type: original.type,
    body: original.body,
    mediaUrl: original.mediaUrl ?? undefined,
    mediaMeta: (original.mediaMeta as Prisma.InputJsonValue) ?? undefined,
    linkPreview: (original.linkPreview as Prisma.InputJsonValue) ?? undefined,
    forwardedFromId: original.id,
  });
}

export async function reactMessage(
  userId: string,
  messageId: string,
  emoji: string,
  remove = false,
) {
  if (!emoji.trim() || emoji.length > 32)
    throw new AppError("Invalid reaction", 400);
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });
  if (!message) throw new AppError("Message not found", 404);
  await assertConversationMember(userId, message.conversationId);
  if (remove)
    return prisma.messageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
  return prisma.messageReaction.upsert({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
    create: { messageId, userId, emoji },
    update: {},
  });
}

export async function listMessages(
  userId: string,
  conversationId: string,
  cursor?: string,
  limit = 50,
) {
  await assertConversationMember(userId, conversationId);
  const take = Math.min(Math.max(limit, 1), 100);
  const messages = await prisma.message.findMany({
    where: { conversationId, hides: { none: { userId } } },
    include,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor = messages.length > take ? messages.pop()!.id : null;
  return { messages: messages.reverse(), nextCursor };
}

export async function markSeen(
  userId: string,
  conversationId: string,
  messageId?: string,
) {
  await assertConversationMember(userId, conversationId);
  const { shouldShowReadReceipts } = await import("./privacy-gate");
  const now = new Date();
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: now, unreadCount: 0 },
  });

  if (!(await shouldShowReadReceipts(userId))) {
    return { broadcast: false };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true },
  });
  if (conversation?.type !== "DIRECT") {
    return { broadcast: false };
  }

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      ...(messageId ? { id: messageId } : {}),
      delivery: { not: "SEEN" },
    },
    data: { delivery: "SEEN" },
  });
  return { broadcast: true };
}

export async function markDelivered(
  userId: string,
  conversationId: string,
  messageId?: string,
) {
  await assertConversationMember(userId, conversationId);
  return prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      ...(messageId ? { id: messageId } : {}),
      delivery: "SENT",
    },
    data: { delivery: "DELIVERED" },
  });
}

export async function searchMessages(
  userId: string,
  query: string,
  conversationId?: string,
) {
  const q = query.trim();
  if (!q) return [];
  if (conversationId) await assertConversationMember(userId, conversationId);
  return prisma.message.findMany({
    where: {
      body: { contains: q, mode: "insensitive" },
      deletedForAll: false,
      isEncrypted: false,
      ...(conversationId
        ? { conversationId }
        : { conversation: { members: { some: { userId, leftAt: null } } } }),
      hides: { none: { userId } },
    },
    include,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
