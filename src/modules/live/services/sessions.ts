import { AppError } from "@/lib/errors";
import { assertOptionalOwnedMedia } from "@/lib/media-asset";
import { prisma } from "@/lib/prisma";
import { getIo } from "@/lib/socket";
import { createNotification } from "@/modules/notifications/services/notify";

const hostSelect = {
  id: true,
  handle: true,
  name: true,
  displayName: true,
  image: true,
  isVerified: true,
} as const;

export async function listLiveSessions(limit = 30) {
  const take = Math.min(Math.max(limit, 1), 50);
  return prisma.liveSession.findMany({
    where: { status: "LIVE" },
    include: {
      host: { select: hostSelect },
      _count: { select: { gifts: true } },
    },
    orderBy: [{ viewerCount: "desc" }, { startedAt: "desc" }],
    take,
  });
}

export async function getLiveSession(id: string) {
  const session = await prisma.liveSession.findUnique({
    where: { id },
    include: {
      host: { select: hostSelect },
      moderators: {
        include: {
          user: { select: hostSelect },
        },
      },
    },
  });
  if (!session) throw new AppError("Live session not found", 404);
  return session;
}

export async function startLiveSession(
  hostId: string,
  input: { title: string; coverUrl?: string },
) {
  const title = input.title.trim();
  if (title.length < 2) throw new AppError("Title is too short", 400);
  if (title.length > 120) throw new AppError("Title is too long", 400);
  if (input.coverUrl) {
    await assertOptionalOwnedMedia(hostId, input.coverUrl, {
      kinds: ["IMAGE", "GIF"],
    });
  }

  const existing = await prisma.liveSession.findFirst({
    where: { hostId, status: "LIVE" },
    select: { id: true },
  });
  if (existing) throw new AppError("You already have a live session", 409);

  const session = await prisma.liveSession.create({
    data: {
      hostId,
      title,
      coverUrl: input.coverUrl || null,
      status: "LIVE",
    },
    include: {
      host: { select: hostSelect },
      moderators: { include: { user: { select: hostSelect } } },
    },
  });

  // Notify a sample of followers (bounded fanout)
  const followers = await prisma.follow.findMany({
    where: { followingId: hostId },
    select: { followerId: true },
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  const href = `/live/${session.id}`;
  const name =
    session.host.displayName ??
    session.host.name ??
    session.host.handle ??
    "Someone";
  void Promise.all(
    followers.map((f) =>
      createNotification({
        userId: f.followerId,
        actorId: hostId,
        type: "LIVE_STARTED",
        body: `${name} is live: ${title}`,
        href,
      }).catch(() => undefined),
    ),
  );

  getIo()?.emit("live:started", {
    session: {
      id: session.id,
      title: session.title,
      coverUrl: session.coverUrl,
      viewerCount: 0,
      host: session.host,
    },
  });

  return session;
}

export async function endLiveSession(userId: string, sessionId: string) {
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { id: true, hostId: true, status: true },
  });
  if (!session) throw new AppError("Live session not found", 404);
  if (session.hostId !== userId) {
    const mod = await prisma.liveModerator.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (!mod) throw new AppError("Forbidden", 403);
  }
  if (session.status !== "LIVE") return getLiveSession(sessionId);

  const ended = await prisma.liveSession.update({
    where: { id: sessionId },
    data: { status: "ENDED", endedAt: new Date(), viewerCount: 0 },
    include: {
      host: { select: hostSelect },
      moderators: { include: { user: { select: hostSelect } } },
    },
  });
  getIo()?.to(`live:${sessionId}`).emit("live:ended", { sessionId });
  getIo()?.emit("live:ended", { sessionId });
  return ended;
}

export async function updateViewerCount(sessionId: string, count: number) {
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { status: true, peakViewers: true },
  });
  if (!session || session.status !== "LIVE") return null;
  const peak = Math.max(session.peakViewers, count);
  const updated = await prisma.liveSession.update({
    where: { id: sessionId },
    data: { viewerCount: count, peakViewers: peak },
    select: { id: true, viewerCount: true, peakViewers: true },
  });
  getIo()?.to(`live:${sessionId}`).emit("live:viewers", {
    sessionId,
    viewerCount: updated.viewerCount,
    peakViewers: updated.peakViewers,
  });
  return updated;
}

export async function assertCanModerate(userId: string, sessionId: string) {
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: {
      hostId: true,
      status: true,
      mutedUserIds: true,
      blockedUserIds: true,
      pinnedMessageId: true,
    },
  });
  if (!session) throw new AppError("Live session not found", 404);
  if (session.hostId === userId) return { session, role: "HOST" as const };
  const mod = await prisma.liveModerator.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  if (!mod) throw new AppError("Forbidden", 403);
  return { session, role: "MOD" as const };
}

