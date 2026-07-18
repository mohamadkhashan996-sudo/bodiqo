import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioCopyright } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:copyright");
    const user = await requireUser();
    return ok(await getStudioCopyright(user.id));
  } catch (e) {
    return fail(e);
  }
}
