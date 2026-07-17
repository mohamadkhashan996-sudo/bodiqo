#!/bin/sh
set -eu

echo "Running database migrations..."
n=0
until npx prisma migrate deploy; do
  n=$((n + 1))
  if [ "$n" -ge 30 ]; then
    echo "Migrations failed after retries."
    exit 1
  fi
  echo "Database not ready, retrying ($n/30)..."
  sleep 2
done

echo "Starting Relune..."
exec npx tsx server.ts
