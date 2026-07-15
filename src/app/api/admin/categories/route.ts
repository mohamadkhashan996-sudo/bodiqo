import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/catalog-types";
import { z } from "zod";

export async function GET() {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { children: true, parent: true },
  });
  return NextResponse.json({ categories });
}

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().optional(),
});

export async function POST(request: Request) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const category = await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug || slugify(parsed.data.name),
      description: parsed.data.description,
      parentId: parsed.data.parentId || null,
      enabled: parsed.data.enabled,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  return NextResponse.json({ category });
}
