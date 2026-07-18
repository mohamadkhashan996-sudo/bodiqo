import { fail, guardApiAbuse, ok, optionalUser } from "@/lib/api";
import { clampInt } from "@/lib/security";
import { suggestSearch } from "@/modules/users/services/search";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "search:suggest", 120, 60000);
    const user = await optionalUser();
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim() ?? "";
    const limit = clampInt(params.get("limit"), 6, 1, 12);
    return ok(await suggestSearch(q, user?.id, limit));
  } catch (error) {
    return fail(error);
  }
}
