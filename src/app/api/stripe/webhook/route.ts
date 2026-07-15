import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { constructWebhookEvent } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/order-inventory";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await constructWebhookEvent(body, signature);
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId =
      session.metadata?.orderId || session.client_reference_id || undefined;

    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ received: true });
    }

    if (order.status !== "PAID") {
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

      await prisma.payment.updateMany({
        where: { orderId: order.id, provider: "STRIPE" },
        data: {
          status: "COMPLETED",
          externalId: session.payment_intent?.toString() || session.id,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
