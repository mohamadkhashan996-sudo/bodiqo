import { ReactionType } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { broadcastComment } from "@/modules/feed/services/broadcast";
import {
  reactToComment,
  unlikeComment,
} from "@/modules/feed/services/comments";

const reactSchema = z.object({
  type: z.nativeEnum(ReactionType).default(ReactionType.LIKE),
});

export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(r, "comments:id:like:post");
    const u = await requireUser();
    const { type } = await body(r, reactSchema).catch(() => ({
      type: ReactionType.LIKE,
    }));
    const result = await reactToComment(u.id, (await params).id, type);
    broadcastComment({
      type: "liked",
      postId: result.postId,
      commentId: result.commentId,
      likeCount: result.likeCount,
      liked: true,
      reaction: result.reaction,
      userId: u.id,
    });
    return ok({
      liked: true,
      reaction: result.reaction,
      likeCount: result.likeCount,
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
    await guardApiAbuse(_r, "comments:id:like:delete");
    const u = await requireUser();
    const result = await unlikeComment(u.id, (await params).id);
    broadcastComment({
      type: "liked",
      postId: result.postId,
      commentId: result.commentId,
      likeCount: result.likeCount,
      liked: false,
      reaction: null,
      userId: u.id,
    });
    return ok({
      liked: false,
      reaction: null,
      likeCount: result.likeCount,
      deleted: result.deleted,
    });
  } catch (e) {
    return fail(e);
  }
}
