import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/assert-admin";
import { restoreOrderStock } from "@/lib/order-inventory";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const data: {
    status?: string;
    trackingNumber?: string | null;
    carrier?: string | null;
    shippedAt?: Date;
  } = {
    status: body.status,
    trackingNumber: body.trackingNumber || null,
    carrier: body.carrier || null,
  };
  if (body.status === "SHIPPED") {
    data.shippedAt = new Date();
  }

  const order = await prisma.order.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
  });

  if (
    body.status === "REFUNDED" &&
    existing.status !== "REFUNDED" &&
    (existing.status === "PAID" ||
      existing.status === "PROCESSING" ||
      existing.status === "SHIPPED" ||
      existing.status === "DELIVERED" ||
      existing.paidAt != null)
  ) {
    await restoreOrderStock(existing.items, true);
  }

  return NextResponse.json({ order });
}
