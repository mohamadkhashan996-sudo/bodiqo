import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { requireFeature } from "@/modules/platform/feature-flags";
import { getStudioDashboard } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:dashboard");
    await requireFeature("creatorStudio");
    const user = await requireUser();
    return ok(await getStudioDashboard(user.id));
  } catch (e) {
    return fail(e);
  }
}
