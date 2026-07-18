import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  getFriendActivity,
  getSuggestedFriends,
  listCloseFriends,
  searchFriends,
} from "@/modules/users/services/friends";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "social:friends:get", 60);
    const user = await requireUser();
    const q = new URL(request.url).searchParams;
    const mode = q.get("mode") ?? "suggested";

    if (mode === "best") {
      return ok(await listCloseFriends(user.id));
    }
    if (mode === "search") {
      return ok(await searchFriends(user.id, q.get("q") ?? "", Number(q.get("limit") ?? 20)));
    }
    if (mode === "activity") {
      return ok(
        await getFriendActivity(
          user.id,
          q.get("cursor") ?? undefined,
          Number(q.get("limit") ?? 20),
        ),
      );
    }
    return ok(
      await getSuggestedFriends(user.id, Number(q.get("limit") ?? 8)),
    );
  } catch (error) {
    return fail(error);
  }
}
