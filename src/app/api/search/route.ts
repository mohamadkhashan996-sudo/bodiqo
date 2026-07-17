import { fail, ok, optionalUser, requireUser } from "@/lib/api";
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
    const user = await optionalUser();
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim() ?? "";
    const typeParam = (params.get("type") ?? "all").toLowerCase();
    const type = (TYPES.has(typeParam as SearchType)
      ? typeParam
      : "all") as SearchType;
    const limit = Number(params.get("limit") ?? 20);

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

export async function DELETE() {
  try {
    const user = await requireUser();
    return ok(await clearSearchHistory(user.id));
  } catch (e) {
    return fail(e);
  }
}
