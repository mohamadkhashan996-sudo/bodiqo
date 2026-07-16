import { fail, ok } from "@/lib/api";
import { getPublicAuthProviders } from "@/modules/auth/provider-settings";

export async function GET() {
  try {
    return ok(await getPublicAuthProviders());
  } catch (e) {
    return fail(e);
  }
}
