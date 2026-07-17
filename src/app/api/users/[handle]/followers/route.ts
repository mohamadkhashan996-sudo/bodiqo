import { fail, ok, optionalUser, guardApiAbuse } from "@/lib/api";
import { listFollowers } from "@/modules/users/services/lists";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    await guardApiAbuse(request, "users:handle:followers:get", 60, 60000);
    const viewer = await optionalUser();
    const { handle } = await params;
    const q = new URL(request.url).searchParams;
    return ok(
      await listFollowers(
        handle,
        viewer?.id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 30),
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
