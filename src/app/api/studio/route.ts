import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioDashboard } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:dashboard");
    const user = await requireUser();
    return ok(await getStudioDashboard(user.id));
  } catch (e) {
    return fail(e);
  }
}
