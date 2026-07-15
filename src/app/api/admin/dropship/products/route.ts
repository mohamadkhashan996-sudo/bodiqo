import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { priceFromCost } from "@/lib/aliexpress";

/** Bulk update stock / prices / cost for dropship products */
export async function PATCH(request: Request) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates = Array.isArray(body.updates) ? body.updates : [];
  const recalculateFromCost = Boolean(body.recalculateFromCost);

  let updated = 0;
  for (const row of updates) {
    const id = String(row.id || "");
    if (!id) continue;

    const data: {
      inventory?: number;
      inStock?: boolean;
      price?: number;
      costPrice?: number;
      markupPercent?: number;
      enabled?: boolean;
      lastCostSyncAt?: Date;
    } = {};

    if (row.inventory != null) {
      data.inventory = Number(row.inventory);
      data.inStock = data.inventory > 0;
    }
    if (row.costPrice != null) {
      data.costPrice = Number(row.costPrice);
      data.lastCostSyncAt = new Date();
    }
    if (row.markupPercent != null) {
      data.markupPercent = Number(row.markupPercent);
    }
    if (row.price != null && !recalculateFromCost) {
      data.price = Number(row.price);
    }
    if (row.enabled != null) data.enabled = Boolean(row.enabled);

    if (recalculateFromCost) {
      const current = await prisma.product.findUnique({ where: { id } });
      if (current) {
        const cost = data.costPrice ?? Number(current.costPrice ?? 0);
        const markup =
          data.markupPercent ?? Number(current.markupPercent ?? 40);
        if (cost > 0) data.price = priceFromCost(cost, markup);
      }
    }

    if (Object.keys(data).length === 0) continue;
    await prisma.product.update({ where: { id }, data });
    updated++;
  }

  return NextResponse.json({ ok: true, updated });
}

export async function GET() {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { dropshipEnabled: true },
    include: {
      supplier: true,
      variants: { orderBy: { sortOrder: "asc" } },
      category: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    products: products.map((p) => ({
      ...p,
      price: Number(p.price),
      costPrice: p.costPrice != null ? Number(p.costPrice) : null,
      markupPercent: Number(p.markupPercent),
      compareAt: p.compareAt != null ? Number(p.compareAt) : null,
      variants: p.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        costPrice: v.costPrice != null ? Number(v.costPrice) : null,
      })),
    })),
  });
}
