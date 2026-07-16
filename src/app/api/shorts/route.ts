import { fail, ok, optionalUser } from "@/lib/api";
import { getShorts } from "@/modules/feed/services/posts";

export async function GET() {
  try {
    const u = await optionalUser();
    return ok({ posts: await getShorts(u?.id) });
  } catch (e) {
    return fail(e);
  }
}