/** Join gate: blocked from this live or platform-blocked with host. */
export async function assertCanJoinLive(userId: string, sessionId: string) {
  const session = await prisma.liveSession.findFirst({
    where: { id: sessionId, status: "LIVE" },
    select: { id: true, hostId: true, blockedUserIds: true },
  });
  if (!session) throw new AppError("Live session not found", 404);
  if (session.blockedUserIds.includes(userId)) {
    throw new AppError("You cannot join this live", 403);
  }
  if (userId !== session.hostId) {
    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: session.hostId, blockedId: userId },
          { blockerId: userId, blockedId: session.hostId },
        ],
      },
      select: { id: true },
    });
    if (blocked) throw new AppError("You cannot join this live", 403);
  }
  return session;
}

export async function addModerator(
  actorId: string,
  sessionId: string,
  userId: string,
) {
  const { session } = await assertCanModerate(actorId, sessionId);
  if (session.hostId !== actorId)
    throw new AppError("Only the host can add moderators", 403);
  if (userId === actorId)
    throw new AppError("Host is already a moderator", 400);
  const user = await prisma.user.findFirst({
    where: { id: userId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!user) throw new AppError("User not found", 404);
  const mod = await prisma.liveModerator.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId },
    update: {},
    include: { user: { select: hostSelect } },
  });
  getIo()?.to(`live:${sessionId}`).emit("live:moderator", {
    sessionId,
    action: "added",
    moderator: mod.user,
  });
  return mod;
}

export async function removeModerator(
  actorId: string,
  sessionId: string,
  userId: string,
) {
  const { session } = await assertCanModerate(actorId, sessionId);
  if (session.hostId !== actorId)
    throw new AppError("Only the host can remove moderators", 403);
  await prisma.liveModerator.deleteMany({ where: { sessionId, userId } });
  getIo()?.to(`live:${sessionId}`).emit("live:moderator", {
    sessionId,
    action: "removed",
    userId,
  });
  return { ok: true };
}

export async function muteViewer(
  actorId: string,
  sessionId: string,
  targetUserId: string,
  muted: boolean,
) {
  const { session } = await assertCanModerate(actorId, sessionId);
  if (targetUserId === session.hostId) {
    throw new AppError("Cannot mute the host", 400);
  }
  const mutedIds = new Set(session.mutedUserIds);
  if (muted) mutedIds.add(targetUserId);
  else mutedIds.delete(targetUserId);
  const updated = await prisma.liveSession.update({
    where: { id: sessionId },
    data: { mutedUserIds: [...mutedIds] },
    select: { mutedUserIds: true },
  });
  getIo()?.to(`live:${sessionId}`).emit("live:mute", {
    sessionId,
    userId: targetUserId,
    muted,
  });
  return updated;
}

export async function postLiveChat(
  userId: string,
  sessionId: string,
  body: string,
) {
  const text = body.trim();
  if (!text) throw new AppError("Message cannot be empty", 400);
  if (text.length > 280) throw new AppError("Message is too long", 400);

  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { status: true, mutedUserIds: true, hostId: true },
  });
  if (!session || session.status !== "LIVE") {
    throw new AppError("Live session is not active", 404);
  }
  if (session.mutedUserIds.includes(userId) && userId !== session.hostId) {
    throw new AppError("You are muted in this live", 403);
  }

  const message = await prisma.liveChatMessage.create({
    data: { sessionId, userId, body: text },
    include: {
      user: { select: hostSelect },
    },
  });
  getIo()?.to(`live:${sessionId}`).emit("live:chat", { message });
  return message;
}

export async function deleteLiveChat(
  actorId: string,
  sessionId: string,
  messageId: string,
) {
  await assertCanModerate(actorId, sessionId);
  const message = await prisma.liveChatMessage.findFirst({
    where: { id: messageId, sessionId },
  });
  if (!message) throw new AppError("Message not found", 404);
  await prisma.liveChatMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date(), body: "" },
  });
  getIo()?.to(`live:${sessionId}`).emit("live:chat:deleted", {
    sessionId,
    messageId,
  });
  return { ok: true };
}

export async function listLiveChat(sessionId: string, limit = 50) {
  return prisma.liveChatMessage
    .findMany({
      where: { sessionId, deletedAt: null },
      include: { user: { select: hostSelect } },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
    })
    .then((rows) => rows.reverse());
}

export async function getPinnedLiveChat(sessionId: string) {
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { pinnedMessageId: true },
  });
  if (!session?.pinnedMessageId) return null;
  return prisma.liveChatMessage.findFirst({
    where: {
      id: session.pinnedMessageId,
      sessionId,
      deletedAt: null,
    },
    include: { user: { select: hostSelect } },
  });
}

export async function listGiftCatalog() {
  return prisma.liveGiftCatalog.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { coinCost: "asc" }],
  });
}

export async function getOrCreateWallet(userId: string) {
  return prisma.liveWallet.upsert({
    where: { userId },
    create: { userId, coins: 100 },
    update: {},
  });
}

/** One-time starter balance is granted on wallet create only — never refill. */
export async function claimStarterCoins(userId: string) {
  return getOrCreateWallet(userId);
}

