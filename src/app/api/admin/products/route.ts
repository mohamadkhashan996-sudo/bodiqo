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

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid product data" },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const slug = data.slug?.trim() || slugify(data.title);
  const product = await prisma.product.create({
    data: {
      ...data,
      slug,
      compareAt: data.compareAt ?? null,
      videoUrl: data.videoUrl ?? null,
      categoryId: data.categoryId || null,
    },
  });
  return NextResponse.json({ product });
}
