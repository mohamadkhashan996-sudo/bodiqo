# Relune

**Presence, beautifully shared.** · v1.0.0

Premium social platform — modular, production-ready, independent from the BODIQO storefront (`bodiqo-store-backup` branch).

## Quick start
See **[docs/INSTALL.md](docs/INSTALL.md)**.

```bash
npm install
npm run up
```

Open http://localhost:3000 · Demo: `maya@cirqua.local` / `cirqua1234`

```bash
npm run test:smoke
npm run test:verify
npm test
```

## Deploy
| Path | Doc |
| --- | --- |
| Web (Docker / Fly / Render) | [DEPLOY](docs/DEPLOY.md) |
| Production env | [PRODUCTION](docs/PRODUCTION.md) |
| Observability | [OBSERVABILITY](docs/OBSERVABILITY.md) |
| Testing | [TESTING](docs/TESTING.md) |
| Runbooks | [docs/runbooks](docs/runbooks/) |
| Cut a release | [RELEASE](docs/RELEASE.md) |
| iOS & Android | [MOBILE](docs/MOBILE.md) |

```bash
npm run release:check
docker compose up -d --build
# Mobile shells:
export CAPACITOR_SERVER_URL=https://your.domain
npm run mobile:add && npm run mobile:sync
```

## Docs
| Doc | Topic |
| --- | --- |
| [INSTALL](docs/INSTALL.md) | Setup |
| [DEPLOY](docs/DEPLOY.md) | Production web |
| [PRODUCTION](docs/PRODUCTION.md) | Launch checklist |
| [OBSERVABILITY](docs/OBSERVABILITY.md) | Logs, metrics, errors |
| [TESTING](docs/TESTING.md) | Unit / smoke / CI |
| [MOBILE](docs/MOBILE.md) | Capacitor iOS / Android |
| [RELEASE](docs/RELEASE.md) | Versioning & go-live |
| [API](docs/API.md) | HTTP surface |
| [MAINTENANCE](docs/MAINTENANCE.md) | Ops cadence |
| [runbooks](docs/runbooks/) | Incident, restore, deploy, secrets |
| [CHANGELOG](CHANGELOG.md) | 1.0.0 notes |
| [PHASE-12](docs/PHASE-12.md) | Deployment phase |
| [FUTURE](docs/FUTURE.md) | Roadmap hooks |
| [BRAND](docs/brand/BRAND.md) | Relune identity + legal checks |

## Stack
Next.js 15 · React 19 · Prisma · NextAuth · Socket.io · Capacitor · Tailwind 4 · Framer Motion
