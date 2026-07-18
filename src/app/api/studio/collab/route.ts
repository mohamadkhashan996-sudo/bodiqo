import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioCollab } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:collab");
    const user = await requireUser();
    return ok(await getStudioCollab(user.id));
  } catch (e) {
    return fail(e);
  }
}
