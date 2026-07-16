import { fail, ok, optionalUser } from "@/lib/api";
import { getExplore, getSuggestedUsers } from "@/modules/feed/services/posts";

export async function GET(r: Request) {
  try {
    const u = await optionalUser();
    const q = new URL(r.url).searchParams;
    const mode = q.get("mode");
    if (mode === "users") {
      return ok({ users: await getSuggestedUsers(Number(q.get("limit") ?? 5)) });
    }
    return ok(
      await getExplore(
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 20),
        u?.id,
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
