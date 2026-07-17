import { fail, ok, optionalUser, requireUser, guardApiAbuse } from "@/lib/api";
import { clampInt } from "@/lib/security";
import {
  clearSearchHistory,
  listSearchHistory,
  searchAll,
  trendingHashtags,
  type SearchType,
} from "@/modules/users/services/search";

const TYPES = new Set<SearchType>([
  "all",
  "users",
  "posts",
  "videos",
  "communities",
  "hashtags",
]);

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "search:get", 90, 60000);
    const user = await optionalUser();
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim() ?? "";
    const typeParam = (params.get("type") ?? "all").toLowerCase();
    const type = (TYPES.has(typeParam as SearchType)
      ? typeParam
      : "all") as SearchType;
    const limit = clampInt(params.get("limit"), 20, 1, 40);

    if (!q) {
      return ok({
        query: "",
        type,
        users: [],
        posts: [],
        videos: [],
        communities: [],
        hashtags: [],
        trending: await trendingHashtags(12),
        recent: user?.id ? await listSearchHistory(user.id) : [],
      });
    }

    return ok({
      ...(await searchAll(q, user?.id, { type, limit })),
      trending: await trendingHashtags(8),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(request: Request) {
  try {
    await guardApiAbuse(request, "search:delete", 90, 60000);
    const user = await requireUser();
    return ok(await clearSearchHistory(user.id));
  } catch (e) {
    return fail(e);
  }
}
