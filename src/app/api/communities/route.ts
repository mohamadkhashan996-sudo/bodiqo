import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({ name: z.string().min(2).max(80), slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/), description: z.string().max(2000).optional(), category: z.string().max(80).optional(), image: z.string().url().optional(), coverImage: z.string().url().optional(), rules: z.string().max(4000).optional(), visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC") });
export async function GET() {
  try { const user = await requireUser(); const communities = await prisma.community.findMany({ include: { members: { where: { userId: user.id }, select: { status: true, role: true } }, owner: { select: { handle: true, name: true } } }, orderBy: { membersCount: "desc" }, take: 50 }); return ok({ communities }); } catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  try { await guardApiAbuse(request, "communities:write", 15); const user = await requireUser(); const input = await body(request, createSchema); const community = await prisma.community.create({ data: { ...input, ownerId: user.id, members: { create: { userId: user.id, role: "OWNER" } } }, include: { members: true } }); return ok({ community }, 201); } catch (error) { return fail(error); }
}
