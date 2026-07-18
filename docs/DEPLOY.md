# Deployment

Relune runs as a **custom Node server** (`server.ts`) that mounts Next.js and Socket.IO on one port. Prefer a long-running process (not serverless-only) for realtime.

## Quick paths

| Target           | How                                                                             |
| ---------------- | ------------------------------------------------------------------------------- |
| Local / VM       | `npm run build && npm start`                                                    |
| Docker Compose   | `docker compose up -d --build`                                                  |
| Hardened Compose | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` |
| Fly.io           | `fly launch` using `fly.toml` + `fly secrets set …`                             |
| Render           | Blueprint `render.yaml`                                                         |
| Image release    | Tag `v*` → GHCR via `.github/workflows/release.yml`                             |

## Environments

| Env         | Notes                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| development | Postgres via Compose + `npm run dev`                                             |
| test        | CI Postgres/Redis; `MAIL_PROVIDER=log`                                           |
| production  | Postgres + Redis; `MAIL_PROVIDER=resend`; strong `AUTH_SECRET`; HTTPS `AUTH_URL` |

## Checklist before go-live

1. `NODE_ENV=production`
2. Strong `AUTH_SECRET` (≥32 random bytes)
3. `AUTH_URL` / `NEXTAUTH_URL` = public HTTPS origin
4. `DATABASE_URL` Postgres with backups
5. `REDIS_URL` (rate limits + Socket.IO scale-out)
6. Mail: `MAIL_PROVIDER=resend` + `RESEND_API_KEY` + SPF/DKIM
7. TLS terminator (Fly/Render/Cloudflare/Nginx/Caddy)
8. Health: `GET /api/health` and `GET /api/health?mode=ready`
9. Optional: VAPID, TURN, OAuth provider secrets
10. Mobile: see `docs/MOBILE.md`
11. Trademark/domain review (`docs/brand/BRAND.md`)

## Build & run (bare metal)

```bash
docker compose up postgres redis -d
cp .env.example .env   # fill production values
npm ci
npx prisma generate
npm run db:migrate
npm run build
NODE_ENV=production npm start
```

## Docker

```bash
docker build -t relune:1.0.0 .
docker run --env-file .env -p 3000:3000 relune:1.0.0
```

Entrypoint runs `prisma migrate deploy` then `tsx server.ts`. Non-root user `relune` in the image.

### Production compose

```bash
export POSTGRES_PASSWORD=… REDIS_PASSWORD=… AUTH_SECRET=… AUTH_URL=https://… RESEND_API_KEY=…
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Process manager (systemd sketch)

```ini
[Unit]
Description=Relune
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/relune
EnvironmentFile=/opt/relune/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=relune

[Install]
WantedBy=multi-user.target
```

## Health & observability

- Liveness: `/api/health?mode=live`
- Readiness: `/api/health?mode=ready` (DB + Redis when configured)
- Admin: `/admin/monitoring`
- Structured logs: `src/lib/logger.ts`

## Backups

- DB: `pg_dump` / managed snapshots
- Media volume: `public/uploads` (or CDN)
- Admin JSON backups under `data/backups/`

## Rollback

Keep previous image tag + DB dump. Prefer `MAINTENANCE_MODE=true` during restore.

## Related

- `docs/PRODUCTION.md` — env matrix
- `docs/RELEASE.md` — cut a version
- `docs/MOBILE.md` — iOS / Android
- `docs/PHASE-12.md` — phase summary