export async function sendGift(
  senderId: string,
  sessionId: string,
  giftId: string,
) {
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { id: true, hostId: true, status: true },
  });
  if (!session || session.status !== "LIVE") {
    throw new AppError("Live session is not active", 404);
  }
  if (session.hostId === senderId) {
    throw new AppError("You cannot gift yourself", 400);
  }

  const gift = await prisma.liveGiftCatalog.findFirst({
    where: { id: giftId, isActive: true },
  });
  if (!gift) throw new AppError("Gift not found", 404);

  await getOrCreateWallet(senderId);

  const event = await prisma.$transaction(async (tx) => {
    const debit = await tx.liveWallet.updateMany({
      where: { userId: senderId, coins: { gte: gift.coinCost } },
      data: { coins: { decrement: gift.coinCost } },
    });
    if (debit.count !== 1) {
      throw new AppError("Not enough coins", 400);
    }

    const created = await tx.liveGiftEvent.create({
      data: {
        sessionId,
        giftId: gift.id,
        senderId,
        hostId: session.hostId,
        coinCost: gift.coinCost,
      },
      include: {
        gift: true,
        sender: { select: hostSelect },
      },
    });

    await tx.liveWallet.upsert({
      where: { userId: session.hostId },
      create: { userId: session.hostId, coins: gift.coinCost },
      update: { coins: { increment: gift.coinCost } },
    });
    await tx.liveSession.update({
      where: { id: sessionId },
      data: { giftCoins: { increment: gift.coinCost } },
    });

    return created;
  });

  getIo()?.to(`live:${sessionId}`).emit("live:gift", { event });

  void createNotification({
    userId: session.hostId,
    actorId: senderId,
    type: "LIVE_GIFT",
    body: `sent you ${gift.emoji} ${gift.name}`,
    href: `/live/${sessionId}`,
  }).catch(() => undefined);

  const balance = await getOrCreateWallet(senderId);
  return { event, coins: balance.coins };
}

export async function pinLiveChat(
  actorId: string,
  sessionId: string,
  messageId: string | null,
) {
  await assertCanModerate(actorId, sessionId);
  if (!messageId) {
    await prisma.$transaction([
      prisma.liveChatMessage.updateMany({
        where: { sessionId, isPinned: true },
        data: { isPinned: false },
      }),
      prisma.liveSession.update({
        where: { id: sessionId },
        data: { pinnedMessageId: null },
      }),
    ]);
    getIo()?.to(`live:${sessionId}`).emit("live:chat:pinned", {
      sessionId,
      message: null,
    });
    return { pinnedMessageId: null };
  }

  const message = await prisma.liveChatMessage.findFirst({
    where: { id: messageId, sessionId, deletedAt: null },
    include: { user: { select: hostSelect } },
  });
  if (!message) throw new AppError("Message not found", 404);

  await prisma.$transaction([
    prisma.liveChatMessage.updateMany({
      where: { sessionId, isPinned: true },
      data: { isPinned: false },
    }),
    prisma.liveChatMessage.update({
      where: { id: messageId },
      data: { isPinned: true },
    }),
    prisma.liveSession.update({
      where: { id: sessionId },
      data: { pinnedMessageId: messageId },
    }),
  ]);

  getIo()?.to(`live:${sessionId}`).emit("live:chat:pinned", {
    sessionId,
    message: { ...message, isPinned: true },
  });
  return { pinnedMessageId: messageId, message };
}

export async function blockViewer(
  actorId: string,
  sessionId: string,
  targetUserId: string,
) {
  const { session } = await assertCanModerate(actorId, sessionId);
  if (targetUserId === session.hostId) {
    throw new AppError("Cannot block the host", 400);
  }
  const blocked = new Set(session.blockedUserIds);
  blocked.add(targetUserId);
  const muted = new Set(session.mutedUserIds);
  muted.add(targetUserId);
  const updated = await prisma.liveSession.update({
    where: { id: sessionId },
    data: {
      blockedUserIds: [...blocked],
      mutedUserIds: [...muted],
    },
    select: { blockedUserIds: true, mutedUserIds: true },
  });
  getIo()?.to(`user:${targetUserId}`).emit("live:blocked", { sessionId });
  getIo()?.to(`live:${sessionId}`).emit("live:block", {
    sessionId,
    userId: targetUserId,
  });
  return updated;
}

export async function broadcastLiveReaction(
  userId: string,
  sessionId: string,
  emoji: string,
) {
  const clean = emoji.trim().slice(0, 16);
  if (!clean) throw new AppError("Invalid reaction", 400);
  const session = await prisma.liveSession.findFirst({
    where: { id: sessionId, status: "LIVE" },
    select: { id: true, mutedUserIds: true, blockedUserIds: true },
  });
  if (!session) throw new AppError("Live session is not active", 404);
  if (
    session.blockedUserIds.includes(userId) ||
    session.mutedUserIds.includes(userId)
  ) {
    throw new AppError("You cannot react in this live", 403);
  }
  const payload = {
    sessionId,
    userId,
    emoji: clean,
    at: new Date().toISOString(),
  };
  getIo()?.to(`live:${sessionId}`).emit("live:react", payload);
  return payload;
}
