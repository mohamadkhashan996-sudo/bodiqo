import { z } from "zod";
import { CallStatus } from "@prisma/client";
import { body, fail, ok, requireUser } from "@/lib/api";
import { updateCallStatus } from "@/modules/media/services/calls";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const input = await body(request, z.object({ status: z.enum([CallStatus.ENDED, CallStatus.DECLINED]) }));
    return ok({ call: await updateCallStatus(user.id, (await params).id, input.status) });
  } catch (error) { return fail(error); }
}
