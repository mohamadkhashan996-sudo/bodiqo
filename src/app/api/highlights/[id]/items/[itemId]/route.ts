import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { removeHighlightItem } from "@/modules/media/services/highlights";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    await guardApiAbuse(request, "highlights:items:delete", 20);
    const user = await requireUser();
    const { id, itemId } = await params;
    return ok(await removeHighlightItem(user.id, id, itemId));
  } catch (e) {
    return fail(e);
  }
}
