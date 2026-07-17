#!/usr/bin/env bash
# Sync Capacitor shells against CAPACITOR_SERVER_URL (production HTTPS origin).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${CAPACITOR_SERVER_URL:-}" ]]; then
  echo "Set CAPACITOR_SERVER_URL to your production HTTPS origin, e.g.:"
  echo "  export CAPACITOR_SERVER_URL=https://app.relune.example"
  exit 1
fi

export CAPACITOR_SERVER_URL
npx cap sync
echo "Synced Capacitor → ${CAPACITOR_SERVER_URL}"
echo "Open Xcode:  npm run mobile:open:ios"
echo "Open Android Studio: npm run mobile:open:android"
