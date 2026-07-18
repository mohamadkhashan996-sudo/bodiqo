import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioSubscribers } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:subscribers");
    const user = await requireUser();
    return ok(await getStudioSubscribers(user.id));
  } catch (e) {
    return fail(e);
  }
}
