#!/usr/bin/env bash
# Standalone Postgres backup for Relune (host cron / sidecar).
# Usage:
#   DATABASE_URL=postgresql://... ./scripts/backup.sh
#   BACKUP_DIR=/var/backups/relune RETAIN_DAYS=14 ./scripts/backup.sh
# Optional offsite:
#   BACKUP_S3_URI=s3://bucket/relune/ ./scripts/backup.sh   # requires aws CLI
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/data/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$ROOT/.env" ]]; then
    # shellcheck disable=SC1091
    set -a && source "$ROOT/.env" && set +a
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found — install postgresql-client" >&2
  exit 1
fi

OUT="$BACKUP_DIR/relune-db-$STAMP.dump"
echo "==> Dumping to $OUT"
pg_dump --format=custom --no-owner --no-acl --dbname="$DATABASE_URL" --file="$OUT"
SIZE="$(wc -c < "$OUT" | tr -d ' ')"
echo "==> OK ($SIZE bytes)"

if [[ -n "${BACKUP_S3_URI:-}" ]] && command -v aws >/dev/null 2>&1; then
  echo "==> Uploading to $BACKUP_S3_URI"
  aws s3 cp "$OUT" "${BACKUP_S3_URI%/}/$(basename "$OUT")"
fi

echo "==> Pruning dumps older than ${RETAIN_DAYS} days"
find "$BACKUP_DIR" -name 'relune-db-*.dump' -type f -mtime "+$RETAIN_DAYS" -print -delete || true

echo "Backup complete: $OUT"
