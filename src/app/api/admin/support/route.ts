import { SupportTicketStatus } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import {
  createSupportTicket,
  listSupportTickets,
  updateSupportTicket,
} from "@/modules/admin/services/support";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:support");
    await requireStaff("support:read");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as SupportTicketStatus | null;
    const tickets = await listSupportTickets({
      status: status || undefined,
      take: Number(searchParams.get("take") ?? 40),
      cursor: searchParams.get("cursor") ?? undefined,
    });
    return ok({ tickets });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:support:create", 30);
    const staff = await requireStaff("support:write");
    const data = await body(
      request,
      z.object({
        userId: z.string().optional().nullable(),
        email: z.string().email().optional().nullable(),
        subject: z.string().min(3).max(200),
        body: z.string().min(3).max(5000),
        priority: z.number().int().min(0).max(5).optional(),
      }),
    );
    return ok(await createSupportTicket(staff.id, data));
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "admin:support:write", 40);
    const staff = await requireStaff("support:write");
    const data = await body(
      request,
      z.object({
        ticketId: z.string().min(1),
        status: z.nativeEnum(SupportTicketStatus).optional(),
        priority: z.number().int().min(0).max(5).optional(),
        assigneeId: z.string().nullable().optional(),
        resolution: z.string().max(2000).nullable().optional(),
      }),
    );
    const { ticketId, ...patch } = data;
    return ok(await updateSupportTicket(staff.id, ticketId, patch));
  } catch (e) {
    return fail(e);
  }
}
