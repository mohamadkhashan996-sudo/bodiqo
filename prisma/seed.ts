import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import catalog from "../src/data/catalog.json";
import { CATEGORIES, slugifyCategory } from "../src/lib/catalog-types";
import { SETTING_KEYS } from "../src/lib/settings-schema";

const prisma = new PrismaClient();

const POLICY_PAGES = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    content:
      "BODIQO respects your privacy. We collect account, order, and device information solely to operate the marketplace, process payments, and improve your experience. We do not sell personal data.",
  },
  {
    slug: "terms",
    title: "Terms of Service",
    content:
      "By using BODIQO you agree to our marketplace terms. Products are sold by BODIQO; fulfillment may involve vetted suppliers. Prices, stock, and shipping estimates may change without notice until an order is confirmed.",
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    content:
      "If an item arrives damaged or incorrect, contact support within 14 days with photos and your order number. Approved refunds restore inventory and return funds via the original payment method where possible.",
  },
  {
    slug: "shipping-policy",
    title: "Shipping Policy",
    content:
      "Orders ship after payment confirmation. Delivery windows vary by destination and supplier. Tracking numbers appear in your account and Track Order page once available.",
  },
];

async function main() {
  console.log("Seeding BODIQO marketplace…");

  for (const key of Object.values(SETTING_KEYS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: {} },
    });
  }

  await prisma.supplier.upsert({
    where: { slug: "aliexpress" },
    update: {},
    create: {
      name: "AliExpress",
      slug: "aliexpress",
      website: "https://www.aliexpress.com",
      notes: "Default dropshipping supplier",
      defaultShippingDays: 15,
      currency: "USD",
    },
  });

  for (const [index, name] of CATEGORIES.entries()) {
    const slug = slugifyCategory(name);
    await prisma.category.upsert({
      where: { slug },
      update: { name, enabled: true, sortOrder: index },
      create: {
        name,
        slug,
        description: `${name} products on BODIQO.`,
        sortOrder: index,
      },
    });
  }

  // Map legacy catalog categories into Automotive when unknown
  for (const product of catalog.products) {
    let category = await prisma.category.findFirst({
      where: { name: product.category },
    });
    if (!category) {
      category = await prisma.category.findUnique({
        where: { slug: "automotive" },
      });
    }

    const sku = `BQ-${product.id.replace(/^prod_/, "")}`;

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        title: product.title,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        compareAt: product.compareAt,
        currency: product.currency,
        sku,
        vendor: product.vendor,
        brand: product.vendor,
        images: product.images,
        featured: product.featured,
        inStock: product.inStock,
        enabled: true,
        status: "PUBLISHED",
        inventory: 50,
        categoryId: category?.id,
      },
      create: {
        slug: product.slug,
        title: product.title,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        compareAt: product.compareAt,
        currency: product.currency,
        sku,
        vendor: product.vendor,
        brand: product.vendor,
        images: product.images,
        featured: product.featured,
        inStock: product.inStock,
        enabled: true,
        status: "PUBLISHED",
        inventory: 50,
        categoryId: category?.id,
      },
    });
  }

  for (const page of POLICY_PAGES) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        content: page.content,
        published: true,
      },
      create: {
        ...page,
        published: true,
        seoTitle: `${page.title} | BODIQO`,
      },
    });
  }

  await prisma.blogPost.upsert({
    where: { slug: "welcome-to-bodiqo" },
    update: {},
    create: {
      title: "Welcome to BODIQO",
      slug: "welcome-to-bodiqo",
      excerpt: "A premium marketplace for everything you need — curated with care.",
      content:
        "BODIQO is a premium international marketplace. Shop electronics, home, fashion, beauty, sports, and more — managed from a single Shopify-like admin.",
      published: true,
      publishedAt: new Date(),
    },
  });

  await prisma.collection.upsert({
    where: { slug: "featured" },
    update: { enabled: true },
    create: {
      name: "Featured",
      slug: "featured",
      description: "Hand-picked BODIQO favorites",
      enabled: true,
    },
  });

  const menuDefaults = [
    { label: "Shop", href: "/shop", sortOrder: 1 },
    { label: "Categories", href: "/categories", sortOrder: 2 },
    { label: "Blog", href: "/blog", sortOrder: 3 },
    { label: "Track order", href: "/track-order", sortOrder: 4 },
    { label: "About", href: "/about", sortOrder: 5 },
  ];

  const existingMenus = await prisma.menuItem.count();
  if (existingMenus === 0) {
    for (const item of menuDefaults) {
      await prisma.menuItem.create({
        data: { ...item, location: "header", enabled: true },
      });
    }
  }

  const footerMenus = [
    { label: "Privacy", href: "/privacy", sortOrder: 1 },
    { label: "Terms", href: "/terms", sortOrder: 2 },
    { label: "Refunds", href: "/refund", sortOrder: 3 },
    { label: "Shipping", href: "/shipping-policy", sortOrder: 4 },
    { label: "Contact", href: "/contact", sortOrder: 5 },
  ];
  const footerCount = await prisma.menuItem.count({
    where: { location: "footer" },
  });
  if (footerCount === 0) {
    for (const item of footerMenus) {
      await prisma.menuItem.create({
        data: { ...item, location: "footer", enabled: true },
      });
    }
  }

  await prisma.taxRate.upsert({
    where: { id: "seed-tax-il" },
    update: { rate: 17, enabled: true },
    create: {
      id: "seed-tax-il",
      name: "Israel VAT",
      country: "IL",
      rate: 17,
      enabled: true,
    },
  });

  const demoHash = await bcrypt.hash("bodiqo1234", 12);
  await prisma.user.upsert({
    where: { email: "demo@bodiqo.com" },
    update: { role: "ADMIN", passwordHash: demoHash },
    create: {
      email: "demo@bodiqo.com",
      name: "BODIQO Admin",
      passwordHash: demoHash,
      role: "ADMIN",
    },
  });

  console.log("Seed complete: categories, products, policies, blog, menus, admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
