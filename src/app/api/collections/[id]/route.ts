import { fail, guardApiAbuse, ok, optionalUser } from "@/lib/api";
import { getPublicCollection } from "@/modules/feed/services/bookmarks";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "collections:id:get", 60);
    const viewer = await optionalUser();
    return ok(await getPublicCollection((await params).id, viewer?.id));
  } catch (error) {
    return fail(error);
  }
}
