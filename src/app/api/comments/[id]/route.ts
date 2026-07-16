import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { deleteComment, editComment } from "@/modules/feed/services/comments";
export async function PATCH(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    return ok({
      comment: await editComment(
        u.id,
        (await params).id,
        (await body(r, z.object({ body: z.string().min(1).max(5000) }))).body,
      ),
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
    const u = await requireUser();
    await deleteComment(u.id, (await params).id);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
