import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse} from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await guardApiAbuse(request, "communities:slug:posts:post"); const user = await requireUser(); const input = await body(request, z.object({ body: z.string().min(1).max(10000), mediaUrl: z.string().url().optional() })); const community = await prisma.community.findUnique({ where: { slug: (await params).slug } }); if (!community) return new Response(JSON.stringify({ error: "Community not found" }), { status: 404 }); const member = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: community.id, userId: user.id } } }); if (!member || member.status !== "JOINED") return new Response(JSON.stringify({ error: "Join this community first" }), { status: 403 }); const post = await prisma.$transaction(async (tx) => { const next = await tx.communityPost.create({ data: { ...input, communityId: community.id, authorId: user.id } }); await tx.community.update({ where: { id: community.id }, data: { postsCount: { increment: 1 } } }); return next; }); return ok({ post }, 201); } catch (error) { return fail(error); }
}
