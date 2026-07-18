import type { ShareChannel as PrismaShareChannel } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getOrCreateDirect } from "@/modules/messaging/services/conversations";
import { sendMessage } from "@/modules/messaging/services/messages";
import {
  assertCanInteractWithPost,
  canViewPostContent,
} from "@/modules/users/services/visibility";

/** Dedupe window: same user + post won't inflate shareCount again within this period. */
const SHARE_DEDUPE_MS = 6 * 60 * 60 * 1000;

export type ShareChannelInput =
  | "COPY"
  | "NATIVE"
  | "WHATSAPP"
  | "TELEGRAM"
  | "FACEBOOK"
  | "X"
  | "EMAIL"
  | "LINKEDIN"
  | "QR"
  | "EMBED"
  | "INTERNAL"
  | "OTHER";

const CHANNELS = new Set<string>([
  "COPY",
  "NATIVE",
  "WHATSAPP",
  "TELEGRAM",
  "FACEBOOK",
  "X",
  "EMAIL",
  "LINKEDIN",
  "QR",
  "EMBED",
  "INTERNAL",
  "OTHER",
]);

export function normalizeShareChannel(
  raw?: string | null,
): PrismaShareChannel {
  const key = (raw ?? "OTHER").toUpperCase();
  if (CHANNELS.has(key)) return key as PrismaShareChannel;
  return "OTHER";
}

export async function sharePost(
  postId: string,
  viewerId: string | undefined,
  channelInput?: string | null,
) {
  await assertCanInteractWithPost(viewerId, postId, {
    requireAuth: false,
  });
  const channel = normalizeShareChannel(channelInput);

  return prisma.$transaction(async (tx) => {
    let counted = true;
    if (viewerId) {
      const recent = await tx.postShare.findFirst({
        where: {
          postId,
          userId: viewerId,
          counted: true,
          createdAt: { gte: new Date(Date.now() - SHARE_DEDUPE_MS) },
        },
        select: { id: true },
      });
      if (recent) counted = false;
    }

    await tx.postShare.create({
      data: {
        postId,
        userId: viewerId ?? null,
        channel,
        counted,
      },
    });

    if (!counted) {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { id: true, shareCount: true },
      });
      return {
        id: postId,
        shareCount: post?.shareCount ?? 0,
        counted: false,
        channel,
      };
    }

    const updated = await tx.post.update({
      where: { id: postId },
      data: { shareCount: { increment: 1 } },
      select: { id: true, shareCount: true },
    });
    return { ...updated, counted: true, channel };
  });
}

/** Share a post into a direct conversation (internal). */
export async function sharePostInternally(
  senderId: string,
  postId: string,
  recipientId: string,
) {
  if (senderId === recipientId) {
    throw new AppError("Pick someone else to share with", 400);
  }

  const post = await assertCanInteractWithPost(senderId, postId);
  const allowedForRecipient = await canViewPostContent(
    recipientId,
    post.author,
    post.visibility,
  );
  if (!allowedForRecipient) {
    throw new AppError(
      "That person can’t view this post, so it can’t be shared with them",
      403,
    );
  }

  const detail = await prisma.post.findUnique({
    where: { id: postId },
    select: { body: true },
  });
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  const url = `${origin.replace(/\/$/, "")}/post/${postId}`;
  const excerpt = (detail?.body || "Shared a post on Relune").slice(0, 180);
  const conversation = await getOrCreateDirect(senderId, recipientId);
  const message = await sendMessage(senderId, conversation.id, {
    type: "LINK",
    body: `${excerpt}\n${url}`,
    linkPreview: {
      url,
      title: "Post on Relune",
      description: excerpt,
      postId,
    },
  });

  const share = await sharePost(postId, senderId, "INTERNAL");
  await prisma.postShare.updateMany({
    where: {
      postId,
      userId: senderId,
      channel: "INTERNAL",
      createdAt: { gte: new Date(Date.now() - 10_000) },
    },
    data: { targetUserId: recipientId },
  });

  return {
    conversationId: conversation.id,
    message,
    shareCount: share.shareCount,
    counted: share.counted,
  };
}

export async function getPostShareStats(postId: string) {
  const [byChannel, totalEvents, countedEvents] = await Promise.all([
    prisma.postShare.groupBy({
      by: ["channel"],
      where: { postId },
      _count: { _all: true },
    }),
    prisma.postShare.count({ where: { postId } }),
    prisma.postShare.count({ where: { postId, counted: true } }),
  ]);
  return {
    totalEvents,
    countedEvents,
    byChannel: Object.fromEntries(
      byChannel.map((row) => [row.channel, row._count._all]),
    ),
  };
}
