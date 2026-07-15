import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProductBySlugSync } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";
import {
  createPaypalOrder,
  getPaypalApproveLink,
  getPaypalConfig,
} from "@/lib/paypal";

const emptyToUndefined = z.literal("").transform(() => undefined);

const optionalText = z
  .union([z.string().trim(), emptyToUndefined])
  .optional()
  .transform((v) => (v == null || v === "" ? undefined : v));

const itemSchema = z.object({
  slug: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
});

const checkoutSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  shippingName: z.string().trim().min(2, "Full name is required"),
  shippingPhone: optionalText,
  shippingAddress: z.string().trim().min(3, "Address is required"),
  shippingCity: z.string().trim().min(2, "City is required"),
  shippingZip: optionalText,
  shippingCountry: z
    .union([z.string().trim().min(2), emptyToUndefined])
    .optional()
    .transform((v) => v || "IL"),
  couponCode: optionalText,
  items: z.array(itemSchema).min(1, "Your cart is empty"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => issue.message)
        .filter(Boolean);
      return NextResponse.json(
        {
          error: details[0] || "Invalid checkout data.",
          details,
        },
        { status: 400 },
      );
    }

    const shippingSettings = await getSetting(SETTING_KEYS.shipping);
    const storeSettings = await getSetting(SETTING_KEYS.store);
    const paypal = await getPaypalConfig();

    const lineItems: {
      product: {
        id: string | null;
        slug: string;
        title: string;
        image: string;
        price: number;
        costPrice: number | null;
        supplierUrl: string | null;
        supplierSku: string | null;
      };
      quantity: number;
    }[] = [];
    for (const item of parsed.data.items) {
      const dbProduct = await prisma.product.findFirst({
        where: { slug: item.slug, enabled: true },
      });
      if (dbProduct) {
        lineItems.push({
          product: {
            id: dbProduct.id,
            slug: dbProduct.slug,
            title: dbProduct.title,
            image:
              (Array.isArray(dbProduct.images)
                ? (dbProduct.images as string[])[0]
                : "") ?? "",
            price: Number(dbProduct.price),
            costPrice:
              dbProduct.costPrice != null ? Number(dbProduct.costPrice) : null,
            supplierUrl: dbProduct.supplierProductUrl,
            supplierSku:
              dbProduct.supplierSku || dbProduct.supplierProductId || null,
          },
          quantity: item.quantity,
        });
        continue;
      }
      const fallback = getProductBySlugSync(item.slug);
      if (fallback) {
        lineItems.push({
          product: {
            id: null,
            slug: fallback.slug,
            title: fallback.title,
            image: fallback.image,
            price: fallback.price,
            costPrice: null,
            supplierUrl: null,
            supplierSku: null,
          },
          quantity: item.quantity,
        });
      }
    }

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

    let discount = 0;
    if (parsed.data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: parsed.data.couponCode.toUpperCase() },
      });
      if (
        coupon?.enabled &&
        (!coupon.endsAt || coupon.endsAt > new Date()) &&
        (!coupon.maxUses || coupon.usedCount < coupon.maxUses) &&
        (!coupon.minSubtotal || subtotal >= Number(coupon.minSubtotal))
      ) {
        discount =
          coupon.type === "PERCENTAGE"
            ? (subtotal * Number(coupon.value)) / 100
            : Number(coupon.value);
        discount = Math.min(discount, subtotal);
      }
    }

    const shipping =
      subtotal - discount >= shippingSettings.freeThreshold
        ? 0
        : shippingSettings.flatRate;
    const total = Math.max(0, subtotal - discount + shipping);
    const currency = storeSettings.currency || "ILS";
    const orderNumber = `BQ-${Date.now().toString(36).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session?.user?.id,
        email: parsed.data.email.toLowerCase(),
        status: paypal.enabled ? "AWAITING_PAYMENT" : "PENDING",
        subtotal,
        shipping,
        discount,
        total,
        currency,
        couponCode: parsed.data.couponCode?.toUpperCase(),
        shippingName: parsed.data.shippingName,
        shippingPhone: parsed.data.shippingPhone,
        shippingAddress: parsed.data.shippingAddress,
        shippingCity: parsed.data.shippingCity,
        shippingZip: parsed.data.shippingZip,
        shippingCountry: parsed.data.shippingCountry,
        fulfillStatus: "UNFULFILLED",
        items: {
          create: lineItems.map((li) => ({
            productId: li.product.id ?? undefined,
            title: li.product.title,
            slug: li.product.slug,
            image: li.product.image,
            price: li.product.price,
            quantity: li.quantity,
            costPrice: li.product.costPrice,
            supplierUrl: li.product.supplierUrl,
            supplierSku: li.product.supplierSku,
          })),
        },
      },
    });

    if (paypal.enabled) {
      const origin =
        request.headers.get("origin") ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "http://localhost:3000";

      const paypalOrder = await createPaypalOrder({
        orderNumber: order.orderNumber,
        total: Number(order.total),
        currency,
        returnUrl: `${origin}/api/paypal/capture?orderNumber=${order.orderNumber}`,
        cancelUrl: `${origin}/checkout?cancelled=1&order=${order.orderNumber}`,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { paypalOrderId: paypalOrder.id },
      });

      const approveUrl = getPaypalApproveLink(paypalOrder.links);
      return NextResponse.json({
        ok: true,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        payment: "paypal",
        approveUrl,
      });
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      payment: "manual",
      redirectUrl: `/checkout/success?order=${order.orderNumber}`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Checkout failed. Ensure PostgreSQL is running and PayPal is configured if enabled.",
      },
      { status: 503 },
    );
  }
}
