import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/catalog-types";
import { z } from "zod";

const collectionSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = collectionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const data = parsed.data;
  const collection = await prisma.collection.update({
    where: { id },
    data: {
      ...data,
      slug: data.slug?.trim() || (data.name ? slugify(data.name) : undefined),
      description: data.description === undefined ? undefined : data.description,
      image: data.image === undefined ? undefined : data.image,
    },
  });
  return NextResponse.json({ collection });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
