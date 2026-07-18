import { CallType } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { createCall, listCallHistory } from "@/modules/media/services/calls";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const q = new URL(request.url).searchParams;
    return ok(
      await listCallHistory(
        user.id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 30),
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "calls:post");
    const user = await requireUser();
    const input = await body(
      request,
      z.object({
        conversationId: z.string().optional(),
        calleeIds: z.array(z.string().min(1)).min(1),
        type: z.nativeEnum(CallType),
      }),
    );
    return ok({ call: await createCall(user.id, input) }, 201);
  } catch (error) {
    return fail(error);
  }
}
