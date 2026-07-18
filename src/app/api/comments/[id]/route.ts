import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { broadcastComment } from "@/modules/feed/services/broadcast";
import {
  deleteComment,
  editComment,
  pinComment,
  serializeComment,
} from "@/modules/feed/services/comments";

export async function PATCH(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(r, "comments:id:patch");
    const u = await requireUser();
    const id = (await params).id;
    const input = await body(
      r,
      z.object({
        body: z.string().min(1).max(5000).optional(),
        isPinned: z.boolean().optional(),
      }),
    );

    if (typeof input.isPinned === "boolean") {
      const pinned = await pinComment(u.id, id, input.isPinned);
      const dto = await serializeComment(pinned, u.id);
      broadcastComment({
        type: "pinned",
        postId: pinned.postId,
        commentId: pinned.id,
        isPinned: pinned.isPinned,
      });
      return ok({ comment: dto });
    }

    if (!input.body) throw new AppError("Nothing to update", 400);
    const comment = await editComment(u.id, id, input.body);
    const dto = await serializeComment(comment, u.id);
    broadcastComment({
      type: "updated",
      postId: comment.postId,
      comment: dto,
    });
    return ok({ comment: dto });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(_r, "comments:id:delete");
    const u = await requireUser();
    const result = await deleteComment(u.id, (await params).id);
    broadcastComment({
      type: "deleted",
      postId: result.postId,
      commentId: result.id,
      parentId: result.parentId,
      commentCount: result.commentCount,
      deletedIds: result.deletedIds,
    });
    return ok({
      ok: true,
      commentCount: result.commentCount,
      commentId: result.id,
      parentId: result.parentId,
      deletedIds: result.deletedIds,
    });
  } catch (e) {
    return fail(e);
  }
}
