import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum([
    "publish",
    "draft",
    "archive",
    "delete",
    "feature",
    "unfeature",
  ]),
});

export async function POST(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bulkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { ids, action } = parsed.data;

  switch (action) {
    case "publish":
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { status: "PUBLISHED", enabled: true },
      });
      break;
    case "draft":
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { status: "DRAFT" },
      });
      break;
    case "archive":
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { status: "ARCHIVED", enabled: false },
      });
      break;
    case "feature":
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { featured: true },
      });
      break;
    case "unfeature":
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { featured: false },
      });
      break;
    case "delete":
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
      break;
  }

  return NextResponse.json({ ok: true, action, count: ids.length });
}
