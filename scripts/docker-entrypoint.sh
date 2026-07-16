#!/bin/sh
set -eu
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting Relune..."
exec npx tsx server.ts
