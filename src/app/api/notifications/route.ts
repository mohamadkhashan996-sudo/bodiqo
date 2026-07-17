import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse} from "@/lib/api";
import {
  listNotifications,
  markRead,
} from "@/modules/notifications/services/notify";
export async function GET(r: Request) {
  try {
    const u = await requireUser();
    const q = new URL(r.url).searchParams;
    return ok(
      await listNotifications(
        u.id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 20),
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(r: Request) {
  try {
    await guardApiAbuse(r, "notifications:patch");
    const u = await requireUser();
    const d = await body(r, z.object({ id: z.string().optional() }));
    await markRead(u.id, d.id);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
