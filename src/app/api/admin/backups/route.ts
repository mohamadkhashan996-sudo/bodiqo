import { z } from "zod";
import { BackupScope, BackupType } from "@prisma/client";
import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { AppError } from "@/lib/errors";
import {
  createBackup,
  getBackupDownload,
  listBackups,
  restoreBackup,
} from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:backups");
    await requireStaff("backups:read");
    const { searchParams } = new URL(request.url);
    const downloadId = searchParams.get("download");
    if (downloadId) {
      const { backup, data } = await getBackupDownload(downloadId);
      return new Response(data, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="backup-${backup.id}.json"`,
        },
      });
    }
    return ok({ backups: await listBackups() });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:backups:write", 10);
    const staff = await requireStaff("backups:write");
    const data = await body(
      request,
      z.object({
        action: z.enum(["create", "restore"]).default("create"),
        type: z.nativeEnum(BackupType).optional(),
        scope: z.nativeEnum(BackupScope).optional(),
        note: z.string().max(500).optional(),
        backupId: z.string().optional(),
      }),
    );
    if (data.action === "restore") {
      if (!data.backupId) throw new AppError("backupId required", 400);
      return ok(await restoreBackup(staff.id, data.backupId));
    }
    return ok(
      await createBackup(staff.id, {
        type: data.type,
        scope: data.scope,
        note: data.note,
      }),
      201,
    );
  } catch (e) {
    return fail(e);
  }
}
