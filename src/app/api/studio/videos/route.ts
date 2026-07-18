import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioVideos } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:videos");
    const user = await requireUser();
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 40);
    return ok(await getStudioVideos(user.id, limit));
  } catch (e) {
    return fail(e);
  }
}
