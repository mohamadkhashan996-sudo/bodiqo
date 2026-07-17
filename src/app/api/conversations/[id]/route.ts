import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { assertConversationMember, leaveConversation, updateMemberFlags } from "@/modules/messaging/services/conversations";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params;
    await assertConversationMember(user.id, id);
    const conversation = await prisma.conversation.findUnique({ where: { id }, include: { members: { where: { leftAt: null }, include: { user: { select: { id: true, handle: true, name: true, displayName: true, image: true, presence: true, lastSeenAt: true } } } } } });
    return ok({ conversation });
  } catch (error) { return fail(error); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardApiAbuse(request, "conversations:id:patch");
    const user = await requireUser(); const input = await body(request, z.object({ isPinned: z.boolean().optional(), isMuted: z.boolean().optional(), isArchived: z.boolean().optional(), isFavorite: z.boolean().optional(), draftText: z.string().max(10000).nullable().optional() }));
    return ok({ member: await updateMemberFlags(user.id, (await params).id, input) });
  } catch (error) { return fail(error); }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardApiAbuse(_request, "conversations:id:delete"); const user = await requireUser(); return ok({ member: await leaveConversation(user.id, (await params).id) }); } catch (error) { return fail(error); }
}
