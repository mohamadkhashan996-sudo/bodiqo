import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  deleteNotifications,
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

export async function DELETE(r: Request) {
  try {
    await guardApiAbuse(r, "notifications:delete", 60);
    const u = await requireUser();
    const d = await body(
      r,
      z.object({
        ids: z.array(z.string().min(1)).min(1).max(50),
      }),
    );
    return ok(await deleteNotifications(u.id, d.ids));
  } catch (e) {
    return fail(e);
  }
}
