import { fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try { const user = await requireUser(); const communities = await prisma.community.findMany({ where: { visibility: "PUBLIC", members: { none: { userId: user.id, status: "JOINED" } } }, include: { owner: { select: { handle: true, name: true } } }, orderBy: [{ membersCount: "desc" }, { createdAt: "desc" }], take: 18 }); return ok({ communities }); } catch (error) { return fail(error); }
}
