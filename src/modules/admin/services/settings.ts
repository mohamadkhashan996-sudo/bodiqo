import { prisma } from "@/lib/prisma";
import { cacheDel, cached } from "@/lib/cache";
import { writeAudit } from "./audit";
import { site } from "@/config/env";

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
    requireCaptcha: false,
  },
};

export async function getSettings() {
  return cached("admin:settings", 60, async () => {
    const rows = await prisma.systemSetting.findMany();
    const merged = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      merged[row.key] = row.value as unknown;
    }
    return merged;
  });
}

export async function getSetting<T = unknown>(key: string): Promise<T> {
  const all = await getSettings();
  return (all[key] ?? DEFAULT_SETTINGS[key]) as T;
}

export async function updateSettings(
  actorId: string,
  patch: Record<string, unknown>,
) {
  const keys = Object.keys(patch);
  await prisma.$transaction(
    keys.map((key) =>
      prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: patch[key] as object, updatedBy: actorId },
        update: { value: patch[key] as object, updatedBy: actorId },
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
