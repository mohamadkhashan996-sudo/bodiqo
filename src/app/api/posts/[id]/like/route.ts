import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emptyReactionCounts } from "@/lib/reactions";
import { broadcastPostLike } from "@/modules/feed/services/broadcast";
import { likePost, unlikePost } from "@/modules/feed/services/posts";
import { createNotification } from "@/modules/notifications/services/notify";

/** Compatibility endpoint — reacts with LIKE / undoes any reaction. */
export async function POST(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(_r, "posts:id:like:post");
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
        href: `/post/${postId}`,
      }).catch(() => undefined);
    }
    broadcastPostLike({
      postId,
      likeCount: result.likeCount,
      reactionCounts: result.reactionCounts ?? emptyReactionCounts(),
      reaction: result.reaction ?? "LIKE",
      liked: true,
      userId: u.id,
    });
    return ok({
      liked: true,
      reaction: result.reaction ?? "LIKE",
      likeCount: result.likeCount,
      reactionCounts: result.reactionCounts,
      isNew: result.isNew,
    });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(_r, "posts:id:like:delete");
    const u = await requireUser();
    const postId = (await params).id;
    const result = await unlikePost(u.id, postId);
    broadcastPostLike({
      postId,
      likeCount: result.likeCount,
      reactionCounts: result.reactionCounts ?? emptyReactionCounts(),
      reaction: null,
      liked: false,
      userId: u.id,
    });
    return ok({
      liked: false,
      reaction: null,
      likeCount: result.likeCount,
      reactionCounts: result.reactionCounts,
      deleted: result.deleted,
    });
  } catch (e) {
    return fail(e);
  }
}
