import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { getSettings, updateSettings } from "@/modules/admin/services";

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
    const data = await body(request, z.record(z.unknown()));
    return ok({ settings: await updateSettings(staff.id, data) });
  } catch (e) {
    return fail(e);
  }
}
