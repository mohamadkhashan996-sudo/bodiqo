import { fail, ok, requireUser } from "@/lib/api";
import { likePost, unlikePost } from "@/modules/feed/services/posts";
export async function POST(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    return ok({ like: await likePost(u.id, (await params).id) });
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
