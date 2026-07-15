import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturePaypalOrder } from "@/lib/paypal";

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get("orderNumber");
  const token = request.nextUrl.searchParams.get("token");

  if (!orderNumber) {
    return NextResponse.redirect(
      new URL("/checkout?error=missing", request.url),
    );
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.redirect(
        new URL("/checkout?error=notfound", request.url),
      );
    }

    // Already paid — don't double-count inventory
    if (order.status === "PAID" || order.paidAt) {
      return NextResponse.redirect(
        new URL(
          `/checkout/success?order=${order.orderNumber}&paid=1`,
          request.url,
        ),
      );
    }

    const paypalId = token || order.paypalOrderId;
    if (!paypalId) {
      return NextResponse.redirect(
        new URL("/checkout?error=paypal", request.url),
      );
    }

    const capture = await capturePaypalOrder(paypalId);
    const captureId =
      capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? capture.id;

    if (capture.status === "COMPLETED" || capture.status === "APPROVED") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paypalOrderId: paypalId,
          paypalCaptureId: captureId,
          paidAt: new Date(),
        },
      });

      for (const item of order.items) {
        if (!item.productId) continue;
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) continue;

        const newInventory = Math.max(0, product.inventory - item.quantity);
        const newReserved = Math.max(0, product.reserved - item.quantity);
        await prisma.product.update({
          where: { id: product.id },
          data: {
            inventory: newInventory,
            reserved: newReserved,
            soldCount: { increment: item.quantity },
            inStock: newInventory - newReserved > 0,
          },
        });
      }

      if (order.couponCode) {
        await prisma.coupon.updateMany({
          where: { code: order.couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }

      return NextResponse.redirect(
        new URL(
          `/checkout/success?order=${order.orderNumber}&paid=1`,
          request.url,
        ),
      );
    }

    return NextResponse.redirect(
      new URL(
        `/checkout?error=capture&order=${order.orderNumber}`,
        request.url,
      ),
    );
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(
      new URL(`/checkout?error=paypal&order=${orderNumber}`, request.url),
    );
  }
}
