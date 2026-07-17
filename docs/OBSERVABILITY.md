# Observability

Relune ships structured logging, health probes, Prometheus metrics, and optional Sentry forwarding.

## Logging
- Module: `src/lib/logger.ts`
- JSON lines to stdout/stderr: `ts`, `level`, `service`, `message`, plus meta
- `LOG_LEVEL` = `debug` | `info` | `warn` | `error` (default `info`)
- Request correlation: middleware sets `x-request-id`

Ship logs with your platform (Fly log drain, Docker → Loki/CloudWatch, etc.).

## Health
| Mode | Path | Meaning |
| --- | --- | --- |
| live | `/api/health?mode=live` | Process up |
| health | `/api/health` | DB reachable |
| ready | `/api/health?mode=ready` | DB + Redis (when configured) |

Used by Docker `HEALTHCHECK`, Fly, and Render.

## Metrics
- `GET /api/metrics` — Prometheus text
- `GET /api/metrics?format=json` — counters + recent errors

Auth:
1. `Authorization: Bearer $METRICS_TOKEN`, or
2. Staff session with `monitoring:read`

Example scrape:

```yaml
- job_name: relune
  bearer_token: "${METRICS_TOKEN}"
  static_configs:
    - targets: ["app.yourdomain.com"]
  metrics_path: /api/metrics
  scheme: https
```

## Error tracking
- Server: `captureException` via `src/lib/error-tracking.ts` (API `fail()`, process handlers)
- Client: `ClientErrorReporter` + `/api/errors` ingest; `app/error.tsx` reports digests
- Optional Sentry: set `SENTRY_DSN` (and optionally `SENTRY_ENVIRONMENT`, `APP_VERSION`)

Without Sentry, errors still appear as structured logs and in `/api/metrics?format=json`.

## Admin UI
`/admin/monitoring` — DB-backed snapshot (uptime, memory, security events).
