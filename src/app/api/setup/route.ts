import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { setSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";
import {
  SETUP_COOKIE,
  isSetupComplete,
  setupCookieValue,
} from "@/lib/setup";

const setupBodySchema = z.object({
  admin: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
  store: z.object({
    storeName: z.string().min(1).max(80),
    storeTagline: z.string().max(200).default(""),
    supportEmail: z.string().email().or(z.literal("")).default(""),
    logoUrl: z.string().default(""),
    currency: z.string().min(3).max(8).default("ILS"),
    currencySymbol: z.string().max(8).default("₪"),
    language: z.enum(["en", "ar", "he"]).default("en"),
  }),
  paypal: z
    .object({
      enabled: z.boolean().default(false),
      mode: z.enum(["sandbox", "live"]).default("sandbox"),
      businessEmail: z.string().default(""),
      clientId: z.string().default(""),
      clientSecret: z.string().default(""),
    })
    .default({}),
});

export async function POST(request: Request) {
  if (await isSetupComplete()) {
    return NextResponse.json(
      { error: "Setup already completed" },
      { status: 409 },
    );
  }

  if (!process.env.AUTH_SECRET) {
    return NextResponse.json(
      { error: "AUTH_SECRET is missing in .env — required before setup." },
      { status: 500 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") || "anon";
  const limited = rateLimit(`setup:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = setupBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid setup data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { admin, store, paypal } = parsed.data;
  const email = admin.email.toLowerCase().trim();

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (existingAdmin) {
    return NextResponse.json(
      {
        error:
          "An admin already exists. Sign in or reset the database to run setup again.",
      },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(admin.password, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        name: admin.name.trim(),
        email,
        passwordHash,
        role: "ADMIN",
      },
    });

    // Clear any leftover demo user email collision handled by create above
  });

  await setSetting(SETTING_KEYS.store, {
    storeName: store.storeName.trim(),
    storeTagline: store.storeTagline.trim(),
    supportEmail: store.supportEmail || email,
    logoUrl: store.logoUrl,
    currency: store.currency.toUpperCase(),
    currencySymbol: store.currencySymbol,
    language: store.language,
  });

  await setSetting(SETTING_KEYS.seo, {
    defaultTitle: `${store.storeName.trim()} | Premium Marketplace`,
    defaultDescription:
      store.storeTagline.trim() ||
      "Premium marketplace for everyday essentials.",
  });

  await setSetting(SETTING_KEYS.homepage, {
    heroHeadline: store.storeTagline.trim() || "Shop everything. Beautifully.",
    heroSubheadline:
      "Your store is ready. Add products from the admin dashboard.",
    heroCtaLabel: "Shop collection",
    heroCtaHref: "/shop",
  });

  const paypalEnabled =
    paypal.enabled && Boolean(paypal.clientId && paypal.clientSecret);
  await setSetting(SETTING_KEYS.paypal, {
    enabled: paypalEnabled,
    mode: paypal.mode,
    businessEmail: paypal.businessEmail,
    clientId: paypal.clientId,
    clientSecret: paypal.clientSecret,
    brandName: store.storeName.trim(),
    connectedAt: paypalEnabled ? new Date().toISOString() : "",
  });

  // Minimal navigation so the store is usable after setup
  const menuCount = await prisma.menuItem.count();
  if (menuCount === 0) {
    const items = [
      { label: "Shop", href: "/shop", sortOrder: 1, location: "header" },
      {
        label: "Categories",
        href: "/categories",
        sortOrder: 2,
        location: "header",
      },
      { label: "About", href: "/about", sortOrder: 3, location: "header" },
      { label: "Privacy", href: "/privacy", sortOrder: 1, location: "footer" },
      { label: "Terms", href: "/terms", sortOrder: 2, location: "footer" },
      { label: "Contact", href: "/contact", sortOrder: 3, location: "footer" },
    ];
    await prisma.menuItem.createMany({
      data: items.map((i) => ({ ...i, enabled: true })),
    });
  }

  await setSetting(SETTING_KEYS.setup, {
    completedAt: new Date().toISOString(),
    version: 1,
  });

  const res = NextResponse.json({
    ok: true,
    redirectTo: "/auth/sign-in?callbackUrl=/admin",
  });

  const cookieVal = await setupCookieValue();
  if (cookieVal) {
    res.cookies.set(SETUP_COOKIE, cookieVal, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 5,
    });
  }

  return res;
}
