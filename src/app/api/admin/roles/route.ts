import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { AppError } from "@/lib/errors";
import {
  deleteCustomRole,
  listRoles,
  upsertCustomRole,
} from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:roles");
    await requireStaff("roles:read");
    return ok(await listRoles());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:roles:write", 20);
    const staff = await requireStaff("roles:write");
    const data = await body(
      request,
      z.object({
        action: z.enum(["upsert", "delete"]),
        id: z.string().optional(),
        name: z.string().min(2).max(64).optional(),
        description: z.string().max(500).optional(),
        permissions: z.array(z.string()).optional(),
      }),
    );
    if (data.action === "delete") {
      if (!data.id) throw new AppError("id required", 400);
      return ok(await deleteCustomRole(staff.id, data.id));
    }
    if (!data.name || !data.permissions) {
      throw new AppError("name and permissions required", 400);
    }
    return ok(
      await upsertCustomRole(staff.id, {
        id: data.id,
        name: data.name,
        description: data.description,
        permissions: data.permissions,
      }),
      201,
    );
  } catch (e) {
    return fail(e);
  }
}
