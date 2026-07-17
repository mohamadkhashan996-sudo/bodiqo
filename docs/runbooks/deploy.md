# Runbook: Deploy & rollback

## Paths
| Target | How |
| --- | --- |
| Docker Compose | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` |
| Fly.io | `flyctl deploy` (CI: `.github/workflows/deploy.yml` when `FLY_API_TOKEN` set) |
| Render | Blueprint `render.yaml` — connect repo in Render dashboard |
| Image | Tag `v*` → `.github/workflows/release.yml` pushes `ghcr.io/<org>/<repo>` |

## Pre-deploy
1. `npm run release:check`
2. Migrations reviewed (`prisma/migrations`)
3. Secrets present (see `docs/PRODUCTION.md`)
4. Backup taken (`npm run backup` or admin)

## Deploy
```bash
# Compose
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Fly
flyctl deploy --remote-only
```

Entrypoint runs `prisma migrate deploy` then `tsx server.ts`.

## Verify
```bash
curl -fsS "$AUTH_URL/api/health?mode=ready"
npm run test:smoke   # BASE_URL=$AUTH_URL
```

## Rollback
1. Redeploy previous image tag / git tag.
2. If a migration is irreversible, restore DB from dump first (`docs/runbooks/restore.md`), then deploy the older app version.
3. Confirm ready health and sign-in smoke.
