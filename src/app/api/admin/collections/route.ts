import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/catalog-types";
import { z } from "zod";

const collectionSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const collections = await prisma.collection.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ collections });
}

export async function POST(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = collectionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const data = parsed.data;
  const collection = await prisma.collection.create({
    data: {
      name: data.name,
      slug: data.slug?.trim() || slugify(data.name),
      description: data.description ?? null,
      image: data.image ?? null,
      enabled: data.enabled,
      sortOrder: data.sortOrder,
    },
  });
  return NextResponse.json({ collection });
}
