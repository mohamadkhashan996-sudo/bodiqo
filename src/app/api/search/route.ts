import { fail, guardApiAbuse, ok, optionalUser, requireUser } from "@/lib/api";
import { clampInt } from "@/lib/security";
import {
  clearSearchHistory,
  listSearchHistory,
  searchAll,
  type SearchType,
  trendingHashtags,
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
    const type = (
      TYPES.has(typeParam as SearchType) ? typeParam : "all"
    ) as SearchType;
    const limit = clampInt(params.get("limit"), 20, 1, 40);
    const record = params.get("record") !== "0";

    if (!q) {
      const [trending, recent] = await Promise.all([
        trendingHashtags(12),
        user?.id ? listSearchHistory(user.id) : Promise.resolve([]),
      ]);
      return ok({
        query: "",
        type,
        users: [],
        posts: [],
        videos: [],
        communities: [],
        hashtags: [],
        trending,
        recent,
      });
    }

    const [results, trending] = await Promise.all([
      searchAll(q, user?.id, { type, limit, record }),
      trendingHashtags(8),
    ]);
    return ok({
      ...results,
      trending,
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
