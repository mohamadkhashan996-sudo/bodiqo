#!/usr/bin/env bash
# Restore a Relune pg_dump custom-format backup.
# DANGEROUS: overwrites the target database.
# Usage:
#   DATABASE_URL=postgresql://... ./scripts/restore.sh data/backups/relune-db-….dump
set -euo pipefail

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 <path-to.dump>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "${DATABASE_URL:-}" && -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/.env" && set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore not found — install postgresql-client" >&2
  exit 1
fi

echo "About to restore $DUMP into DATABASE_URL"
echo "Press Ctrl+C within 5s to abort…"
sleep 5

pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$DUMP"
echo "Restore finished. Run: npx prisma migrate deploy"
