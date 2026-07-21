# Runbook: Incident response

## 1. Triage

1. Check `GET /api/health?mode=ready` — if 503, DB or Redis is down.
2. Check platform status (Fly/Render/host) and recent deploys.
3. Tail logs for `"level":"error"` and `exception` messages.
4. Open `/admin/monitoring` (staff) for security events and process snapshot.
5. Optional: `GET /api/metrics?format=json` with `METRICS_TOKEN`.

## 2. Contain

- Set `MAINTENANCE_MODE=true` (env or admin setting) to park the app on `/maintenance`.
- Rotate compromised secrets (`AUTH_SECRET`, Resend, Twilio) and restart.
- Ban abusive actors from `/admin/users` / banned list.

## 3. Recover

- Restore DB from latest dump if data loss (see `docs/runbooks/restore.md`).
- Redeploy last known-good tag: `git checkout vX.Y.Z && flyctl deploy` / Compose rebuild.
- Clear Redis only if intentional (rate limits / presence will reset).

## 4. Communicate

- Note start/end time, user impact, root cause, and follow-ups in the audit log / issue tracker.

## 5. Follow-up

- Add regression test if logic bug.
- Adjust alerts (uptime on `/api/health?mode=ready`, error rate from logs/Sentry).
