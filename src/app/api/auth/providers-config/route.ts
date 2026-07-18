import { fail, guardApiAbuse, ok } from "@/lib/api";
import { getPublicAuthProviders } from "@/modules/auth/provider-settings";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "auth:providers-config:get", 60, 60000);
    return ok(await getPublicAuthProviders());
  } catch (e) {
    return fail(e);
  }
}
