import { Role } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { permissionsFor, ROLE_RANK } from "@/lib/permissions";
import { writeAudit } from "./audit";

export async function listRoles() {
  const custom = await prisma.customRole.findMany({ orderBy: { name: "asc" } });
  const system = (Object.keys(ROLE_RANK) as Role[]).map((role) => ({
    role,
    rank: ROLE_RANK[role],
    permissions: permissionsFor(role),
    kind: "system" as const,
  }));
  return {
    system,
    custom: custom.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      permissions: c.permissions,
      kind: "custom" as const,
    })),
  };
}

export async function upsertCustomRole(
  actorId: string,
  data: {
    id?: string;
    name: string;
    description?: string;
    permissions: string[];
  },
) {
  const row = data.id
    ? await prisma.customRole.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        },
      })
    : await prisma.customRole.create({
        data: {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        },
      });
  await writeAudit({
    actorId,
    action: data.id ? "admin.role.update" : "admin.role.create",
    target: row.id,
  });
  return row;
}

export async function deleteCustomRole(actorId: string, id: string) {
  await prisma.customRole.delete({ where: { id } }).catch(() => {
    throw new AppError("Role not found", 404);
  });
  await writeAudit({ actorId, action: "admin.role.delete", target: id });
  return { ok: true };
}
