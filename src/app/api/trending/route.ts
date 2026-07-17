import { fail, ok, optionalUser } from "@/lib/api";
import { getTrendingFeed } from "@/modules/feed/services/posts";

export async function GET(request: Request) {
  try {
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
