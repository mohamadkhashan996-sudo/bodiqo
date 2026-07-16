import { fail, ok, requireUser } from "@/lib/api";
import { viewStory } from "@/modules/media/services/stories";
export async function POST(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    return ok({ view: await viewStory(u.id, (await params).id) });
  } catch (e) {
    return fail(e);
  }
}
