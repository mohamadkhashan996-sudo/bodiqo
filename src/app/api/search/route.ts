import { fail, ok, optionalUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { searchAll, trendingHashtags } from "@/modules/users/services/search";

export async function GET(r: Request) {
  try {
    const u = await optionalUser();
    const q = new URL(r.url).searchParams.get("q")?.trim() ?? "";
    if (!q) throw new AppError("q is required", 400);
    return ok({
      ...(await searchAll(q, u?.id)),
      trending: await trendingHashtags(),
    });
  } catch (e) {
    return fail(e);
  }
}
