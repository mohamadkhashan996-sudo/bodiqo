import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProductBySlug } from "@/lib/catalog";

const itemSchema = z.object({
  slug: z.string(),
  quantity: z.number().int().min(1).max(20),
});

const checkoutSchema = z.object({
  email: z.string().email(),
  shippingName: z.string().min(2),
  shippingPhone: z.string().optional(),
  shippingAddress: z.string().min(5),
  shippingCity: z.string().min(2),
  shippingZip: z.string().optional(),
  shippingCountry: z.string().default("IL"),
  items: z.array(itemSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout data." },
        { status: 400 },
      );
    }

    const lineItems = parsed.data.items
      .map((item) => {
        const product = getProductBySlug(item.slug);
        if (!product) return null;
        return { product, quantity: item.quantity };
      })
      .filter(Boolean) as {
      product: NonNullable<ReturnType<typeof getProductBySlug>>;
      quantity: number;
    }[];

    if (!lineItems.length) {
      return NextResponse.json(
        { error: "No valid products in cart." },
        { status: 400 },
      );
    }

    const subtotal = lineItems.reduce(
      (sum, li) => sum + li.product.price * li.quantity,
      0,
    );
    const shipping = subtotal >= 250 ? 0 : 29.9;
    const total = subtotal + shipping;
    const orderNumber = `BQ-${Date.now().toString(36).toUpperCase()}`;

    const dbProducts = await prisma.product.findMany({
      where: { slug: { in: lineItems.map((li) => li.product.slug) } },
    });
    const bySlug = Object.fromEntries(dbProducts.map((p) => [p.slug, p]));

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session?.user?.id,
        email: parsed.data.email.toLowerCase(),
        status: "PENDING",
        subtotal,
        shipping,
        total,
        currency: "ILS",
        shippingName: parsed.data.shippingName,
        shippingPhone: parsed.data.shippingPhone,
        shippingAddress: parsed.data.shippingAddress,
        shippingCity: parsed.data.shippingCity,
        shippingZip: parsed.data.shippingZip,
        shippingCountry: parsed.data.shippingCountry,
        items: {
          create: lineItems.map((li) => ({
            productId: bySlug[li.product.slug]?.id,
            title: li.product.title,
            slug: li.product.slug,
            image: li.product.image,
            price: li.product.price,
            quantity: li.quantity,
          })),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      total: Number(order.total),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Checkout requires a connected PostgreSQL database. Start Docker with `docker compose up -d`, then run `npm run db:push && npm run db:seed`.",
      },
      { status: 503 },
    );
  }
}
