#!/usr/bin/env bash
# One-command Relune local boot: Postgres + Redis + migrate + seed + server.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVICES_DIR="${RELUNE_SERVICES_DIR:-$HOME/.relune-services}"
PID_FILE="$SERVICES_DIR/dev-services.pid"
PORT="${PORT:-3000}"
export PORT

mkdir -p "$SERVICES_DIR/postgres" "$SERVICES_DIR/redis"

log() { printf '%s\n' "$*"; }

ensure_python_deps() {
  python3 - <<'PY' 2>/dev/null && return 0
import pgserver, redislite
PY
  log "Installing pgserver + redislite (user)…"
  python3 -m pip install --user -q pgserver redislite
}

ensure_env() {
  if [[ ! -f .env ]]; then
    SECRET=$(openssl rand -base64 48 | tr -d '\n')
    cat > .env <<EOF
DATABASE_URL="postgresql://postgres@localhost/relune"
REDIS_URL="redis://127.0.0.1:6379"
AUTH_SECRET="$SECRET"
AUTH_URL="http://localhost:${PORT}"
NEXTAUTH_URL="http://localhost:${PORT}"
MAIL_PROVIDER=log
NODE_ENV=development
PORT=${PORT}
EOF
    log "Wrote .env"
  fi
}

sync_database_url() {
  python3 - <<PY
from pathlib import Path
from urllib.parse import urlparse, parse_qsl
import pgserver

pg = pgserver.get_server(Path(r"$SERVICES_DIR") / "postgres")
pg.ensure_postgres_running()
uri = pg.get_uri()
if uri.startswith("postgres://"):
    uri = "postgresql://" + uri[len("postgres://"):]
u = urlparse(uri)
qs = dict(parse_qsl(u.query, keep_blank_values=True))
socket = qs.get("host")
user = u.username or "postgres"
# Prisma rejects empty hosts; use localhost + unix socket query param.
if socket:
    db_url = f"postgresql://{user}@localhost/relune?host={socket}"
else:
    host = u.hostname or "localhost"
    port = f":{u.port}" if u.port else ""
    db_url = f"postgresql://{user}@{host}{port}/relune"

(Path(r"$SERVICES_DIR") / "database.url").write_text(db_url)

env = Path(".env")
text = env.read_text() if env.exists() else ""
keys = {
    "DATABASE_URL": db_url,
    "REDIS_URL": "redis://127.0.0.1:6379",
}
out, seen = [], set()
for line in text.splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k = line.split("=", 1)[0].strip()
        if k in keys:
            out.append(f'{k}="{keys[k]}"')
            seen.add(k)
            continue
    out.append(line)
for k, v in keys.items():
    if k not in seen:
        out.append(f'{k}="{v}"')
env.write_text("\n".join(out) + "\n")
print("Synced DATABASE_URL / REDIS_URL into .env")
PY
}

start_infra() {
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    log "Infra pid $(cat "$PID_FILE") already running"
  else
    ensure_python_deps
    log "Starting embedded Postgres + Redis…"
    python3 -u - <<PY >"$SERVICES_DIR/services.log" 2>&1 &
import time
from pathlib import Path
import pgserver
import redislite

base = Path(r"$SERVICES_DIR")
pg = pgserver.get_server(base / "postgres")
pg.ensure_postgres_running()
print("POSTGRES_READY", flush=True)
redis_rdb = base / "redis" / "relune.rdb"
redis = redislite.Redis(str(redis_rdb), serverconfig={"bind": "127.0.0.1", "port": "6379"})
assert redis.ping()
print("REDIS_OK", flush=True)
print("SERVICES_READY", flush=True)
while True:
    time.sleep(3600)
PY
    echo $! > "$PID_FILE"
  fi

  for i in $(seq 1 90); do
    if python3 - <<'PY'
import socket
s=socket.socket(); s.settimeout(0.4)
try:
  s.connect(("127.0.0.1", 6379))
except Exception:
  raise SystemExit(1)
finally:
  s.close()
PY
    then
      break
    fi
    sleep 0.5
  done
  sync_database_url
}

ensure_db() {
  npx prisma generate >/dev/null
  npx prisma migrate deploy
  COUNT=$(npx tsx -e 'import {PrismaClient} from "@prisma/client"; const p=new PrismaClient(); p.user.count().then(c=>{console.log(String(c)); return p.$disconnect();})')
  if [[ "$COUNT" == "0" ]]; then
    log "Seeding demo accounts…"
    npm run db:seed:phase2
    npm run db:seed:phase3
    npm run db:seed:phase4
    npm run db:seed:official || true
  else
    log "Database has $COUNT users — skip seed"
  fi
}

ensure_env
start_infra
ensure_db

if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  if [[ "${RELUNE_FORCE:-}" == "1" ]]; then
    lsof -tiTCP:"$PORT" -sTCP:LISTEN | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    log "Already listening on :$PORT — health:"
    curl -fsS "http://127.0.0.1:${PORT}/api/health?mode=ready" || true
    echo
    log "Use RELUNE_FORCE=1 npm run up to restart the app process."
    exit 0
  fi
fi

log "Starting Relune → http://localhost:${PORT}"
exec npm run dev
