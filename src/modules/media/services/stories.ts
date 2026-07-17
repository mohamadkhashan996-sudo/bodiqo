import { MediaKind } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  canSeeStories,
  filterVisibleStoryAuthors,
} from "@/modules/messaging/services/privacy-gate";
import { createNotification } from "@/modules/notifications/services/notify";

const authorSelect = {
  id: true,
  handle: true,
  name: true,
  displayName: true,
  image: true,
} as const;

export async function createStory(
  authorId: string,
  data: { mediaUrl: string; mediaKind?: MediaKind; textOverlay?: string },
) {
  return prisma.$transaction(async (tx) => {
    const story = await tx.story.create({
      data: {
        authorId,
        mediaUrl: data.mediaUrl,
        mediaKind: data.mediaKind ?? "IMAGE",
        textOverlay: data.textOverlay,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    await tx.user.update({
      where: { id: authorId },
      data: { storiesCount: { increment: 1 } },
    });
    return story;
  });
}

export async function listActiveStories(userId?: string) {
  return prisma.story.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: {
      author: { select: authorSelect },
      reactions: {
        select: { emoji: true, userId: true },
        take: 50,
      },
      ...(userId
        ? {
            views: {
              where: { viewerId: userId },
              select: { id: true },
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listPublicStories(viewerId?: string) {
  const stories = await listActiveStories(viewerId);
  const authorIds = [...new Set(stories.map((s) => s.authorId))];
  const [authors, storyAllowed] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, isPrivate: true },
    }),
    filterVisibleStoryAuthors(viewerId, authorIds),
  ]);
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const privateAuthorIds = authors
    .filter((a) => a.isPrivate && a.id !== viewerId)
    .map((a) => a.id);

  const followingPrivate = new Set<string>();
  if (viewerId && privateAuthorIds.length) {
    const follows = await prisma.follow.findMany({
      where: {
        followerId: viewerId,
        followingId: { in: privateAuthorIds },
      },
      select: { followingId: true },
    });
    for (const row of follows) followingPrivate.add(row.followingId);
  }

  const filtered = [];
  for (const story of stories) {
    const author = authorMap.get(story.authorId);
    if (!author) continue;
    if (!storyAllowed.has(story.authorId)) continue;
    if (author.isPrivate && viewerId !== story.authorId) {
      if (!viewerId || !followingPrivate.has(story.authorId)) continue;
    }
    const reactionCounts: Record<string, number> = {};
    for (const reaction of story.reactions) {
      reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] ?? 0) + 1;
    }
    filtered.push({
      id: story.id,
      authorId: story.authorId,
      mediaUrl: story.mediaUrl,
      mediaKind: story.mediaKind,
      textOverlay: story.textOverlay,
      viewCount: story.viewCount,
      expiresAt: story.expiresAt,
      createdAt: story.createdAt,
      author: story.author,
      views: "views" in story ? story.views : [],
      myReaction:
        viewerId != null
          ? (story.reactions.find((r) => r.userId === viewerId)?.emoji ?? null)
          : null,
      reactionCounts,
    });
  }
  return filtered;
}

export async function viewStory(viewerId: string, storyId: string) {
  return prisma.$transaction(async (tx) => {
    const story = await tx.story.findFirst({
      where: { id: storyId, expiresAt: { gt: new Date() } },
    });
    if (!story) throw new AppError("Story not found", 404);
    if (!(await canSeeStories(viewerId, story.authorId))) {
      throw new AppError("Story not available", 403);
    }
    const exists = await tx.storyView.findUnique({
      where: { storyId_viewerId: { storyId, viewerId } },
    });
    if (exists) return exists;
    const view = await tx.storyView.create({ data: { storyId, viewerId } });
    await tx.story.update({
      where: { id: storyId },
      data: { viewCount: { increment: 1 } },
    });
    return view;
  });
}

export async function listStoryViewers(authorId: string, storyId: string) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, authorId },
    select: { id: true, viewCount: true, expiresAt: true },
  });
  if (!story) throw new AppError("Story not found", 404);

  const views = await prisma.storyView.findMany({
    where: { storyId },
    include: {
      viewer: { select: authorSelect },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    viewCount: story.viewCount,
    expired: story.expiresAt.getTime() <= Date.now(),
    viewers: views.map((row) => ({
      id: row.viewer.id,
      handle: row.viewer.handle,
      name: row.viewer.name,
      displayName: row.viewer.displayName,
      image: row.viewer.image,
      viewedAt: row.createdAt,
    })),
  };
}

export async function reactStory(
  userId: string,
  storyId: string,
  emoji: string,
) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, expiresAt: { gt: new Date() } },
  });
  if (!story) throw new AppError("Story not found", 404);
  if (!(await canSeeStories(userId, story.authorId))) {
    throw new AppError("Story not available", 403);
  }
  const reaction = await prisma.storyReaction.upsert({
    where: { storyId_userId: { storyId, userId } },
    create: { storyId, userId, emoji },
    update: { emoji },
  });
  if (story.authorId !== userId) {
    await createNotification({
      userId: story.authorId,
      actorId: userId,
      type: "STORY_REPLY",
      body: `reacted ${emoji} to your story`,
      href: "/home",
    });
  }
  return reaction;
}

export async function expireStories(now = new Date()) {
  const expired = await prisma.story.findMany({
    where: { expiresAt: { lt: now } },
    select: { id: true, authorId: true },
  });
  if (!expired.length) return { count: 0 };

  const byAuthor = new Map<string, number>();
  for (const story of expired) {
    byAuthor.set(story.authorId, (byAuthor.get(story.authorId) ?? 0) + 1);
  }

  await prisma.$transaction(async (tx) => {
    await tx.story.deleteMany({
      where: { id: { in: expired.map((s) => s.id) } },
    });
    for (const [authorId, count] of byAuthor) {
      await tx.user.update({
        where: { id: authorId },
        data: { storiesCount: { decrement: count } },
      });
    }
  });

  return { count: expired.length };
}
