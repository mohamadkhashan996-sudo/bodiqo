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
import { createCheckoutSession } from "@/lib/stripe";
import {
  fulfillManualOrder,
  reserveAwaitingPayment,
} from "@/lib/order-inventory";
import { ProductStatus } from "@prisma/client";

const emptyToUndefined = z.literal("").transform(() => undefined);

const optionalText = z
  .union([z.string().trim(), emptyToUndefined])
  .optional()
  .transform((v) => (v == null || v === "" ? undefined : v));

const itemSchema = z.object({
  slug: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
  variantId: optionalText,
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
  paymentMethod: z
    .enum(["paypal", "stripe", "none"])
    .optional()
    .default("none"),
  items: z.array(itemSchema).min(1, "Your cart is empty"),
});

type ResolvedLine = {
  product: {
    id: string | null;
    slug: string;
    title: string;
    image: string;
    price: number;
    costPrice: number | null;
    supplierUrl: string | null;
    supplierSku: string | null;
    variantId: string | null;
    variantTitle: string | null;
  };
  quantity: number;
};

async function computeTax(
  shippingCountry: string,
  subtotal: number,
  discount: number,
  shipping: number,
) {
  const taxSettings = await getSetting(SETTING_KEYS.tax);
  if (!taxSettings.enabled) {
    return { tax: 0, taxRate: 0 };
  }

  const countryRate = await prisma.taxRate.findFirst({
    where: { country: shippingCountry.toUpperCase(), enabled: true },
    orderBy: { rate: "desc" },
  });

  const taxRate = countryRate
    ? Number(countryRate.rate)
    : taxSettings.defaultRate;

  if (taxRate <= 0) {
    return { tax: 0, taxRate: 0 };
  }

  const taxableBase = Math.max(0, subtotal - discount);
  let tax: number;

  if (taxSettings.pricesIncludeTax) {
    tax = (taxableBase * taxRate) / (100 + taxRate);
  } else {
    tax = (taxableBase * taxRate) / 100;
  }

  if (!taxSettings.pricesIncludeTax && shipping > 0) {
    tax += (shipping * taxRate) / 100;
  }

  return { tax: Math.round(tax * 100) / 100, taxRate };
}

