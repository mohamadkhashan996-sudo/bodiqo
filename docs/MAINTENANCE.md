# Maintenance

## Daily / weekly
- Review `/admin/reports` and verification queue
- Confirm automated backups completed (`/admin/backups`) or host cron `npm run backup`
- Watch `/admin/monitoring` and `/api/metrics` for error spikes
- Skim structured logs for `"level":"error"`

## Database
- Prefer Postgres in production
- Run `npx prisma db push` only in early stages; graduate to migrations before multi-environment prod
- Vacuum / analyze on a schedule for Postgres
- Keep indexes from `prisma/schema.prisma` — avoid ad-hoc scans on large tables
- Restore procedure: `docs/runbooks/restore.md`

## Cleanup jobs
Custom server runs scheduled backup checks (boot + every 6h) and automatic cleanup (expired stories, old search history, revoked sessions) on boot and on an interval (`server.ts`).

## Security
- Rotate secrets per `docs/runbooks/secrets.md`
- Revoke compromised device sessions from Settings or Admin
- Keep rate limits on write/auth routes; swap `src/lib/rate-limit.ts` for Redis at multi-instance scale

## Dependency updates
Dependabot PRs land weekly (npm) / monthly (Actions, Docker). Locally:
```bash
npm outdated
npm audit
npm test && npm run typecheck && npm run build
```

## Incidents
Follow `docs/runbooks/incident.md`.

## Brand / legal
Before commercial launch, complete trademark and domain checks documented in `docs/brand/BRAND.md`. Do not treat automated research as legal clearance.
