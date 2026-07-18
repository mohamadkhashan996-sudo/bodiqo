# Phase 12 — Deployment & project complete

Closes Relune launch readiness: web containers, mobile shells, CI/CD, and release gates.

## Delivered

- **Web:** hardened `Dockerfile`, `docker-compose.prod.yml`, Fly (`fly.toml`), Render (`render.yaml`)
- **CI/CD:** `.github/workflows/ci.yml` + tag-based `release.yml` (GHCR)
- **Mobile:** Capacitor config, `mobile/www` fallback, iOS/Android docs + permission templates
- **Deep links:** `public/.well-known/{apple-app-site-association,assetlinks.json}`
- **Release:** `npm run release:check`, `docs/RELEASE.md`, `docs/MOBILE.md`, expanded `docs/DEPLOY.md`
- **Version:** `1.0.0`

## Commands

```bash
# Web
docker compose up -d --build
# or production overlay:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Mobile
export CAPACITOR_SERVER_URL=https://your.domain
npm run mobile:add
npm run mobile:sync

# Gate
npm run release:check
```

## Project status

**Relune 1.0 is deployment-ready.** Remaining work is operational (DNS, store accounts, secrets, monitoring) rather than product scaffolding.
