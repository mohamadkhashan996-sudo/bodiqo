import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import {
  importFromAliExpressUrl,
  priceFromCost,
  suggestedSku,
  suggestedSlug,
} from "@/lib/aliexpress";
async function ensureAliExpressSupplier() {
  return prisma.supplier.upsert({
    where: { slug: "aliexpress" },
    update: {},
    create: {
      name: "AliExpress",
      slug: "aliexpress",
      website: "https://www.aliexpress.com",
      notes: "Default dropshipping supplier",
      defaultShippingDays: 15,
      currency: "USD",
    },
  });
}

export async function POST(request: Request) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const url = String(body.url || "").trim();
  if (!url) {
    return NextResponse.json(
      { error: "Product URL is required." },
      { status: 400 },
    );
  }

  const markup = Number(body.markupPercent ?? 40);
  const publish = Boolean(body.publish);
  const manualTitle = body.title ? String(body.title) : "";
  const manualPrice = body.price != null ? Number(body.price) : null;
  const manualCost = body.costPrice != null ? Number(body.costPrice) : null;
  const variants = Array.isArray(body.variants) ? body.variants : [];

  const parsed = await importFromAliExpressUrl(url);
  const supplier = await ensureAliExpressSupplier();

  const cost =
    manualCost && manualCost > 0
      ? manualCost
      : parsed.price && parsed.price > 0
        ? parsed.price
        : null;

  const retail =
    manualPrice && manualPrice > 0
      ? manualPrice
      : cost
        ? priceFromCost(cost, Number.isFinite(markup) ? markup : 40)
        : 29.9;

  const title = manualTitle || parsed.title;
  const slug = suggestedSlug(title, parsed.productId);
  const sku = suggestedSku(parsed.productId);

  // Avoid duplicate imports for same AliExpress product id
  if (parsed.productId) {
    const existing = await prisma.product.findFirst({
      where: { supplierProductId: parsed.productId },
    });
    if (existing) {
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: {
          title,
          description: parsed.description,
          shortDescription: parsed.description.slice(0, 280),
          ...(parsed.images.length ? { images: parsed.images } : {}),
          supplierProductUrl: parsed.canonicalUrl,
          supplierId: supplier.id,
          costPrice: cost,
          price: retail,
          markupPercent: markup,
          dropshipEnabled: true,
          enabled: publish ? true : existing.enabled,
        },
      });
      return NextResponse.json({
        product: updated,
        updated: true,
        parsed,
      });
    }
  }

  const category = await prisma.category.upsert({
    where: { slug: "dropship" },
    update: {},
    create: {
      name: "Dropship",
      slug: "dropship",
      description: "Products imported via dropshipping",
    },
  });

  const product = await prisma.product.create({
    data: {
      slug,
      title,
      description: parsed.description,
      shortDescription: parsed.description.slice(0, 280),
      price: retail,
      costPrice: cost,
      currency: "ILS",
      sku,
      vendor: "BODIQO",
      images: parsed.images,
      featured: false,
      enabled: publish,
      inStock: true,
      inventory: 50,
      categoryId: category.id,
      supplierId: supplier.id,
      supplierProductUrl: parsed.canonicalUrl,
      supplierProductId: parsed.productId,
      markupPercent: markup,
      dropshipEnabled: true,
      lastCostSyncAt: new Date(),
      variants: variants.length
        ? {
            create: variants.map(
              (
                v: {
                  title?: string;
                  sku?: string;
                  price?: number;
                  costPrice?: number;
                  inventory?: number;
                  supplierSku?: string;
                },
                index: number,
              ) => ({
                title: v.title || `Variant ${index + 1}`,
                sku: v.sku || `${sku}-V${index + 1}`,
                price: Number(v.price) || retail,
                costPrice: v.costPrice != null ? Number(v.costPrice) : cost,
                inventory: Number(v.inventory) || 0,
                supplierSku: v.supplierSku,
                supplierUrl: parsed.canonicalUrl,
                sortOrder: index,
              }),
            ),
          }
        : undefined,
    },
    include: { variants: true, supplier: true },
  });

  await prisma.importJob.create({
    data: {
      source: "aliexpress-url",
      status: "completed",
      totalRows: 1,
      successRows: 1,
      errorRows: 0,
      log: `Imported ${product.id} from ${parsed.canonicalUrl}`,
    },
  });

  return NextResponse.json({ product, updated: false, parsed });
}

export async function GET() {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    tip: "POST { url, markupPercent?, publish?, title?, price?, costPrice?, variants? }",
  });
}
