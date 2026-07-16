import { prisma } from "@/lib/prisma";

export async function adminSearch(q: string, take = 12) {
  const query = q.trim();
  if (!query) {
    return {
      users: [],
      posts: [],
      videos: [],
      communities: [],
      messages: [],
      comments: [],
      stories: [],
    };
  }

  const [users, posts, videos, communities, messages, comments, stories] =
    await Promise.all([
      prisma.user.findMany({
        where: {
          status: { not: "DELETED" },
          OR: [
            { handle: { contains: query } },
            { displayName: { contains: query } },
            { email: { contains: query } },
            { name: { contains: query } },
          ],
        },
        take,
        select: {
          id: true,
          handle: true,
          displayName: true,
          email: true,
          role: true,
          status: true,
          isVerified: true,
        },
      }),
      prisma.post.findMany({
        where: { body: { contains: query }, status: { not: "DELETED" } },
        take,
        include: {
          author: { select: { handle: true, displayName: true } },
        },
      }),
      prisma.post.findMany({
        where: {
          body: { contains: query },
          type: { in: ["VIDEO", "SHORT"] },
          status: { not: "DELETED" },
        },
        take,
        include: {
          author: { select: { handle: true, displayName: true } },
        },
      }),
      prisma.community.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
            { description: { contains: query } },
          ],
        },
        take,
      }),
      prisma.message.findMany({
        where: { body: { contains: query }, deletedForAll: false },
        take,
        include: {
          sender: { select: { handle: true, displayName: true } },
        },
      }),
      prisma.comment.findMany({
        where: { body: { contains: query }, deletedAt: null },
        take,
        include: {
          author: { select: { handle: true, displayName: true } },
        },
      }),
      prisma.story.findMany({
        where: { textOverlay: { contains: query } },
        take,
        include: {
          author: { select: { handle: true, displayName: true } },
        },
      }),
    ]);

  return { users, posts, videos, communities, messages, comments, stories };
}
