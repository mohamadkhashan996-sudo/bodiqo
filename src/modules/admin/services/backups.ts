import fs from "fs/promises";
import path from "path";
import { BackupScope, BackupType } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "./audit";
import { logger } from "@/lib/logger";

const BACKUP_ROOT = path.join(process.cwd(), "data", "backups");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function listBackups(take = 40) {
  return prisma.backupRecord.findMany({
    orderBy: { startedAt: "desc" },
    take: Math.min(take, 100),
  });
}

export async function createBackup(
  actorId: string | null,
  opts: {
    type?: BackupType;
    scope?: BackupScope;
    note?: string;
  } = {},
) {
  const type = opts.type ?? "MANUAL";
  const scope = opts.scope ?? "DATABASE";
  const record = await prisma.backupRecord.create({
    data: {
      type,
      scope,
      status: "RUNNING",
      createdBy: actorId,
      note: opts.note,
    },
  });

  try {
    await ensureDir(BACKUP_ROOT);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `cirqua-${scope.toLowerCase()}-${stamp}.json`;
    const filePath = path.join(BACKUP_ROOT, filename);

    let payload: unknown;
    if (scope === "DATABASE" || scope === "FULL") {
      payload = {
        exportedAt: new Date().toISOString(),
        users: await prisma.user.count(),
        posts: await prisma.post.count(),
        messages: await prisma.message.count(),
        reports: await prisma.report.count(),
        settings: await prisma.systemSetting.findMany(),
        // Lightweight snapshot metadata — full dump via prisma migrate/pg_dump in production
        snapshot: "metadata+settings",
      };
    } else {
      const media = await prisma.mediaAsset.findMany({
        where: { status: { not: "DELETED" } },
        take: 5000,
      });
      payload = { exportedAt: new Date().toISOString(), media };
    }

    const body = JSON.stringify(payload, null, 2);
    await fs.writeFile(filePath, body, "utf8");
    const sizeBytes = Buffer.byteLength(body);

    const done = await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: "COMPLETED",
        path: filePath,
        sizeBytes,
        finishedAt: new Date(),
      },
    });
    if (actorId) {
      await writeAudit({
        actorId,
        action: "admin.backup.create",
        target: record.id,
        meta: { type, scope },
      });
    }
    return done;
  } catch (error) {
    logger.error("backup_failed", { error: String(error), id: record.id });
    return prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        error: String(error),
        finishedAt: new Date(),
      },
    });
  }
}

export async function getBackupDownload(backupId: string) {
  const backup = await prisma.backupRecord.findUnique({ where: { id: backupId } });
  if (!backup || backup.status !== "COMPLETED" || !backup.path) {
    throw new AppError("Backup not available", 404);
  }
  const data = await fs.readFile(backup.path, "utf8");
  return { backup, data };
}

/** Restore settings-only from a completed backup file (safe subset). */
export async function restoreBackup(actorId: string, backupId: string) {
  const { backup, data } = await getBackupDownload(backupId);
  const parsed = JSON.parse(data) as {
    settings?: Array<{ key: string; value: unknown }>;
  };
  if (parsed.settings?.length) {
    for (const row of parsed.settings) {
      await prisma.systemSetting.upsert({
        where: { key: row.key },
        create: {
          key: row.key,
          value: row.value as object,
          updatedBy: actorId,
        },
        update: { value: row.value as object, updatedBy: actorId },
      });
    }
  }
  await writeAudit({
    actorId,
    action: "admin.backup.restore",
    target: backupId,
    meta: { path: backup.path },
  });
  return { ok: true, restoredSettings: parsed.settings?.length ?? 0 };
}

/** Schedule helper — call from cron or startup tick */
export async function runScheduledBackups() {
  const latestDaily = await prisma.backupRecord.findFirst({
    where: { type: "DAILY", status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
  });
  const dayMs = 24 * 60 * 60_000;
  if (!latestDaily || Date.now() - latestDaily.startedAt.getTime() > dayMs) {
    await createBackup(null, { type: "DAILY", scope: "DATABASE", note: "auto daily" });
  }

  const latestWeekly = await prisma.backupRecord.findFirst({
    where: { type: "WEEKLY", status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
  });
  const weekMs = 7 * dayMs;
  if (!latestWeekly || Date.now() - latestWeekly.startedAt.getTime() > weekMs) {
    await createBackup(null, { type: "WEEKLY", scope: "FULL", note: "auto weekly" });
  }
}
