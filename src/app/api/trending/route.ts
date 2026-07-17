import { fail, ok, optionalUser, guardApiAbuse } from "@/lib/api";
import { getTrendingFeed } from "@/modules/feed/services/posts";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "trending:get", 90, 60000);
    const viewer = await optionalUser();
    const q = new URL(request.url).searchParams;
    return ok(
      await getTrendingFeed(
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 12),
        viewer?.id,
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
