import { copyFile, mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSetting, setSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";
import { logActivity } from "@/lib/activity-log";

export const BACKUP_VERSION = 1;
export const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");

type BackupPayload = {
  version: number;
  createdAt: string;
  provider: string;
  tables: Record<string, unknown[]>;
};

const EXPORT_TABLES = [
  "user",
  "account",
  "session",
  "verificationToken",
  "setting",
  "category",
  "supplier",
  "seller",
  "tag",
  "collection",
  "product",
  "productTag",
  "productCollection",
  "productVariant",
  "wishlistItem",
  "address",
  "coupon",
  "taxRate",
  "order",
  "orderItem",
  "payment",
  "review",
  "mediaAsset",
  "menuItem",
  "page",
  "blogPost",
  "banner",
  "importJob",
  "activityLog",
] as const;

function sqliteFilePath() {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) return null;
  const rel = url.replace(/^file:/, "");
  return path.isAbsolute(rel)
    ? rel
    : path.join(process.cwd(), "prisma", rel.replace(/^\.\//, ""));
}

async function dumpTables(): Promise<Record<string, unknown[]>> {
  const tables: Record<string, unknown[]> = {};
  for (const name of EXPORT_TABLES) {
    const delegate = (prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[
      name
    ];
    if (!delegate?.findMany) continue;
    tables[name] = await delegate.findMany();
  }
  return tables;
}

export async function createBackup(opts: {
  trigger?: "manual" | "auto" | "cron";
  createdById?: string | null;
  note?: string | null;
}) {
  await mkdir(BACKUPS_DIR, { recursive: true });
  const id = `bk_${Date.now()}`;
  const filename = `${id}.json`;
  const relativePath = path.join("data", "backups", filename);
  const absolutePath = path.join(BACKUPS_DIR, filename);

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    provider: process.env.DATABASE_URL?.startsWith("file:")
      ? "sqlite"
      : "postgresql",
    tables: await dumpTables(),
  };

  const json = JSON.stringify(payload);
  await writeFile(absolutePath, json, "utf8");

  const sqliteSrc = sqliteFilePath();
  if (sqliteSrc) {
    try {
      await copyFile(sqliteSrc, path.join(BACKUPS_DIR, `${id}.db`));
    } catch {
      // optional binary companion
    }
  }

  const sizeBytes = Buffer.byteLength(json, "utf8");
  const record = await prisma.backupRecord.create({
    data: {
      id,
      filename,
      relativePath,
      sizeBytes,
      format: "json",
      trigger: opts.trigger || "manual",
      status: "ready",
      note: opts.note || null,
      createdById: opts.createdById || null,
    },
  });

  await pruneBackups();
  return record;
}

export async function pruneBackups() {
  const settings = await getSetting(SETTING_KEYS.backup);
  const keep = settings.retainCount;
  const all = await prisma.backupRecord.findMany({
    orderBy: { createdAt: "desc" },
  });
  const toDelete = all.slice(keep);
  for (const row of toDelete) {
    await deleteBackupFiles(row.id, row.filename);
    await prisma.backupRecord.delete({ where: { id: row.id } }).catch(() => null);
  }
}

async function deleteBackupFiles(id: string, filename: string) {
  const jsonPath = path.join(BACKUPS_DIR, filename);
  const dbPath = path.join(BACKUPS_DIR, `${id}.db`);
  await rm(jsonPath, { force: true }).catch(() => null);
  await rm(dbPath, { force: true }).catch(() => null);
}

export async function deleteBackup(id: string) {
  const row = await prisma.backupRecord.findUnique({ where: { id } });
  if (!row) return null;
  await deleteBackupFiles(row.id, row.filename);
  await prisma.backupRecord.delete({ where: { id } });
  return row;
}

export async function readBackupPayload(id: string): Promise<BackupPayload> {
  const row = await prisma.backupRecord.findUnique({ where: { id } });
  if (!row) throw new Error("Backup not found");
  const absolutePath = path.join(process.cwd(), row.relativePath);
  const raw = await readFile(absolutePath, "utf8");
  return JSON.parse(raw) as BackupPayload;
}

export async function getBackupFileStats(id: string) {
  const row = await prisma.backupRecord.findUnique({ where: { id } });
  if (!row) return null;
  const absolutePath = path.join(process.cwd(), row.relativePath);
  try {
    const s = await stat(absolutePath);
    return { row, absolutePath, size: s.size };
  } catch {
    return { row, absolutePath, size: row.sizeBytes };
  }
}

/**
 * Full restore from logical JSON backup.
 * Replaces catalog/commerce data. Auth sessions are wiped and reloaded from backup.
 */
export async function restoreBackup(id: string) {
  const payload = await readBackupPayload(id);
  if (!payload?.tables) throw new Error("Invalid backup file");

  const t = payload.tables;

  await prisma.$transaction(async (tx) => {
    // children first
    await tx.orderItem.deleteMany();
    await tx.payment.deleteMany();
    await tx.wishlistItem.deleteMany();
    await tx.productTag.deleteMany();
    await tx.productCollection.deleteMany();
    await tx.productVariant.deleteMany();
    await tx.review.deleteMany();
    await tx.address.deleteMany();
    await tx.order.deleteMany();
    await tx.product.deleteMany();
    await tx.tag.deleteMany();
    await tx.collection.deleteMany();
    await tx.category.deleteMany();
    await tx.supplier.deleteMany();
    await tx.seller.deleteMany();
    await tx.coupon.deleteMany();
    await tx.taxRate.deleteMany();
    await tx.mediaAsset.deleteMany();
    await tx.menuItem.deleteMany();
    await tx.page.deleteMany();
    await tx.blogPost.deleteMany();
    await tx.banner.deleteMany();
    await tx.importJob.deleteMany();
    await tx.account.deleteMany();
    await tx.session.deleteMany();
    await tx.verificationToken.deleteMany();
    await tx.setting.deleteMany();
    await tx.user.deleteMany();
    // Keep BackupRecord / ActivityLog so restore itself remains auditable

    async function createMany(model: string, rows: unknown[]) {
      if (!rows?.length) return;
      const delegate = (tx as unknown as Record<string, { createMany: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<unknown> }>)[model];
      if (!delegate?.createMany) return;
      // SQLite createMany in chunks
      const chunk = 200;
      for (let i = 0; i < rows.length; i += chunk) {
        await delegate.createMany({
          data: rows.slice(i, i + chunk) as never[],
          skipDuplicates: true,
        });
      }
    }

    // parents / independents
    await createMany("user", t.user || []);
    await createMany("account", t.account || []);
    await createMany("session", t.session || []);
    await createMany("verificationToken", t.verificationToken || []);
    await createMany("setting", t.setting || []);
    await createMany("category", t.category || []);
    await createMany("supplier", t.supplier || []);
    await createMany("seller", t.seller || []);
    await createMany("tag", t.tag || []);
    await createMany("collection", t.collection || []);
    await createMany("product", t.product || []);
    await createMany("productTag", t.productTag || []);
    await createMany("productCollection", t.productCollection || []);
    await createMany("productVariant", t.productVariant || []);
    await createMany("wishlistItem", t.wishlistItem || []);
    await createMany("address", t.address || []);
    await createMany("coupon", t.coupon || []);
    await createMany("taxRate", t.taxRate || []);
    await createMany("order", t.order || []);
    await createMany("orderItem", t.orderItem || []);
    await createMany("payment", t.payment || []);
    await createMany("review", t.review || []);
    await createMany("mediaAsset", t.mediaAsset || []);
    await createMany("menuItem", t.menuItem || []);
    await createMany("page", t.page || []);
    await createMany("blogPost", t.blogPost || []);
    await createMany("banner", t.banner || []);
    await createMany("importJob", t.importJob || []);
  });

  // Prefer SQLite binary restore if companion exists
  const sqliteSrc = path.join(BACKUPS_DIR, `${id}.db`);
  const sqliteDest = sqliteFilePath();
  if (sqliteDest) {
    try {
      await copyFile(sqliteSrc, sqliteDest);
    } catch {
      // JSON restore already applied
    }
  }
}

export async function maybeRunAutoBackup(reason = "schedule") {
  const settings = await getSetting(SETTING_KEYS.backup);
  if (!settings.autoEnabled) return null;

  const last = settings.lastAutoAt ? Date.parse(settings.lastAutoAt) : 0;
  const due =
    !last || Date.now() - last >= settings.intervalHours * 60 * 60 * 1000;
  if (!due) return null;

  const record = await createBackup({
    trigger: reason === "cron" ? "cron" : "auto",
    note: `Automatic backup (${reason})`,
  });

  await setSetting(SETTING_KEYS.backup, {
    ...settings,
    lastAutoAt: new Date().toISOString(),
  });

  await logActivity({
    action: "backup.auto",
    entity: "BackupRecord",
    entityId: record.id,
    summary: `Automatic backup created (${reason})`,
  });

  return record;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
