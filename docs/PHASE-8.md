# Phase 8 — Production readiness

Closes the remaining launch blockers after Phase 7 auth.

## Database
- Prisma provider switched to **PostgreSQL**
- Use `npm run db:migrate:dev` locally, `npm run db:migrate` in production
- `docker compose up postgres redis -d` for local infra

## Ops
- Strict production env validation (`src/config/env.ts`)
- Redis-backed cache + rate limits when `REDIS_URL` is set
- Socket.io CORS locked to `AUTH_URL` origins
- Socket.io Redis adapter for horizontal scale
- Maintenance mode via `MAINTENANCE_MODE=true` or admin settings + `/maintenance`
- Health checks include Redis on `?mode=ready`

## Product
- `/terms` and `/privacy` legal pages
- Local media upload API (`POST /api/upload`) + composer integration
- Registration respects admin `registration.open` setting
- Demo seeds blocked in production unless `ALLOW_DEMO_SEEDS=true`

## Mail
- Production requires `MAIL_PROVIDER=resend` + `RESEND_API_KEY`

## Docker & CI
- `docker-compose.yml` runs Postgres, Redis, and the app
- `Dockerfile` runs `prisma migrate deploy` on boot
- GitHub Actions CI: typecheck, lint, build, migrate, smoke

## Launch checklist
1. `docker compose up -d` or managed Postgres + Redis
2. Set production `.env` (see `.env.example`)
3. `npm run db:migrate`
4. `npm run build && npm start`
5. Configure Resend + SPF/DKIM/DMARC
6. Complete trademark/domain review (`docs/brand/BRAND.md`)
7. Run penetration test before scale
