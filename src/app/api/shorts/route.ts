import { fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializePost } from "@/modules/feed/services/posts";
export async function GET() {
  try {
    const u = await requireUser();
    const posts = await prisma.post.findMany({
      where: {
        type: "SHORT",
        status: "PUBLISHED",
        deletedAt: null,
        visibility: "PUBLIC",
      },
      include: {
        author: { select: { id: true, handle: true, name: true, image: true } },
        media: true,
        hashtags: { include: { hashtag: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });
    return ok({ posts: posts.map((p) => serializePost(p, u.id)) });
  } catch (e) {
    return fail(e);
  }
}
