# Maintenance

## Daily / weekly
- Review `/admin/reports` and verification queue
- Confirm automated backups completed (`/admin/backups`)
- Watch `/admin/monitoring` for error spikes

## Database
- Prefer Postgres in production
- Run `npx prisma db push` only in early stages; graduate to migrations before multi-environment prod
- Vacuum / analyze on a schedule for Postgres
- Keep indexes from `prisma/schema.prisma` — avoid ad-hoc scans on large tables

## Cleanup jobs
Custom server runs scheduled backup checks and automatic cleanup (expired stories, old search history, revoked sessions) on boot and on an interval (`server.ts`).

## Security
- Rotate `AUTH_SECRET` with a planned session invalidation window
- Revoke compromised device sessions from Settings or Admin
- Keep rate limits on write/auth routes; swap `src/lib/rate-limit.ts` for Redis at multi-instance scale

## Dependency updates
```bash
npm outdated
npm audit
npm run typecheck && npm run build
```

## Brand / legal
Before commercial launch, complete trademark and domain checks documented in `docs/brand/BRAND.md`. Do not treat automated research as legal clearance.
