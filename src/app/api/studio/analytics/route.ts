import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioAnalytics } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:analytics");
    const user = await requireUser();
    const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
    return ok(await getStudioAnalytics(user.id, days));
  } catch (e) {
    return fail(e);
  }
}
