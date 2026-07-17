import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse} from "@/lib/api";
import { addConversationMembers, removeConversationMember } from "@/modules/messaging/services/conversations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardApiAbuse(request, "conversations:id:members:post");
    const user = await requireUser(); const input = await body(request, z.object({ userIds: z.array(z.string().min(1)).min(1).max(100) }));
    return ok({ members: await addConversationMembers(user.id, (await params).id, input.userIds) }, 201);
  } catch (error) { return fail(error); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardApiAbuse(request, "conversations:id:members:delete");
    const user = await requireUser(); const memberId = new URL(request.url).searchParams.get("userId");
    if (!memberId) throw new Error("userId is required");
    return ok({ member: await removeConversationMember(user.id, (await params).id, memberId) });
  } catch (error) { return fail(error); }
}
