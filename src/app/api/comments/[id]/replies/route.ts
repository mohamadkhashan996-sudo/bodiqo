import { fail, guardApiAbuse, ok, optionalUser } from "@/lib/api";
import { listCommentReplies } from "@/modules/feed/services/comments";

export async function GET(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(r, "comments:id:replies:get", 90);
    const u = await optionalUser();
    const q = new URL(r.url).searchParams;
    return ok(
      await listCommentReplies(
        (await params).id,
        u?.id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 20),
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
