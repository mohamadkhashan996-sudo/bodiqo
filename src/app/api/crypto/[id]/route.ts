import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/assert-admin";
import { markOrderPaid } from "@/lib/order-inventory";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const payment = await prisma.cryptoPayment.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    payment.expiresAt &&
    payment.expiresAt < new Date() &&
    payment.status === "WAITING"
  ) {
    await prisma.cryptoPayment.update({
      where: { id: payment.id },
      data: { status: "EXPIRED" },
    });
    payment.status = "EXPIRED";
  }

  return NextResponse.json({
    id: payment.id,
    coin: payment.coin,
    network: payment.network,
    address: payment.address,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    txid: payment.txid,
    expiresAt: payment.expiresAt,
    confirmedAt: payment.confirmedAt,
    order: payment.order,
  });
}

const patchSchema = z.object({
  status: z.enum(["CONFIRMING", "CONFIRMED", "FAILED", "EXPIRED"]).optional(),
  txid: z.string().trim().min(1).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const payment = await prisma.cryptoPayment.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextStatus =
    parsed.data.status ??
    (parsed.data.txid ? "CONFIRMED" : payment.status);

  const updated = await prisma.cryptoPayment.update({
    where: { id },
    data: {
      status: nextStatus,
      txid: parsed.data.txid ?? undefined,
      confirmedAt: nextStatus === "CONFIRMED" ? new Date() : undefined,
    },
  });

  if (nextStatus === "CONFIRMED" && payment.order.status !== "PAID") {
    await markOrderPaid(payment.orderId);
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentProvider: "CRYPTO" },
    });
    await prisma.payment.create({
      data: {
        orderId: payment.orderId,
        provider: "CRYPTO",
        externalId: parsed.data.txid || updated.id,
        amount: payment.order.total,
        currency: payment.order.currency,
        status: "COMPLETED",
      },
    });
  }

  return NextResponse.json({ payment: updated });
}
