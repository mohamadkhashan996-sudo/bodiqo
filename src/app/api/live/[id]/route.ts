import { fail, guardApiAbuse, ok, optionalUser, requireUser } from "@/lib/api";
import {
  endLiveSession,
  getLiveSession,
} from "@/modules/live/services/sessions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await optionalUser();
    return ok({ session: await getLiveSession((await params).id) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "live:end", 20);
    const user = await requireUser();
    return ok({
      session: await endLiveSession(user.id, (await params).id),
    });
  } catch (e) {
    return fail(e);
  }
}
