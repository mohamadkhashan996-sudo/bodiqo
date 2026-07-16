import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { addComment, listComments } from "@/modules/feed/services/comments";
export async function GET(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const q = new URL(r.url).searchParams;
    return ok(
      await listComments(
        (await params).id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 30),
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    const d = await body(
      r,
      z.object({
        body: z.string().min(1).max(5000),
        parentId: z.string().optional(),
      }),
    );
    return ok(
      {
        comment: await addComment(u.id, (await params).id, d.body, d.parentId),
      },
      201,
    );
  } catch (e) {
    return fail(e);
  }
}
