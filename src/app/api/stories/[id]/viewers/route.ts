import { fail, ok, requireUser, guardApiAbuse } from "@/lib/api";
import { listStoryViewers } from "@/modules/media/services/stories";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(_request, "stories:id:viewers:get", 60, 60000);
    const user = await requireUser();
    return ok(await listStoryViewers(user.id, (await params).id));
  } catch (e) {
    return fail(e);
  }
}
