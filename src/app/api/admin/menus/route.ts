import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const menuSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  sortOrder: z.number().int().default(0),
  enabled: z.boolean().default(true),
  parentId: z.string().nullable().optional(),
  location: z.string().default("header"),
});

export async function GET(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location") || undefined;
  const items = await prisma.menuItem.findMany({
    where: location ? { location } : undefined,
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    include: { children: { orderBy: { sortOrder: "asc" } } },
  });
  const roots = items.filter((i) => !i.parentId);
  return NextResponse.json({ items: roots, all: items });
}

export async function POST(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = menuSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const data = parsed.data;
  const item = await prisma.menuItem.create({
    data: {
      label: data.label,
      href: data.href,
      sortOrder: data.sortOrder,
      enabled: data.enabled,
      parentId: data.parentId || null,
      location: data.location,
    },
  });
  return NextResponse.json({ item });
}
