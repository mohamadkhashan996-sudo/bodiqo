import { z } from "zod";

import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getBookmarks } from "@/modules/feed/services/bookmarks";

const filterSchema = z.enum(["all", "videos", "posts"]).default("all");
const sortSchema = z.enum(["newest", "oldest"]).default("newest");

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "bookmarks:get", 60, 60000);
    const user = await requireUser();
    const q = new URL(request.url).searchParams;
    const filter = filterSchema.parse(q.get("filter") ?? "all");
    const sort = sortSchema.parse(q.get("sort") ?? "newest");
    return ok(
      await getBookmarks(user.id, {
        cursor: q.get("cursor") ?? undefined,
        limit: Number(q.get("limit") ?? 20),
        filter,
        sort,
        q: q.get("q") ?? undefined,
        collectionId: q.get("collectionId") ?? undefined,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
