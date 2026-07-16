import { fail, ok, requireUser } from "@/lib/api";
import { getExplore } from "@/modules/feed/services/posts";
export async function GET(r: Request) {
  try {
    await requireUser();
    const q = new URL(r.url).searchParams;
    return ok(
      await getExplore(
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 20),
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
