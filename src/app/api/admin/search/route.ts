import { fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { adminSearch } from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:search", 40);
    await requireStaff("search:admin");
    const q = new URL(request.url).searchParams.get("q") ?? "";
    return ok(await adminSearch(q));
  } catch (e) {
    return fail(e);
  }
}
