#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop, then run:"
  echo "  docker compose up postgres redis -d"
  exit 1
fi

docker compose up postgres redis -d
echo "Waiting for Postgres..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U relune -d relune >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

npx prisma db push
npm run db:seed:official
echo ""
echo "Official account ready — sign in at http://localhost:3000/sign-in"
echo "Email: official@relune.app"
echo "Password: ReluneOfficial2026!"
