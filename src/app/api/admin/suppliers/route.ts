import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/catalog-types";

export async function GET() {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ suppliers });
}

export async function POST(request: Request) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const supplier = await prisma.supplier.create({
    data: {
      name,
      slug: body.slug ? slugify(String(body.slug)) : slugify(name),
      website: body.website || null,
      notes: body.notes || null,
      defaultShippingDays: Number(body.defaultShippingDays) || 12,
      currency: body.currency || "USD",
      enabled: body.enabled !== false,
    },
  });
  return NextResponse.json({ supplier });
}
