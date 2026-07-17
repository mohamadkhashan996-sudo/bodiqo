import { fail, ok, requireUser } from "@/lib/api";
import { listStoryViewers } from "@/modules/media/services/stories";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    return ok(await listStoryViewers(user.id, (await params).id));
  } catch (e) {
    return fail(e);
  }
}
