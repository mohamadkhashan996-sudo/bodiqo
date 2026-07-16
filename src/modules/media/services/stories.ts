import { MediaKind } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function createStory(authorId: string, data: { mediaUrl: string; mediaKind?: MediaKind; textOverlay?: string }) {
  return prisma.$transaction(async (tx) => {
    const story = await tx.story.create({ data: { authorId, mediaUrl: data.mediaUrl, mediaKind: data.mediaKind ?? "IMAGE", textOverlay: data.textOverlay, expiresAt: new Date(Date.now() + 86_400_000) } });
    await tx.user.update({ where: { id: authorId }, data: { storiesCount: { increment: 1 } } });
    return story;
  });
}
export async function listActiveStories(userId?: string) {
  return prisma.story.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: {
      author: {
        select: {
          id: true,
          handle: true,
          name: true,
          displayName: true,
          image: true,
        },
      },
      ...(userId
        ? { views: { where: { viewerId: userId }, select: { id: true } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listPublicStories(viewerId?: string) {
  const stories = await listActiveStories(viewerId);
  const authorIds = [...new Set(stories.map((s) => s.authorId))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, isPrivate: true },
  });
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const filtered = [];
  for (const story of stories) {
    const author = authorMap.get(story.authorId);
    if (!author) continue;
    if (author.isPrivate && viewerId !== story.authorId) {
      if (!viewerId) continue;
      const following = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: story.authorId,
          },
        },
      });
      if (!following) continue;
    }
    filtered.push(story);
  }
  return filtered;
}
export async function viewStory(viewerId: string, storyId: string) {
  return prisma.$transaction(async (tx) => {
    const story = await tx.story.findFirst({ where: { id: storyId, expiresAt: { gt: new Date() } } });
    if (!story) throw new AppError("Story not found", 404);
    const exists = await tx.storyView.findUnique({ where: { storyId_viewerId: { storyId, viewerId } } });
    if (exists) return exists;
    const view = await tx.storyView.create({ data: { storyId, viewerId } });
    await tx.story.update({ where: { id: storyId }, data: { viewCount: { increment: 1 } } });
    return view;
  });
}
export async function reactStory(userId: string, storyId: string, emoji: string) {
  const story = await prisma.story.findFirst({ where: { id: storyId, expiresAt: { gt: new Date() } } });
  if (!story) throw new AppError("Story not found", 404);
  return prisma.storyReaction.upsert({ where: { storyId_userId: { storyId, userId } }, create: { storyId, userId, emoji }, update: { emoji } });
}
