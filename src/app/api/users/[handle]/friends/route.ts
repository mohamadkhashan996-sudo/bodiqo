import { fail, guardApiAbuse, ok, optionalUser } from "@/lib/api";
import { listFriends } from "@/modules/users/services/lists";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    await guardApiAbuse(request, "users:handle:friends:get", 60, 60000);
    const { handle } = await params;
    const viewer = await optionalUser();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Number(searchParams.get("limit") || 30);
    return ok(await listFriends(handle, viewer?.id, cursor, limit));
  } catch (error) {
    return fail(error);
  }
}
