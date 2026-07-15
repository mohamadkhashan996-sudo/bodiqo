import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";

/**
 * List dropship orders needing supplier fulfillment,
 * or export CSV for AliExpress / supplier ordering.
 */
export async function GET(request: Request) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const status = searchParams.get("fulfillStatus") || undefined;

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["PAID", "PROCESSING", "AWAITING_PAYMENT", "PENDING"] },
      ...(status ? { fulfillStatus: status } : {}),
    },
    include: {
      items: {
        include: {
          product: {
            include: { supplier: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  if (format === "csv") {
    const header = [
      "order_number",
      "order_date",
      "customer_name",
      "customer_email",
      "customer_phone",
      "shipping_address",
      "shipping_city",
      "shipping_zip",
      "shipping_country",
      "product_title",
      "quantity",
      "sell_price",
      "cost_price",
      "supplier",
      "supplier_sku",
      "supplier_url",
      "fulfill_status",
      "supplier_order_id",
    ];

    const lines = [header.join(",")];
    for (const order of orders) {
      for (const item of order.items) {
        const cols = [
          order.orderNumber,
          order.createdAt.toISOString(),
          order.shippingName,
          order.email,
          order.shippingPhone || "",
          order.shippingAddress,
          order.shippingCity,
          order.shippingZip || "",
          order.shippingCountry,
          item.title,
          String(item.quantity),
          String(item.price),
          String(item.costPrice ?? item.product?.costPrice ?? ""),
          item.product?.supplier?.name || "",
          item.supplierSku ||
            item.product?.supplierSku ||
            item.product?.supplierProductId ||
            "",
          item.supplierUrl || item.product?.supplierProductUrl || "",
          order.fulfillStatus,
          order.supplierOrderId || "",
        ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
        lines.push(cols.join(","));
      }
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="supplier-orders-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({
    orders: orders.map((o) => ({
      ...o,
      total: Number(o.total),
      items: o.items.map((i) => ({
        ...i,
        price: Number(i.price),
        costPrice: i.costPrice != null ? Number(i.costPrice) : null,
      })),
    })),
  });
}

export async function PATCH(request: Request) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const ids: string[] = Array.isArray(body.orderIds)
    ? body.orderIds
    : body.orderId
      ? [body.orderId]
      : [];

  if (!ids.length) {
    return NextResponse.json({ error: "No orders selected" }, { status: 400 });
  }

  const data: {
    fulfillStatus?: string;
    supplierOrderId?: string;
    supplierOrderedAt?: Date;
    status?: "PROCESSING" | "SHIPPED";
    trackingNumber?: string;
    carrier?: string;
  } = {};

  if (body.fulfillStatus) data.fulfillStatus = String(body.fulfillStatus);
  if (body.supplierOrderId != null) {
    data.supplierOrderId = String(body.supplierOrderId);
  }
  if (body.fulfillStatus === "ORDERED_SUPPLIER") {
    data.supplierOrderedAt = new Date();
    data.status = "PROCESSING";
  }
  if (body.trackingNumber) data.trackingNumber = String(body.trackingNumber);
  if (body.carrier) data.carrier = String(body.carrier);
  if (body.fulfillStatus === "SHIPPED") {
    data.status = "SHIPPED";
  }

  await prisma.order.updateMany({
    where: { id: { in: ids } },
    data,
  });

  return NextResponse.json({ ok: true, updated: ids.length });
}
