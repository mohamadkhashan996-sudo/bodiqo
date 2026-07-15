/**
 * Optional DEMO seed for local UI exploration only.
 * Never run against production.
 *
 *   npm run db:seed:demo
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import catalog from "../src/data/catalog.json";
import { CATEGORIES, slugifyCategory } from "../src/lib/catalog-types";
import { SETTING_KEYS } from "../src/lib/settings-schema";
import { setupCookieValue } from "../src/lib/setup-cookie";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("db:seed:demo is blocked in production");
  }

  console.log("Seeding DEMO data (local only)…");

  for (const key of Object.values(SETTING_KEYS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: {} },
    });
  }

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
        price: product.price,
        images: product.images,
        categoryId: category?.id,
        enabled: true,
        status: "PUBLISHED",
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

  const demoHash = await bcrypt.hash("bodiqo1234", 12);
  await prisma.user.upsert({
    where: { email: "demo@bodiqo.com" },
    update: { role: "ADMIN", passwordHash: demoHash },
    create: {
      email: "demo@bodiqo.com",
      name: "BODIQO Demo Admin",
      passwordHash: demoHash,
      role: "ADMIN",
    },
  });

  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.setup },
    update: {
      value: { completedAt: new Date().toISOString(), version: 1 },
    },
    create: {
      key: SETTING_KEYS.setup,
      value: { completedAt: new Date().toISOString(), version: 1 },
    },
  });

  await prisma.setting.deleteMany({ where: { key: "crypto" } });

  console.log("Demo seed complete.");
  console.log("Login: demo@bodiqo.com / bodiqo1234");
  console.log(
    "Setup cookie value (optional):",
    await setupCookieValue(process.env.AUTH_SECRET || ""),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
