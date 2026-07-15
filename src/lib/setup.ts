import catalog from "@/data/catalog.json";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";

export {
  SETUP_COOKIE,
  isValidSetupCookie,
  setupCookieValue,
} from "@/lib/setup-cookie";

/** True when the first-launch wizard has finished. */
export async function isSetupComplete(): Promise<boolean> {
  try {
    const setup = await getSetting(SETTING_KEYS.setup);
    if (setup.completedAt) return true;

    // Legacy databases that already have an admin (pre-wizard installs)
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (admin) {
      const { setSetting } = await import("@/lib/settings");
      await setSetting(SETTING_KEYS.setup, {
        completedAt: new Date().toISOString(),
        version: 1,
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function needsSetup(): Promise<boolean> {
  return !(await isSetupComplete());
}

/** Remove demo account and products imported from the sample catalog. */
export async function purgeDemoData() {
  await prisma.user.deleteMany({
    where: { email: "demo@bodiqo.com" },
  });

  const demoSlugs = (catalog.products as { slug: string }[]).map((p) => p.slug);
  if (demoSlugs.length) {
    await prisma.product.deleteMany({
      where: { slug: { in: demoSlugs } },
    });
  }

  await prisma.blogPost.deleteMany({
    where: { slug: "welcome-to-bodiqo" },
  });

  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.setup },
    update: { value: { completedAt: "", version: 1 } },
    create: {
      key: SETTING_KEYS.setup,
      value: { completedAt: "", version: 1 },
    },
  });
}
