import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { assertSuperAdmin } from "@/lib/assert-admin";
import { clientIp, logActivity } from "@/lib/activity-log";
import {
  BACKUPS_DIR,
  createBackup,
  formatBytes,
  maybeRunAutoBackup,
} from "@/lib/backup";
import { prisma } from "@/lib/prisma";
import { getSetting, setSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";

export async function GET() {
  const admin = await assertSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await maybeRunAutoBackup("admin-poll").catch(() => null);

  const [backups, settings] = await Promise.all([
    prisma.backupRecord.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    getSetting(SETTING_KEYS.backup),
  ]);

  return NextResponse.json({
    settings,
    backups: backups.map((b) => ({
      ...b,
      sizeLabel: formatBytes(b.sizeBytes),
    })),
  });
}

export async function POST(request: Request) {
  const admin = await assertSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No backup file" }, { status: 400 });
    }
    const text = await file.text();
    let parsed: { version?: number; tables?: Record<string, unknown[]> };
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON backup" }, { status: 400 });
    }
    if (!parsed.tables) {
      return NextResponse.json({ error: "Missing tables in backup" }, { status: 400 });
    }
    await mkdir(BACKUPS_DIR, { recursive: true });
    const id = `bk_upload_${Date.now()}`;
    const filename = `${id}.json`;
    await writeFile(path.join(BACKUPS_DIR, filename), text, "utf8");
    const record = await prisma.backupRecord.create({
      data: {
        id,
        filename,
        relativePath: path.join("data", "backups", filename),
        sizeBytes: Buffer.byteLength(text, "utf8"),
        format: "json",
        trigger: "manual",
        status: "ready",
        note: `Uploaded: ${file.name}`,
        createdById: admin.user.id,
      },
    });
    await logActivity({
      actorId: admin.user.id,
      actorEmail: admin.user.email,
      action: "backup.upload",
      entity: "BackupRecord",
      entityId: record.id,
      summary: `Uploaded backup ${file.name}`,
      ip: clientIp(request),
    });
    return NextResponse.json({ backup: record });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === "settings") {
    const current = await getSetting(SETTING_KEYS.backup);
    const next = await setSetting(SETTING_KEYS.backup, {
      ...current,
      autoEnabled: Boolean(body.autoEnabled ?? current.autoEnabled),
      intervalHours: Number(body.intervalHours ?? current.intervalHours),
      retainCount: Number(body.retainCount ?? current.retainCount),
      lastAutoAt: current.lastAutoAt,
    });
    await logActivity({
      actorId: admin.user.id,
      actorEmail: admin.user.email,
      action: "backup.settings",
      entity: "Setting",
      entityId: "backup",
      summary: "Updated automatic backup settings",
      ip: clientIp(request),
      meta: {
        autoEnabled: next.autoEnabled,
        intervalHours: next.intervalHours,
        retainCount: next.retainCount,
      },
    });
    return NextResponse.json({ settings: next });
  }

  const note =
    typeof body.note === "string" && body.note.trim()
      ? body.note.trim()
      : "Manual backup from admin";

  const record = await createBackup({
    trigger: "manual",
    createdById: admin.user.id,
    note,
  });

  await logActivity({
    actorId: admin.user.id,
    actorEmail: admin.user.email,
    action: "backup.create",
    entity: "BackupRecord",
    entityId: record.id,
    summary: `Created backup ${record.filename}`,
    ip: clientIp(request),
  });

  return NextResponse.json({ backup: record });
}
