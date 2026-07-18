import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioMonetization } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:monetization");
    const user = await requireUser();
    return ok(await getStudioMonetization(user.id));
  } catch (e) {
    return fail(e);
  }
}
