import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/catalog-types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const variants = await prisma.productVariant.findMany({
    where: { productId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({
    variants: variants.map((v) => ({
      ...v,
      price: Number(v.price),
      costPrice: v.costPrice != null ? Number(v.costPrice) : null,
    })),
  });
}

export async function POST(request: Request, { params }: Params) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const title = String(body.title || "").trim();
  if (!title) {
    return NextResponse.json(
      { error: "Variant title required" },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const sku =
    String(body.sku || "").trim() ||
    `${product.sku}-${slugify(title).slice(0, 16) || "v"}-${Date.now().toString(36).slice(-3)}`;

  const variant = await prisma.productVariant.create({
    data: {
      productId: id,
      title,
      sku,
      price: Number(body.price) || Number(product.price),
      compareAt: body.compareAt != null ? Number(body.compareAt) : null,
      costPrice: body.costPrice != null ? Number(body.costPrice) : null,
      inventory: Number(body.inventory) || 0,
      inStock: (Number(body.inventory) || 0) > 0,
      image: body.image || null,
      supplierSku: body.supplierSku || null,
      supplierUrl: body.supplierUrl || product.supplierProductUrl,
      options: body.options || null,
      enabled: body.enabled !== false,
    },
  });

  return NextResponse.json({ variant });
}

export async function PUT(request: Request, { params }: Params) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const variantId = String(body.id || "");
  if (!variantId) {
    return NextResponse.json({ error: "Variant id required" }, { status: 400 });
  }

  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      title: body.title,
      sku: body.sku,
      price: body.price != null ? Number(body.price) : undefined,
      costPrice: body.costPrice != null ? Number(body.costPrice) : undefined,
      inventory: body.inventory != null ? Number(body.inventory) : undefined,
      inStock:
        body.inventory != null ? Number(body.inventory) > 0 : body.inStock,
      supplierSku: body.supplierSku,
      supplierUrl: body.supplierUrl,
      enabled: body.enabled,
      image: body.image,
    },
  });

  // keep params used
  void params;

  return NextResponse.json({ variant });
}

export async function DELETE(request: Request, { params }: Params) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get("variantId");
  if (!variantId) {
    return NextResponse.json({ error: "variantId required" }, { status: 400 });
  }
  await prisma.productVariant.delete({ where: { id: variantId } });
  void params;
  return NextResponse.json({ ok: true });
}
