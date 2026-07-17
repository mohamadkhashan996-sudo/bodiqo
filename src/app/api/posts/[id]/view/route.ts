import { fail, ok, guardApiAbuse } from "@/lib/api";
import { recordPostView } from "@/modules/feed/services/posts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "posts:id:view:post", 120);
    return ok({ post: await recordPostView((await params).id) });
  } catch (e) {
    return fail(e);
  }
}
