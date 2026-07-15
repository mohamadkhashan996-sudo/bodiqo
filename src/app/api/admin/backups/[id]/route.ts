import { NextResponse } from "next/server";
import { assertSuperAdmin } from "@/lib/assert-admin";
import { clientIp, logActivity } from "@/lib/activity-log";
import {
  deleteBackup,
  getBackupFileStats,
  restoreBackup,
} from "@/lib/backup";
import { readFile } from "fs/promises";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const admin = await assertSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const info = await getBackupFileStats(id);
  if (!info) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const download = new URL(request.url).searchParams.get("download");
  if (download === "1") {
    const bytes = await readFile(info.absolutePath);
    await logActivity({
      actorId: admin.user.id,
      actorEmail: admin.user.email,
      action: "backup.download",
      entity: "BackupRecord",
      entityId: id,
      summary: `Downloaded backup ${info.row.filename}`,
      ip: clientIp(request),
    });
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${info.row.filename}"`,
        "Content-Length": String(bytes.length),
      },
    });
  }

  return NextResponse.json({ backup: info.row });
}

export async function POST(request: Request, { params }: Params) {
  const admin = await assertSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (body.action !== "restore") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  if (body.confirm !== "RESTORE") {
    return NextResponse.json(
      { error: 'Type confirm: "RESTORE" to proceed' },
      { status: 400 },
    );
  }

  try {
    await restoreBackup(id);
    await logActivity({
      actorId: admin.user.id,
      actorEmail: admin.user.email,
      action: "backup.restore",
      entity: "BackupRecord",
      entityId: id,
      summary: `Restored database from backup ${id}`,
      ip: clientIp(request),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Restore failed",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await assertSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const deleted = await deleteBackup(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await logActivity({
    actorId: admin.user.id,
    actorEmail: admin.user.email,
    action: "backup.delete",
    entity: "BackupRecord",
    entityId: id,
    summary: `Deleted backup ${deleted.filename}`,
    ip: clientIp(request),
  });
  return NextResponse.json({ ok: true });
}
