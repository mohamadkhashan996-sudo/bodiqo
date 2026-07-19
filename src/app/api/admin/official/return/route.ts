import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { returnFromOfficialAccountSession } from "@/modules/admin/services/official-session";
import { auth } from "@/modules/auth";

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:official:return", 10);
    const session = await auth();
    const user = await requireUser();
    return ok(
      await returnFromOfficialAccountSession(
        {
          id: user.id,
          impersonatorId: session?.impersonatorId ?? null,
        },
        request,
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
