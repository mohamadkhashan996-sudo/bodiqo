# Runbook: Database backup & restore

## Automated (in-app)

- On boot + every 6h: `runScheduledBackups()` creates **daily** DB and **weekly** FULL snapshots when due.
- Admin UI: `/admin/backups` (permission `backups:write` for create/restore settings).
- Files land in `data/backups/` (Compose volume `relune_backups`).
- Image includes `postgresql-client` so `pg_dump` works inside the container.

## Host cron (recommended off-app)

```bash
# Daily 03:15 UTC
15 3 * * * cd /opt/relune && DATABASE_URL=… BACKUP_DIR=/var/backups/relune RETAIN_DAYS=14 ./scripts/backup.sh
```

Offsite (optional):

```bash
BACKUP_S3_URI=s3://your-bucket/relune/ ./scripts/backup.sh
# requires AWS CLI credentials on the host
```

## Restore (destructive)

```bash
./scripts/restore.sh data/backups/relune-db-YYYYMMDD….dump
npx prisma migrate deploy
```

JSON snapshots from the admin UI can restore **settings only** via `/admin/backups`. Custom-format `.dump` files must use `pg_restore` as above.

## Managed Postgres

Prefer the provider’s PITR / automated backups as primary; keep Relune dumps as a portable secondary copy.
