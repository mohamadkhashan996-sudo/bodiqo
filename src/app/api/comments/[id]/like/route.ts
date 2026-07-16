import { fail, ok, requireUser } from "@/lib/api";
import { likeComment, unlikeComment } from "@/modules/feed/services/comments";
export async function POST(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    return ok({ like: await likeComment(u.id, (await params).id) });
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
    return ok(await unlikeComment(u.id, (await params).id));
  } catch (e) {
    return fail(e);
  }
}
