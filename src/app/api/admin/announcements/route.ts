import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  publishAnnouncement,
} from "@/modules/admin/services/support";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:announcements");
    await requireStaff("announcements:read");
    const take = Number(new URL(request.url).searchParams.get("take") ?? 40);
    return ok({ announcements: await listAnnouncements(take) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:announcements:write", 30);
    const staff = await requireStaff("announcements:write");
    const data = await body(
      request,
      z.object({
        title: z.string().min(2).max(160),
        body: z.string().min(2).max(4000),
        href: z.string().max(500).optional().nullable(),
        publish: z.boolean().optional(),
      }),
    );
    const row = await createAnnouncement(staff.id, data);
    if (data.publish) {
      return ok(await publishAnnouncement(staff.id, row.id, true));
    }
    return ok(row);
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "admin:announcements:patch", 40);
    const staff = await requireStaff("announcements:write");
    const data = await body(
      request,
      z.object({
        id: z.string().min(1),
        publish: z.boolean().optional(),
        delete: z.boolean().optional(),
      }),
    );
    if (data.delete) {
      return ok(await deleteAnnouncement(staff.id, data.id));
    }
    if (data.publish === undefined) {
      return ok({ ok: true });
    }
    return ok(await publishAnnouncement(staff.id, data.id, data.publish));
  } catch (e) {
    return fail(e);
  }
}
