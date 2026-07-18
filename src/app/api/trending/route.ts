import { fail, guardApiAbuse, ok, optionalUser } from "@/lib/api";
import { getTrendingFeed } from "@/modules/feed/services/posts";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "trending:get", 90, 60000);
    const viewer = await optionalUser();
    const q = new URL(request.url).searchParams;
    const mediaParam = (q.get("media") ?? "all").toLowerCase();
    const media = mediaParam === "video" ? "video" : "all";
    return ok(
      await getTrendingFeed(
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 12),
        viewer?.id,
        { media },
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
