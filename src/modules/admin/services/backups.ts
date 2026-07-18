import type { BackupScope, BackupType } from "@prisma/client";
import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { writeAudit } from "./audit";

const execFileAsync = promisify(execFile);
const BACKUP_ROOT = path.join(process.cwd(), "data", "backups");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function postgresDumpArgs(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const database = url.pathname.replace(/^\//, "").split("?")[0] || "relune";
  const args = [
    "--format=custom",
    "--no-owner",
    "--no-acl",
    `--dbname=${database}`,
  ];
  if (url.hostname) args.push(`--host=${url.hostname}`);
  if (url.port) args.push(`--port=${url.port}`);
  if (url.username) args.push(`--username=${decodeURIComponent(url.username)}`);
  return {
    args,
    env: {
      ...process.env,
      ...(url.password ? { PGPASSWORD: decodeURIComponent(url.password) } : {}),
    },
  };
}

async function tryPgDump(filePath: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("postgres")) return null;
  try {
    const { args, env } = postgresDumpArgs(databaseUrl);
    await execFileAsync("pg_dump", [...args, `--file=${filePath}`], {
      env,
      timeout: 120_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    const stat = await fs.stat(filePath);
    return { sizeBytes: stat.size, kind: "pg_dump" as const };
  } catch (error) {
    logger.warn("pg_dump_unavailable", { error: String(error) });
    await fs.unlink(filePath).catch(() => undefined);
    return null;
  }
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

    let filePath: string;
    let sizeBytes: number;
    let snapshotKind: string;

    if (scope === "DATABASE" || scope === "FULL") {
      const dumpPath = path.join(
        BACKUP_ROOT,
        `relune-${scope.toLowerCase()}-${stamp}.dump`,
      );
      const dumped = await tryPgDump(dumpPath);
      if (dumped) {
        filePath = dumpPath;
        sizeBytes = dumped.sizeBytes;
        snapshotKind = dumped.kind;
        if (scope === "FULL") {
          const mediaMeta = await prisma.mediaAsset.findMany({
            where: { status: { not: "DELETED" } },
            take: 5000,
          });
          const metaPath = path.join(
            BACKUP_ROOT,
            `relune-media-meta-${stamp}.json`,
          );
          await fs.writeFile(
            metaPath,
            JSON.stringify(
              { exportedAt: new Date().toISOString(), media: mediaMeta },
              null,
              2,
            ),
            "utf8",
          );
        }
      } else {
        filePath = path.join(
          BACKUP_ROOT,
          `relune-${scope.toLowerCase()}-${stamp}.json`,
        );
        const payload = {
          exportedAt: new Date().toISOString(),
          users: await prisma.user.count(),
          posts: await prisma.post.count(),
          messages: await prisma.message.count(),
          reports: await prisma.report.count(),
          settings: await prisma.systemSetting.findMany(),
          snapshot: "metadata+settings",
          note: "pg_dump was unavailable; this file is settings/metadata only, not a full database restore.",
        };
        const body = JSON.stringify(payload, null, 2);
        await fs.writeFile(filePath, body, "utf8");
        sizeBytes = Buffer.byteLength(body);
        snapshotKind = "metadata+settings";
      }
    } else {
      filePath = path.join(BACKUP_ROOT, `relune-media-${stamp}.json`);
      const media = await prisma.mediaAsset.findMany({
        where: { status: { not: "DELETED" } },
        take: 5000,
      });
      const body = JSON.stringify(
        { exportedAt: new Date().toISOString(), media },
        null,
        2,
      );
      await fs.writeFile(filePath, body, "utf8");
      sizeBytes = Buffer.byteLength(body);
      snapshotKind = "media-metadata";
    }

    const done = await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: "COMPLETED",
        path: filePath,
        sizeBytes,
        finishedAt: new Date(),
        note: [opts.note, `format=${snapshotKind}`].filter(Boolean).join(" · "),
      },
    });
    if (actorId) {
      await writeAudit({
        actorId,
        action: "admin.backup.create",
        target: record.id,
        meta: { type, scope, snapshotKind },
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
  const backup = await prisma.backupRecord.findUnique({
    where: { id: backupId },
  });
  if (!backup || backup.status !== "COMPLETED" || !backup.path) {
    throw new AppError("Backup not available", 404);
  }
  const data = await fs.readFile(backup.path);
  return { backup, data };
}

/** Restore settings-only from a completed JSON backup (safe subset). Dump files are download-only. */
export async function restoreBackup(actorId: string, backupId: string) {
  const { backup, data } = await getBackupDownload(backupId);
  if (backup.path?.endsWith(".dump")) {
    throw new AppError(
      "PostgreSQL dump restore must be run with pg_restore on the host; settings-only restore is for JSON snapshots.",
      400,
    );
  }
  const parsed = JSON.parse(data.toString("utf8")) as {
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
    await createBackup(null, {
      type: "DAILY",
      scope: "DATABASE",
      note: "auto daily",
    });
  }

  const latestWeekly = await prisma.backupRecord.findFirst({
    where: { type: "WEEKLY", status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
  });
  const weekMs = 7 * dayMs;
  if (!latestWeekly || Date.now() - latestWeekly.startedAt.getTime() > weekMs) {
    await createBackup(null, {
      type: "WEEKLY",
      scope: "FULL",
      note: "auto weekly",
    });
  }
}
