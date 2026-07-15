/**
 * Remove demo admin + catalog sample products and reset setup flag
 * so the first-launch wizard runs again.
 *
 *   npm run db:purge-demo
 */
import { PrismaClient } from "@prisma/client";
import catalog from "../src/data/catalog.json";
import { SETTING_KEYS } from "../src/lib/settings-schema";

const prisma = new PrismaClient();

async function main() {
  console.log("Purging demo data…");

  const demo = await prisma.user.deleteMany({
    where: { email: "demo@bodiqo.com" },
  });

  const slugs = (catalog.products as { slug: string }[]).map((p) => p.slug);
  const products = await prisma.product.deleteMany({
    where: { slug: { in: slugs } },
  });

  await prisma.blogPost.deleteMany({ where: { slug: "welcome-to-bodiqo" } });

  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.setup },
    update: { value: { completedAt: "", version: 1 } },
    create: {
      key: SETTING_KEYS.setup,
      value: { completedAt: "", version: 1 },
    },
  });

  console.log(`Deleted ${demo.count} demo user(s), ${products.count} sample product(s).`);
  console.log("Open /admin/setup to configure a fresh production admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
