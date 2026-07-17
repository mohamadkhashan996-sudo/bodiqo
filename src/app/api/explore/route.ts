import { fail, ok, optionalUser, guardApiAbuse } from "@/lib/api";
import { getExplore } from "@/modules/feed/services/posts";
import { getSuggestedUsers } from "@/modules/users/services/suggestions";

export async function GET(r: Request) {
  try {
    await guardApiAbuse(r, "explore:get", 90, 60000);
    const u = await optionalUser();
    const q = new URL(r.url).searchParams;
    const mode = q.get("mode");
    if (mode === "users") {
      return ok({
        users: await getSuggestedUsers(Number(q.get("limit") ?? 8), u?.id),
      });
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
