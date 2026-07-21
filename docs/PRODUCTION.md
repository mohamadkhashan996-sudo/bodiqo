# Relune production checklist

## Required env

- `DATABASE_URL` (Postgres)
- `AUTH_SECRET` (≥32 chars)
- `AUTH_URL` / `NEXTAUTH_URL` (public HTTPS origin)
- `MAIL_PROVIDER=resend` + `RESEND_API_KEY`
- `REDIS_URL` (required in production schema)
- `NODE_ENV=production`

## Strongly recommended

- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — web push
- `TURN_URLS` / `TURN_CREDENTIAL` — WebRTC TURN
- `SESSION_DAYS` — JWT lifetime
- `LOG_LEVEL=info` (or `warn` in high-traffic)
- `METRICS_TOKEN` — scrape `/api/metrics`
- `SENTRY_DSN` — optional error tracking forwarder
- `SENTRY_ENVIRONMENT=production`
- `APP_VERSION` — release tag for Sentry

## Mobile shells

- `CAPACITOR_SERVER_URL` — same HTTPS origin as `AUTH_URL` (used at sync time only)

## Verify before launch

1. `npm run release:check`
2. `npm test && npm run typecheck && npm run build`
3. `GET /api/health?mode=ready` → `ok: true`
4. Sign-up → verify email → sign-in → optional 2FA
5. Post, like, comment, message, call smoke
6. Admin `/admin` as staff; `/admin/backups` + `/admin/monitoring`
7. OG preview for `/` and a public `/u/{handle}`
8. Capacitor sync + device smoke on iOS/Android

## Ops references

| Topic         | Doc                                                        |
| ------------- | ---------------------------------------------------------- |
| Deploy paths  | [DEPLOY](DEPLOY.md), [runbooks/deploy](runbooks/deploy.md) |
| Observability | [OBSERVABILITY](OBSERVABILITY.md)                          |
| Backups       | [runbooks/restore](runbooks/restore.md)                    |
| Incidents     | [runbooks/incident](runbooks/incident.md)                  |
| Secrets       | [runbooks/secrets](runbooks/secrets.md)                    |
| Testing       | [TESTING](TESTING.md)                                      |
| Release cut   | [RELEASE](RELEASE.md)                                      |

## Notes

- Maintenance: `MAINTENANCE_MODE=true` or admin setting
- CSP drops `unsafe-eval` in production
- Sitemap includes public profiles, posts, and communities (capped)
- Docker entrypoint migrates DB on boot; image includes `pg_dump`/`pg_restore`
- Scheduled backups run on boot and every 6 hours
- CI: `.github/workflows/ci.yml` · CD: `deploy.yml` (Fly) · images: `release.yml` (GHCR)
