import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioFollowers } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:followers");
    const user = await requireUser();
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 40);
    return ok(await getStudioFollowers(user.id, limit));
  } catch (e) {
    return fail(e);
  }
}
