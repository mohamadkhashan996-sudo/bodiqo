import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/order-inventory";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const orderNumber = request.nextUrl.searchParams.get("order");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  try {
    const { stripe } = await getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const orderId =
      session.metadata?.orderId || session.client_reference_id || undefined;
    const order = orderId
      ? await prisma.order.findUnique({ where: { id: orderId } })
      : orderNumber
        ? await prisma.order.findUnique({ where: { orderNumber } })
        : null;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (
      session.payment_status === "paid" &&
      order.status !== "PAID"
    ) {
      await markOrderPaid(order.id);
      await prisma.order.update({
        where: { id: order.id },
        data: {
          stripeSessionId: session.id,
          stripePaymentIntent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      paid: order.status === "PAID" || session.payment_status === "paid",
      paymentStatus: session.payment_status,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe error" },
      { status: 503 },
    );
  }
}
