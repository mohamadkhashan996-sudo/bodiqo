import { ReactionType } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emptyReactionCounts } from "@/lib/reactions";
import { broadcastPostLike } from "@/modules/feed/services/broadcast";
import {
  reactToPost,
  removePostReaction,
} from "@/modules/feed/services/posts";
import { createNotification } from "@/modules/notifications/services/notify";

const reactSchema = z.object({
  type: z.nativeEnum(ReactionType).default(ReactionType.LIKE),
});

export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(r, "posts:id:react:post", 60);
    const u = await requireUser();
    const postId = (await params).id;
    const { type } = await body(r, reactSchema).catch(() => ({
      type: ReactionType.LIKE,
    }));
    const result = await reactToPost(u.id, postId, type);
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
      reactionCounts: result.reactionCounts,
      reaction: result.reaction,
      previousReaction: result.previousReaction,
      liked: true,
      userId: u.id,
    });
    return ok({
      liked: true,
      reaction: result.reaction,
      previousReaction: result.previousReaction,
      likeCount: result.likeCount,
      reactionCounts: result.reactionCounts,
      isNew: result.isNew,
      changed: result.changed,
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
    await guardApiAbuse(_r, "posts:id:react:delete", 60);
    const u = await requireUser();
    const postId = (await params).id;
    const result = await removePostReaction(u.id, postId);
    broadcastPostLike({
      postId,
      likeCount: result.likeCount,
      reactionCounts: result.reactionCounts ?? emptyReactionCounts(),
      reaction: null,
      previousReaction: result.previousReaction,
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
