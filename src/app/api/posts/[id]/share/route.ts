import { fail, ok, optionalUser, guardApiAbuse } from "@/lib/api";
import { sharePost } from "@/modules/feed/services/posts";
import { createNotification } from "@/modules/notifications/services/notify";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "posts:id:share:post", 40);
    const viewer = await optionalUser();
    const postId = (await params).id;
    const shared = await sharePost(postId);

    if (viewer?.id) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      if (post && post.authorId !== viewer.id) {
        await createNotification({
          userId: post.authorId,
          actorId: viewer.id,
          type: "SHARE",
          postId,
        }).catch(() => undefined);
      }
    }

    return ok({ post: shared });
  } catch (e) {
    return fail(e);
  }
}
