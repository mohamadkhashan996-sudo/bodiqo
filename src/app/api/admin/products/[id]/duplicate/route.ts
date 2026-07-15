import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

function uniqueSlug(base: string, suffix: string) {
  const trimmed = base.replace(/-copy(-\d+)?$/, "");
  return `${trimmed}${suffix}`.slice(0, 80);
}

function uniqueSku(base: string, suffix: string) {
  const trimmed = base.replace(/-copy(-\d+)?$/i, "");
  return `${trimmed}${suffix}`.slice(0, 80);
}

export async function POST(_req: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const source = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let slug = uniqueSlug(source.slug, "-copy");
  let sku = uniqueSku(source.sku, "-copy");
  let n = 2;
  while (await prisma.product.findFirst({ where: { OR: [{ slug }, { sku }] } })) {
    slug = uniqueSlug(source.slug, `-copy-${n}`);
    sku = uniqueSku(source.sku, `-copy-${n}`);
    n += 1;
  }

  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    variants,
    ...productData
  } = source;

  const product = await prisma.product.create({
    data: {
      ...productData,
      images: source.images as Prisma.InputJsonValue,
      title: `${source.title} (Copy)`,
      slug,
      sku,
      status: "DRAFT",
      enabled: false,
      featured: false,
      soldCount: 0,
      reserved: 0,
      variants: {
        create: variants.map((v) => {
          const variantSku = uniqueSku(v.sku, "-copy");
          return {
            title: v.title,
            sku: variantSku,
            options: v.options === null ? undefined : (v.options as Prisma.InputJsonValue),
            price: v.price,
            compareAt: v.compareAt,
            costPrice: v.costPrice,
            inventory: v.inventory,
            inStock: v.inStock,
            image: v.image,
            supplierSku: v.supplierSku,
            supplierUrl: v.supplierUrl,
            enabled: v.enabled,
            sortOrder: v.sortOrder,
          };
        }),
      },
    },
    include: { variants: true },
  });

  return NextResponse.json({ product });
}
