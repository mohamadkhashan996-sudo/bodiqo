import { fail, guardApiAbuse, ok, optionalUser } from "@/lib/api";
import { getShorts } from "@/modules/feed/services/posts";
import { requireFeature } from "@/modules/platform/feature-flags";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "shorts:get", 90, 60000);
    await requireFeature("shorts");
    const u = await optionalUser();
    const q = new URL(request.url).searchParams;
    const modeParam = q.get("mode");
    const mode =
      modeParam === "latest"
        ? "latest"
        : modeParam === "following"
          ? "following"
          : "forYou";
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
