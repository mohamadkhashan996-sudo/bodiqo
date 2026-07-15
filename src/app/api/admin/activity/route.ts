import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const action = searchParams.get("action")?.trim() || "";
  const take = Math.min(200, Math.max(1, Number(searchParams.get("take") || 80)));

  const logs = await prisma.activityLog.findMany({
    where: {
      AND: [
        action ? { action: { contains: action } } : {},
        q
          ? {
              OR: [
                { actorEmail: { contains: q } },
                { summary: { contains: q } },
                { entity: { contains: q } },
                { entityId: { contains: q } },
                { action: { contains: q } },
              ],
            }
          : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ logs });
}
