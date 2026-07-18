import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { sendGift } from "@/modules/live/services/sessions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "live:gift:post", 30);
    const user = await requireUser();
    const input = await body(request, z.object({ giftId: z.string().min(1) }));
    return ok(await sendGift(user.id, (await params).id, input.giftId));
  } catch (e) {
    return fail(e);
  }
}
