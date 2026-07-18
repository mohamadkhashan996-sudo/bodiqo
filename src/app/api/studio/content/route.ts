import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getStudioContent } from "@/modules/studio/services/studio";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "studio:content");
    const user = await requireUser();
    const q = new URL(request.url).searchParams;
    const status = (q.get("status") ?? "ALL") as
      | "ALL"
      | "PUBLISHED"
      | "DRAFT"
      | "SCHEDULED"
      | "ARCHIVED";
    const type = (q.get("type") ?? "ALL") as
      | "ALL"
      | "VIDEO"
      | "SHORT"
      | "TEXT"
      | "IMAGE"
      | "POLL"
      | "LINK"
      | "REPOST";
    return ok(
      await getStudioContent(user.id, {
        status,
        type,
        limit: Number(q.get("limit") ?? 40),
      }),
    );
  } catch (e) {
    return fail(e);
  }
}
