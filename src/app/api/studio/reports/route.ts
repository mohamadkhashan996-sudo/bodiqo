import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioReports } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:reports");
    const user = await requireUser();
    return ok(await getStudioReports(user.id));
  } catch (e) {
    return fail(e);
  }
}
