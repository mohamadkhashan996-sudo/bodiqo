import { site } from "@/config/env";
import { cached, cacheDel } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

import { writeAudit } from "./audit";

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  websiteName: site.name,
  tagline: site.tagline,
  logoUrl: "/brand/mark.png",
  theme: "cloud",
  languages: ["en", "ar"],
  email: {
    from: "noreply@relune.app",
    enabled: false,
  },
  pushNotifications: { enabled: true },
  maintenanceMode: false,
  maintenanceMessage: "Relune is briefly offline for care. Back soon.",
  security: {
    requireEmailVerification: true,
    maxLoginAttempts: 8,
    sessionDays: 30,
    lockoutMinutes: 15,
  },
  storage: {
    maxUploadMb: 50,
    provider: "local",
  },
  mediaLimits: {
    imageMaxMb: 10,
    videoMaxMb: 200,
    voiceMaxMb: 20,
    documentMaxMb: 25,
  },
  videoLimits: {
    maxDurationSec: 600,
    allowShorts: true,
  },
  comments: {
    enabled: true,
    requireFollow: false,
  },
  registration: {
    open: true,
    inviteOnly: false,
  },
  featureFlags: {
    shorts: true,
    live: true,
    stories: true,
    communities: true,
    messaging: true,
    calls: true,
    gifts: true,
    registration: true,
    pushNotifications: true,
    creatorStudio: true,
    exploreRecommendations: true,
  },
};

export async function getSettings() {
  return cached("admin:settings", 60, async () => {
    const rows = await prisma.systemSetting.findMany();
    const merged = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      // Prisma Json values are assignable to our settings bag.
      merged[row.key] = row.value;
    }
    return merged;
  });
}

export async function getSetting<T = unknown>(key: string): Promise<T> {
  const all = await getSettings();
  const value = all[key] ?? DEFAULT_SETTINGS[key];
  return value as T;
}

export async function updateSettings(
  actorId: string,
  patch: Record<string, unknown>,
) {
  const current = await getSettings();
  const keys = Object.keys(patch);
  const mergedEntries = keys.map((key) => {
    const next = patch[key];
    const prev = current[key];
    const value =
      next &&
      typeof next === "object" &&
      !Array.isArray(next) &&
      prev &&
      typeof prev === "object" &&
      !Array.isArray(prev)
        ? { ...(prev as object), ...(next as object) }
        : next;
    return { key, value };
  });

  await prisma.$transaction(
    mergedEntries.map(({ key, value }) =>
      prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: value as object, updatedBy: actorId },
        update: { value: value as object, updatedBy: actorId },
      }),
    ),
  );
  await cacheDel("admin:settings");
  await writeAudit({
    actorId,
    action: "admin.settings.update",
    meta: { keys },
  });
  return getSettings();
}

export async function isMaintenanceMode() {
  const value = await getSetting<boolean>("maintenanceMode");
  return Boolean(value);
}
