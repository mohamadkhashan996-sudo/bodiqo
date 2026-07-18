import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioMusicLibrary } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:music");
    await requireUser();
    return ok(getStudioMusicLibrary());
  } catch (e) {
    return fail(e);
  }
}
