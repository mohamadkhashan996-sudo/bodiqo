# Release preparation

## Versioning
- Semver in `package.json` (current: **1.0.0**)
- Git tags: `v1.0.0`, `v1.0.1`, …
- Docker images: `ghcr.io/<org>/<repo>:<version>` via `.github/workflows/release.yml`

## Cut a release
```bash
npm run release:check
npm run typecheck
npm run build          # optional local verify
git tag -a v1.0.0 -m "Relune 1.0.0"
git push origin v1.0.0
```

Tag push builds and publishes the container image when GHCR is enabled.

## Go-live sequence
1. Provision Postgres + Redis (managed or `docker compose`)
2. Fill production secrets (see `.env.example` Production block)
3. `npm run db:migrate` (or rely on Docker entrypoint)
4. Deploy web (`docker compose …`, Fly, Render, or VM + systemd)
5. Confirm `GET /api/health?mode=ready`
6. Configure DNS + TLS, SPF/DKIM for Resend
7. Seed official account: `npm run db:setup:official`
8. `CAPACITOR_SERVER_URL=https://… npm run mobile:sync` → store builds
9. Soft launch: invite-only / maintenance off → monitor `/admin/monitoring`

## Rollback
1. Redeploy previous container tag
2. Restore DB from `pg_dump` if schema migrated forward-incompatibly
3. Keep `MAINTENANCE_MODE=true` during recovery if needed

## Sign-off
| Area | Owner check |
| --- | --- |
| Auth (email, OAuth, 2FA) | ☐ |
| Feed / messaging / calls | ☐ |
| Admin moderation | ☐ |
| Backups scheduled | ☐ |
| Legal pages live | ☐ |
| Mobile TestFlight / internal track | ☐ |
