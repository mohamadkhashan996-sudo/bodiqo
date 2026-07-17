# Relune production checklist

## Required env
- `DATABASE_URL` (Postgres)
- `AUTH_SECRET` (≥32 chars)
- `AUTH_URL` / `NEXTAUTH_URL` (public HTTPS origin)
- `MAIL_PROVIDER=resend` + `RESEND_API_KEY`
- `NODE_ENV=production`

## Strongly recommended
- `REDIS_URL` — rate limits + Socket.IO adapter
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — web push
- `TURN_URLS` / `TURN_CREDENTIAL` — TURN URLs + shared secret for time-limited WebRTC credentials (cellular/NAT)
- `SESSION_DAYS` — JWT lifetime
- OAuth client IDs/secrets you enable in admin

## Mobile shells
- `CAPACITOR_SERVER_URL` — same HTTPS origin as `AUTH_URL` (used at sync time only)

## Verify before launch
1. `npm run release:check`
2. `npm run typecheck && npm run build`
3. `GET /api/health?mode=ready` → `ok: true`
4. Sign-up → verify email → sign-in → optional 2FA
5. Post, like, comment, message, call smoke
6. Admin `/admin` as staff
7. OG preview for `/` and a public `/u/{handle}`
8. Capacitor sync + device smoke on iOS/Android

## Notes
- Maintenance: `MAINTENANCE_MODE=true` or admin setting
- CSP drops `unsafe-eval` in production
- Sitemap includes public profiles, posts, and communities (capped)
- Docker entrypoint migrates DB on boot
- See `docs/DEPLOY.md` and `docs/RELEASE.md`
