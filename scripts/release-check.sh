#!/usr/bin/env bash
# Pre-release gate for Relune 1.0
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Typecheck"
npm run typecheck

echo "==> Prisma generate"
npx prisma generate

echo "==> Production env shape (dry)"
node -e "
const required = ['DATABASE_URL','AUTH_SECRET','AUTH_URL'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.log('Note: local shell missing', missing.join(', '), '(ok if using .env at runtime)');
} else {
  console.log('Core env vars present in shell');
}
"

echo "==> Capacitor config present"
test -f capacitor.config.ts
test -f mobile/www/index.html

echo "==> Docker assets present"
test -f Dockerfile
test -f docker-compose.yml
test -f scripts/docker-entrypoint.sh

echo "==> Docs present"
test -f docs/DEPLOY.md
test -f docs/MOBILE.md
test -f docs/RELEASE.md
test -f docs/PRODUCTION.md

echo "Release check passed."
