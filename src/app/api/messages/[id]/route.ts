import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse} from "@/lib/api";
import { deleteMessage, editMessage } from "@/modules/messaging/services/messages";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardApiAbuse(request, "messages:id:patch");
    const user = await requireUser(); const input = await body(request, z.object({ body: z.string().min(1).max(10000) }));
    return ok({ message: await editMessage(user.id, (await params).id, input.body) });
  } catch (error) { return fail(error); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardApiAbuse(request, "messages:id:delete");
    const user = await requireUser(); const forEveryone = new URL(request.url).searchParams.get("forEveryone") === "true";
    return ok({ deleted: await deleteMessage(user.id, (await params).id, forEveryone) });
  } catch (error) { return fail(error); }
}
