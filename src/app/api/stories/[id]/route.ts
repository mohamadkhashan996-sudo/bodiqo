import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { deleteOwnStory } from "@/modules/media/services/stories";
import { requireFeature } from "@/modules/platform/feature-flags";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "stories:id:delete", 30);
    await requireFeature("stories");
    const user = await requireUser();
    const { id } = await params;
    return ok(await deleteOwnStory(user.id, id));
  } catch (e) {
    return fail(e);
  }
}
