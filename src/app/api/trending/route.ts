import { fail, ok, optionalUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { trendingHashtags } from "@/modules/users/services/search";
import { serializePost } from "@/modules/feed/services/posts";
import { filterVisiblePostIds } from "@/modules/users/services/visibility";

export async function GET(request: Request) {
  try {
    const viewer = await optionalUser();
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 12);

    const [hashtags, posts] = await Promise.all([
      trendingHashtags(limit),
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          visibility: "PUBLIC",
          author: { status: "ACTIVE", isPrivate: false },
        },
        include: {
          author: {
            select: {
              id: true,
              handle: true,
              name: true,
              displayName: true,
              image: true,
              isVerified: true,
              isOfficial: true,
              isPrivate: true,
            },
          },
          media: { orderBy: { sortOrder: "asc" } },
          hashtags: { include: { hashtag: true } },
        },
        orderBy: [{ likeCount: "desc" }, { publishedAt: "desc" }],
        take: 20,
      }),
    ]);

    const visible = await filterVisiblePostIds(viewer?.id, posts);

    return ok({
      hashtags,
      posts: await Promise.all(
        visible.map((post) => serializePost(post, viewer?.id)),
      ),
    });
  } catch (error) {
    return fail(error);
  }
}
