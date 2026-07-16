import { fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try { const user = await requireUser(); const { slug } = await params; const community = await prisma.community.findUnique({ where: { slug }, include: { owner: { select: { id: true, handle: true, name: true, image: true } }, members: { include: { user: { select: { id: true, name: true, handle: true, image: true, presence: true } } }, take: 12, orderBy: { joinedAt: "desc" } }, posts: { orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }], take: 50 } } }); if (!community) return new Response(JSON.stringify({ error: "Community not found" }), { status: 404 }); const membership = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: community.id, userId: user.id } } }); return ok({ community, membership }); } catch (error) { return fail(error); }
}
