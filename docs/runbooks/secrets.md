# Runbook: Secret rotation

## AUTH_SECRET

1. Generate: `openssl rand -base64 48`
2. Set on host / Fly secrets / Compose.
3. Rolling restart — **all sessions invalidate**; users re-authenticate.

## Database / Redis passwords

1. Create new credentials on the managed service.
2. Update `DATABASE_URL` / `REDIS_URL`.
3. Restart app; confirm `/api/health?mode=ready`.
4. Revoke old credentials.

## Resend / OAuth / Twilio / VAPID

1. Issue new keys in the provider console.
2. Update env; restart.
3. Smoke: email send, OAuth sign-in, push subscribe, SMS OTP as applicable.

## METRICS_TOKEN / SENTRY_DSN

Rotate anytime; scrapers and Sentry projects must be updated in parallel.

Never commit secrets. Prefer platform secret stores over `.env` on disk in production.
