import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const menuSchema = z.object({
  label: z.string().min(1).optional(),
  href: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  location: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = menuSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const data = parsed.data;
  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...data,
      parentId: data.parentId === undefined ? undefined : data.parentId,
    },
  });
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
