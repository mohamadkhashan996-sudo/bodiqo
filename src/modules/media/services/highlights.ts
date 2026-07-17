import { MediaKind } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getProfileVisibility } from "@/modules/users/services/visibility";

const itemSelect = {
  id: true,
  storyId: true,
  mediaUrl: true,
  mediaKind: true,
  textOverlay: true,
  sortOrder: true,
  createdAt: true,
} as const;

export async function listHighlights(handle: string, viewerId?: string) {
  const user = await prisma.user.findFirst({
    where: { handle: handle.toLowerCase(), status: "ACTIVE" },
    select: { id: true, isPrivate: true },
  });
  if (!user) throw new AppError("User not found", 404);

  const visibility = await getProfileVisibility(user, viewerId);
  if (!visibility.canViewContent) {
    return { highlights: [], locked: true };
  }

  const highlights = await prisma.highlight.findMany({
    where: { userId: user.id },
    include: {
      items: { orderBy: { sortOrder: "asc" }, select: itemSelect },
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    highlights: highlights.map((h) => ({
      ...h,
      coverUrl: h.coverUrl ?? h.items[0]?.mediaUrl ?? null,
    })),
    locked: false,
  };
}

export async function createHighlight(
  userId: string,
  data: { title: string; coverUrl?: string | null },
) {
  const title = data.title.trim();
  if (title.length < 1 || title.length > 40) {
    throw new AppError("Highlight title must be 1–40 characters", 400);
  }
  return prisma.highlight.create({
    data: {
      userId,
      title,
      coverUrl: data.coverUrl || null,
    },
    include: { items: true },
  });
}

export async function deleteHighlight(userId: string, highlightId: string) {
  const highlight = await prisma.highlight.findFirst({
    where: { id: highlightId, userId },
  });
  if (!highlight) throw new AppError("Highlight not found", 404);
  await prisma.highlight.delete({ where: { id: highlightId } });
  return { ok: true };
}

export async function addStoryToHighlight(
  userId: string,
  highlightId: string,
  storyId: string,
) {
  const [highlight, story] = await Promise.all([
    prisma.highlight.findFirst({ where: { id: highlightId, userId } }),
    prisma.story.findFirst({
      where: { id: storyId, authorId: userId },
    }),
  ]);
  if (!highlight) throw new AppError("Highlight not found", 404);
  if (!story) throw new AppError("Story not found", 404);

  const count = await prisma.highlightItem.count({ where: { highlightId } });
  const item = await prisma.highlightItem.create({
    data: {
      highlightId,
      storyId: story.id,
      mediaUrl: story.mediaUrl,
      mediaKind: story.mediaKind,
      textOverlay: story.textOverlay,
      sortOrder: count,
    },
    select: itemSelect,
  });

  if (!highlight.coverUrl) {
    await prisma.highlight.update({
      where: { id: highlightId },
      data: { coverUrl: story.mediaUrl },
    });
  }

  return item;
}

export async function addStoryToNewOrDefaultHighlight(
  userId: string,
  storyId: string,
  title?: string,
) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, authorId: userId },
  });
  if (!story) throw new AppError("Story not found", 404);

  let highlight = await prisma.highlight.findFirst({
    where: { userId, title: title?.trim() || "Highlights" },
    orderBy: { createdAt: "asc" },
  });
  if (!highlight) {
    highlight = await createHighlight(userId, {
      title: title?.trim() || "Highlights",
      coverUrl: story.mediaUrl,
    });
  }

  const item = await addStoryToHighlight(userId, highlight.id, storyId);
  return { highlight, item };
}

export async function removeHighlightItem(
  userId: string,
  highlightId: string,
  itemId: string,
) {
  const highlight = await prisma.highlight.findFirst({
    where: { id: highlightId, userId },
  });
  if (!highlight) throw new AppError("Highlight not found", 404);
  const deleted = await prisma.highlightItem.deleteMany({
    where: { id: itemId, highlightId },
  });
  if (!deleted.count) throw new AppError("Item not found", 404);
  return { ok: true };
}

export type { MediaKind };
