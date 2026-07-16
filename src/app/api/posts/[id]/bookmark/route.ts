import { fail, ok, requireUser } from "@/lib/api";
import { bookmarkPost } from "@/modules/feed/services/posts";
import { prisma } from "@/lib/prisma";
export async function POST(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    return ok({ bookmark: await bookmarkPost(u.id, (await params).id) });
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
    const id = (await params).id;
    await prisma.bookmark.deleteMany({ where: { userId: u.id, postId: id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
