import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import {
  getAuthProviderFlags,
  setAuthProviderFlags,
} from "@/modules/auth/provider-settings";
import { getAuthAdminStats } from "@/modules/admin/services/auth-stats";
import { providerEnvReady, type OAuthProviderId } from "@/modules/auth/providers";
import { writeAudit } from "@/modules/admin/services/audit";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:auth");
    await requireStaff("settings:read");
    const { searchParams } = new URL(request.url);
    if (searchParams.get("stats") === "1") {
      return ok(await getAuthAdminStats());
    }
    const flags = await getAuthProviderFlags();
    return ok({
      flags,
      env: {
        google: providerEnvReady("google"),
        apple: providerEnvReady("apple"),
        facebook: providerEnvReady("facebook"),
        twitter: providerEnvReady("twitter"),
      },
    });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "admin:auth:write", 20);
    const staff = await requireStaff("settings:write");
    const data = await body(
      request,
      z.object({
        google: z.boolean().optional(),
        apple: z.boolean().optional(),
        facebook: z.boolean().optional(),
        twitter: z.boolean().optional(),
        credentials: z.boolean().optional(),
      }),
    );
    const flags = await setAuthProviderFlags(staff.id, data);
    await writeAudit({
      actorId: staff.id,
      action: "admin.auth.providers",
      meta: data,
    });
    return ok({ flags });
  } catch (e) {
    return fail(e);
  }
}
