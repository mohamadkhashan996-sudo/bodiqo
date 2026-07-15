import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import catalog from "../src/data/catalog.json";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding BODIQO catalog…");

  for (const name of [...new Set(catalog.products.map((p) => p.category))]) {
    const slug = name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await prisma.category.upsert({
      where: { slug },
      update: { name },
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

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        title: product.title,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        compareAt: product.compareAt,
        currency: product.currency,
        sku: product.sku,
        vendor: product.vendor,
        images: product.images,
        featured: product.featured,
        inStock: product.inStock,
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
        sku: product.sku,
        vendor: product.vendor,
        images: product.images,
        featured: product.featured,
        inStock: product.inStock,
        categoryId: category?.id,
      },
    });
  }

  const demoHash = await bcrypt.hash("bodiqo1234", 12);
  await prisma.user.upsert({
    where: { email: "demo@bodiqo.com" },
    update: {},
    create: {
      email: "demo@bodiqo.com",
      name: "BODIQO Demo",
      passwordHash: demoHash,
      role: "ADMIN",
    },
  });

  console.log(`Seeded ${catalog.products.length} products + demo user.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
