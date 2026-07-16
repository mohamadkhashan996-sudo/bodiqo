# Deployment

## Architecture
Relune runs as a **custom Node server** (`server.ts`) that mounts Next.js and Socket.io on one port. Prefer a long-running Node process (not serverless-only) for realtime.

## Environments
| Env | Notes |
| --- | --- |
| development | SQLite + `npm run dev` |
| test | Use Postgres or SQLite; set `AUTH_SECRET` |
| production | Postgres + Redis recommended; `MAIL_PROVIDER=resend`; strong `AUTH_SECRET` |

## Checklist before go-live
1. Set `NODE_ENV=production`
2. Strong `AUTH_SECRET` (≥32 random bytes)
3. `AUTH_URL` / `NEXTAUTH_URL` = public HTTPS origin
4. `DATABASE_URL` Postgres with backups
5. Configure mail (`RESEND_API_KEY` or equivalent)
6. TLS terminator (Vercel/Cloudflare/Nginx/Caddy)
7. Health probes: `GET /api/health` and `GET /api/health?mode=ready`
8. Restrict Socket.io CORS to your origin in hardened deploys
9. Trademark/domain legal confirmation for Relune (see `docs/brand/BRAND.md`)

## Build & run
```bash
npm ci
npx prisma generate
npx prisma db push   # or migrate deploy when migrations are adopted
npm run build
NODE_ENV=production npm start
```

## Docker (app sketch)
See root `Dockerfile`. Typical compose: Postgres + Redis + app.

```bash
docker build -t relune .
docker run --env-file .env -p 3000:3000 relune
```

## Process manager
Use systemd, PM2, or a container orchestrator. Enable restart on crash. Forward `PORT`.

## Backups
Admin UI can create metadata/settings JSON backups under `data/backups/`. For production databases use `pg_dump` / managed snapshots. Schedule volume backups for media.

## Observability
- Structured logs via `src/lib/logger.ts`
- Admin monitoring at `/admin/monitoring`
- Wire APM (OpenTelemetry) later without changing route contracts

## Rollback
Keep previous container image + DB dump. Avoid force-pushing `main`/`social-platform` without review.
