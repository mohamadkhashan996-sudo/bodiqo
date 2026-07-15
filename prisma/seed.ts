/**
 * Production / empty install seed.
 * Does NOT create demo users, sample products, or blog posts.
 * Run the first-launch wizard at /setup after `db:push`.
 *
 * Optional sample catalog for local development:
 *   npm run db:seed:demo
 */
import { PrismaClient } from "@prisma/client";
import { SETTING_KEYS } from "../src/lib/settings-schema";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding BODIQO (production-empty)…");

  // Remove known demo artifacts if migrating from an older seed
  await prisma.user.deleteMany({ where: { email: "demo@bodiqo.com" } });
  await prisma.blogPost.deleteMany({ where: { slug: "welcome-to-bodiqo" } });

  for (const key of Object.values(SETTING_KEYS)) {
    const existing = await prisma.setting.findUnique({ where: { key } });
    if (!existing) {
      await prisma.setting.create({
        data: {
          key,
          value:
            key === SETTING_KEYS.setup
              ? { completedAt: "", version: 1 }
              : {},
        },
      });
    }
  }

  // Ensure setup is incomplete until the wizard finishes
  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.setup },
    update: { value: { completedAt: "", version: 1 } },
    create: {
      key: SETTING_KEYS.setup,
      value: { completedAt: "", version: 1 },
    },
  });

  console.log(
    "Done. Open /setup to create your admin, store, and PayPal settings.",
  );
  console.log("No demo catalog or demo admin was created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
