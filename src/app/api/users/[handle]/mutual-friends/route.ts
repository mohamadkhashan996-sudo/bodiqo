import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { listMutualFriends } from "@/modules/users/services/friends";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    await guardApiAbuse(request, "users:handle:mutual-friends:get", 60);
    const viewer = await requireUser();
    const q = new URL(request.url).searchParams;
    return ok(
      await listMutualFriends(
        (await params).handle,
        viewer.id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 30),
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
