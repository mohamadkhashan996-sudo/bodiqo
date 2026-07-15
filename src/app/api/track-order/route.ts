import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const trackSchema = z.object({
  orderNumber: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "anon";
  const limited = rateLimit(`track:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = trackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { orderNumber, email } = parsed.data;
  const order = await prisma.order.findFirst({
    where: {
      orderNumber: orderNumber.trim(),
      email: email.toLowerCase().trim(),
    },
    include: {
      items: {
        select: {
          title: true,
          slug: true,
          image: true,
          price: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      discount: Number(order.discount),
      tax: Number(order.tax),
      total: Number(order.total),
      currency: order.currency,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      shippedAt: order.shippedAt,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      shippingName: order.shippingName,
      shippingCity: order.shippingCity,
      shippingCountry: order.shippingCountry,
      fulfillStatus: order.fulfillStatus,
      items: order.items.map((item) => ({
        title: item.title,
        slug: item.slug,
        image: item.image,
        price: Number(item.price),
        quantity: item.quantity,
      })),
    },
  });
}