async function resolveLineItems(
  items: z.infer<typeof checkoutSchema>["items"],
): Promise<{ lineItems: ResolvedLine[]; error?: string }> {
  const lineItems: ResolvedLine[] = [];

  for (const item of items) {
    const dbProduct = await prisma.product.findFirst({
      where: {
        slug: item.slug,
        enabled: true,
        status: ProductStatus.PUBLISHED,
      },
      include: {
        variants: item.variantId
          ? { where: { id: item.variantId, enabled: true } }
          : undefined,
      },
    });

    if (dbProduct) {
      const variant =
        item.variantId && Array.isArray(dbProduct.variants)
          ? dbProduct.variants[0]
          : null;

      if (item.variantId && !variant) {
        return { lineItems: [], error: "Selected variant is unavailable." };
      }

      if (variant) {
        if (!variant.inStock || variant.inventory < item.quantity) {
          return {
            lineItems: [],
            error: `${dbProduct.title} (${variant.title}) is out of stock / نفد من المخزن`,
          };
        }
        const images = Array.isArray(dbProduct.images)
          ? (dbProduct.images as string[])
          : [];
        lineItems.push({
          product: {
            id: dbProduct.id,
            slug: dbProduct.slug,
            title: dbProduct.title,
            image: variant.image || images[0] || "",
            price: Number(variant.price),
            costPrice:
              variant.costPrice != null ? Number(variant.costPrice) : null,
            supplierUrl: variant.supplierUrl || dbProduct.supplierProductUrl,
            supplierSku:
              variant.supplierSku ||
              dbProduct.supplierSku ||
              dbProduct.supplierProductId ||
              null,
            variantId: variant.id,
            variantTitle: variant.title,
          },
          quantity: item.quantity,
        });
        continue;
      }

      const available = dbProduct.inventory - dbProduct.reserved;
      if (available < item.quantity || !dbProduct.inStock) {
        return {
          lineItems: [],
          error: `${dbProduct.title} is out of stock / نفد من المخزن`,
        };
      }
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
          variantId: null,
          variantTitle: null,
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
          variantId: null,
          variantTitle: null,
        },
        quantity: item.quantity,
      });
    }
  }

  return { lineItems };
}

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

    const { lineItems, error: lineError } = await resolveLineItems(
      parsed.data.items,
    );
    if (lineError) {
      return NextResponse.json({ error: lineError }, { status: 400 });
    }
    if (!lineItems.length) {
      return NextResponse.json(
        { error: "No valid products in cart." },
        { status: 400 },
      );
    }

    const [shippingSettings, storeSettings, paypal, stripe] =
      await Promise.all([
        getSetting(SETTING_KEYS.shipping),
        getSetting(SETTING_KEYS.store),
        getPaypalConfig(),
        getSetting(SETTING_KEYS.stripe),
      ]);

    const paymentMethod = parsed.data.paymentMethod;
    if (paymentMethod === "paypal" && !paypal.enabled) {
      return NextResponse.json(
        { error: "PayPal is not enabled." },
        { status: 400 },
      );
    }
    if (paymentMethod === "stripe" && !stripe.enabled) {
      return NextResponse.json(
        { error: "Stripe is not enabled." },
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

    const { tax } = await computeTax(
      parsed.data.shippingCountry,
      subtotal,
      discount,
      shipping,
    );

    const total = Math.max(0, subtotal - discount + shipping + tax);
    const currency = storeSettings.currency || "ILS";
    const orderNumber = `BQ-${Date.now().toString(36).toUpperCase()}`;

    const awaitingPayment = ["paypal", "stripe"].includes(paymentMethod);

    const paymentProvider =
      paymentMethod === "paypal"
        ? "PAYPAL"
        : paymentMethod === "stripe"
          ? "STRIPE"
          : "MANUAL";

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session?.user?.id,
        email: parsed.data.email.toLowerCase(),
        status: awaitingPayment ? "AWAITING_PAYMENT" : "PENDING",
        subtotal,
        shipping,
        discount,
        tax,
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
        paymentProvider,
        items: {
          create: lineItems.map((li) => ({
            productId: li.product.id ?? undefined,
            variantId: li.product.variantId ?? undefined,
            title: li.product.variantTitle
              ? `${li.product.title} — ${li.product.variantTitle}`
              : li.product.title,
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

    const inventoryItems = lineItems.map((li) => ({
      productId: li.product.id,
      variantId: li.product.variantId,
      quantity: li.quantity,
    }));

    if (awaitingPayment) {
      await reserveAwaitingPayment(inventoryItems);
    } else {
      await fulfillManualOrder(inventoryItems);
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    if (paymentMethod === "paypal") {
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
        tax: Number(order.tax),
        payment: "paypal",
        approveUrl,
      });
    }

    if (paymentMethod === "stripe") {
      const priceFactor =
        subtotal > 0 ? (subtotal - discount) / subtotal : 1;
      const stripeLines = lineItems.map((li) => ({
        title: li.product.variantTitle
          ? `${li.product.title} — ${li.product.variantTitle}`
          : li.product.title,
        quantity: li.quantity,
        unitAmount: Math.round(li.product.price * priceFactor * 100) / 100,
      }));
      if (shipping > 0) {
        stripeLines.push({
          title: "Shipping",
          quantity: 1,
          unitAmount: shipping,
        });
      }
      if (tax > 0) {
        stripeLines.push({
          title: "Tax",
          quantity: 1,
          unitAmount: tax,
        });
      }

      const stripeSession = await createCheckoutSession({
        orderId: order.id,
        orderNumber: order.orderNumber,
        email: parsed.data.email,
        total: Number(order.total),
        currency,
        successUrl: `${origin}/checkout/success?order=${order.orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/checkout?cancelled=1&order=${order.orderNumber}`,
        lineItems: stripeLines,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: stripeSession.id },
      });

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "STRIPE",
          externalId: stripeSession.id,
          amount: order.total,
          currency,
          status: "PENDING",
        },
      });

      return NextResponse.json({
        ok: true,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        tax: Number(order.tax),
        payment: "stripe",
        url: stripeSession.url,
      });
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      tax: Number(order.tax),
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
            : "Checkout failed. Ensure the database is running and payment providers are configured.",
      },
      { status: 503 },
    );
  }
}
