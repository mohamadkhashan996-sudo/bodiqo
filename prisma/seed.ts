import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import catalog from "../src/data/catalog.json";
import { SETTING_KEYS } from "../src/lib/settings-schema";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding BODIQO…");

  const defaults: Record<string, object> = {
    [SETTING_KEYS.store]: {},
    [SETTING_KEYS.paypal]: {},
    [SETTING_KEYS.smtp]: {},
    [SETTING_KEYS.shipping]: {},
    [SETTING_KEYS.seo]: {},
    [SETTING_KEYS.homepage]: {},
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  for (const name of [...new Set(catalog.products.map((p) => p.category))]) {
    const slug = name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await prisma.category.upsert({
      where: { slug },
      update: { name, enabled: true },
      create: {
        name,
        slug,
        description: `Premium ${name.toLowerCase()} from BODIQO.`,
      },
    });
  }

  for (const product of catalog.products) {
    const category = await prisma.category.findFirst({
      where: { name: product.category },
    });

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
        images: product.images,
        featured: product.featured,
        inStock: product.inStock,
        enabled: true,
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
        images: product.images,
        featured: product.featured,
        inStock: product.inStock,
        enabled: true,
        inventory: 50,
        categoryId: category?.id,
      },
    });
  }

  const menuDefaults = [
    { label: "Shop", href: "/shop", sortOrder: 1 },
    { label: "Dash Cams", href: "/shop?category=Dash%20Cameras", sortOrder: 2 },
    {
      label: "Interior",
      href: "/shop?category=Interior%20Accessories",
      sortOrder: 3,
    },
    { label: "About", href: "/about", sortOrder: 4 },
  ];

  const existingMenus = await prisma.menuItem.count();
  if (existingMenus === 0) {
    for (const item of menuDefaults) {
      await prisma.menuItem.create({
        data: { ...item, location: "header", enabled: true },
      });
    }
  }

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

  console.log(
    `Seeded ${catalog.products.length} products, settings, menus, admin.`,
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
