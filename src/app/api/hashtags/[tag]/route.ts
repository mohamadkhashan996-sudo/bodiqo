import { fail, ok, optionalUser, guardApiAbuse } from "@/lib/api";
import { getHashtagFeed } from "@/modules/feed/services/hashtags";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tag: string }> },
) {
  try {
    await guardApiAbuse(request, "hashtags:tag:get", 60, 60000);
    const viewer = await optionalUser();
    const { tag } = await params;
    const q = new URL(request.url).searchParams;
    return ok(
      await getHashtagFeed(
        tag,
        viewer?.id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 20),
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
