# Relune

Presence, beautifully shared.

Premium social platform — modular, production-shaped, independent from the BODIQO storefront (`bodiqo-store-backup` branch).

## Quick start
See **[docs/INSTALL.md](docs/INSTALL.md)**.

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed:phase2 && npm run db:seed:phase3 && npm run db:seed:phase4
npm run dev
```

Demo password: `cirqua1234` · `maya@cirqua.local` · `admin@cirqua.local` (admin)

## Docs
| Doc | Topic |
| --- | --- |
| [INSTALL](docs/INSTALL.md) | Setup |
| [DEPLOY](docs/DEPLOY.md) | Production |
| [API](docs/API.md) | HTTP surface |
| [MAINTENANCE](docs/MAINTENANCE.md) | Ops |
| [FUTURE](docs/FUTURE.md) | Roadmap hooks |
| [BRAND](docs/brand/BRAND.md) | Relune identity + legal checks |
| [PHASE-6](docs/PHASE-6.md) | Production readiness |

## Stack
Next.js 15 · React 19 · Prisma · NextAuth · Socket.io · Tailwind 4 · Framer Motion
