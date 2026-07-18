import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { getSettings, updateSettings } from "@/modules/admin/services";

const settingsPatchSchema = z
  .object({
    websiteName: z.string().min(1).max(120).optional(),
    tagline: z.string().max(240).optional(),
    logoUrl: z.string().max(500).optional(),
    theme: z.enum(["cloud", "night", "system"]).optional(),
    languages: z.array(z.string().min(2).max(12)).max(40).optional(),
    email: z
      .object({
        from: z.string().email().optional(),
        enabled: z.boolean().optional(),
      })
      .strict()
      .optional(),
    pushNotifications: z
      .object({
        enabled: z.boolean().optional(),
      })
      .strict()
      .optional(),
    maintenanceMode: z.boolean().optional(),
    maintenanceMessage: z.string().max(500).optional(),
    security: z
      .object({
        requireEmailVerification: z.boolean().optional(),
        maxLoginAttempts: z.number().int().min(3).max(50).optional(),
        sessionDays: z.number().int().min(1).max(365).optional(),
        lockoutMinutes: z.number().int().min(1).max(1440).optional(),
      })
      .strict()
      .optional(),
    storage: z
      .object({
        maxUploadMb: z.number().int().min(1).max(1024).optional(),
        provider: z.enum(["local", "s3"]).optional(),
      })
      .strict()
      .optional(),
    mediaLimits: z
      .object({
        imageMaxMb: z.number().int().min(1).max(100).optional(),
        videoMaxMb: z.number().int().min(1).max(2048).optional(),
        voiceMaxMb: z.number().int().min(1).max(100).optional(),
        documentMaxMb: z.number().int().min(1).max(100).optional(),
      })
      .strict()
      .optional(),
    videoLimits: z
      .object({
        maxDurationSec: z.number().int().min(1).max(7200).optional(),
        allowShorts: z.boolean().optional(),
      })
      .strict()
      .optional(),
    comments: z
      .object({
        enabled: z.boolean().optional(),
        requireFollow: z.boolean().optional(),
      })
      .strict()
      .optional(),
    registration: z
      .object({
        open: z.boolean().optional(),
        inviteOnly: z.boolean().optional(),
      })
      .strict()
      .optional(),
    officialAccountId: z.string().min(1).max(64).optional(),
  })
  .strict();

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:settings");
    await requireStaff("settings:read");
    return ok({ settings: await getSettings() });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "admin:settings:write", 20);
    const staff = await requireStaff("settings:write");
    const data = await body(request, settingsPatchSchema);
    return ok({ settings: await updateSettings(staff.id, data) });
  } catch (e) {
    return fail(e);
  }
}
