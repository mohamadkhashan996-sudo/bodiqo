import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import {
  getFeatureFlags,
  updateFeatureFlags,
} from "@/modules/admin/services/payments";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:flags");
    await requireStaff("settings:read");
    return ok({ flags: await getFeatureFlags() });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "admin:flags:write", 30);
    const staff = await requireStaff("settings:write");
    const data = await body(
      request,
      z.object({
        flags: z.record(z.boolean()),
      }),
    );
    return ok({ flags: await updateFeatureFlags(staff.id, data.flags) });
  } catch (e) {
    return fail(e);
  }
}
