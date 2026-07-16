import { fail, ok, requireUser } from "@/lib/api";
import { likePost, unlikePost } from "@/modules/feed/services/posts";
import { createNotification } from "@/modules/notifications/services/notify";
import { prisma } from "@/lib/prisma";

export async function POST(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    const postId = (await params).id;
    const result = await likePost(u.id, postId);
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (post && result.isNew) {
      await createNotification({
        userId: post.authorId,
        actorId: u.id,
        type: "LIKE",
        postId,
      }).catch(() => undefined);
    }
    return ok({ like: result.like });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    return ok(await unlikePost(u.id, (await params).id));
  } catch (e) {
    return fail(e);
  }
}
