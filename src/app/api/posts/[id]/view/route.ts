import { z } from "zod";

import { body, fail, guardApiAbuse, ok, optionalUser } from "@/lib/api";
import { recordPostView } from "@/modules/feed/services/posts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "posts:id:view:post", 120);
    const viewer = await optionalUser();
    let dwellMs: number | undefined;
    let completed: boolean | undefined;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await body(
        request,
        z.object({
          dwellMs: z.number().int().min(0).max(600_000).optional(),
          completed: z.boolean().optional(),
        }),
      ).catch(() => ({}) as { dwellMs?: number; completed?: boolean });
      dwellMs = data.dwellMs;
      completed = data.completed;
    }
    return ok({
      post: await recordPostView((await params).id, viewer?.id, {
        dwellMs,
        completed,
      }),
    });
  } catch (e) {
    return fail(e);
  }
}
