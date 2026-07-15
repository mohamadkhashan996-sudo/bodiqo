import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/catalog-types";
import { z } from "zod";

async function assertAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? session : null;
}

const productSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().default(""),
  shortDescription: z.string().default(""),
  price: z.number().positive(),
  compareAt: z.number().positive().nullable().optional(),
  sku: z.string().min(1),
  vendor: z.string().default("BODIQO"),
  images: z.array(z.string()).default([]),
  videoUrl: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  enabled: z.boolean().default(true),
  inStock: z.boolean().default(true),
  inventory: z.number().int().default(0),
  categoryId: z.string().nullable().optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!product)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(request: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid product data" },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const product = await prisma.product.update({
    where: { id },
    data: {
      ...data,
      slug: data.slug?.trim() || slugify(data.title),
      compareAt: data.compareAt ?? null,
      videoUrl: data.videoUrl ?? null,
      categoryId: data.categoryId || null,
    },
  });
  return NextResponse.json({ product });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
