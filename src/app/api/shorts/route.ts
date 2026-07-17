import { fail, ok, optionalUser } from "@/lib/api";
import { getShorts } from "@/modules/feed/services/posts";

export async function GET(request: Request) {
  try {
    const u = await optionalUser();
    const q = new URL(request.url).searchParams;
    const modeParam = q.get("mode");
    const mode = modeParam === "latest" ? "latest" : "forYou";
    return ok(
      await getShorts(
        u?.id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 20),
        mode,
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
