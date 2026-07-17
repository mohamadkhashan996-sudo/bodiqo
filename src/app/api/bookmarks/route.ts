import { fail, ok, requireUser, guardApiAbuse } from "@/lib/api";
import { getBookmarks } from "@/modules/feed/services/posts";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "bookmarks:get", 60, 60000);
    const user = await requireUser();
    const q = new URL(request.url).searchParams;
    return ok(
      await getBookmarks(
        user.id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 20),
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
