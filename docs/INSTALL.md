# Installation

## Requirements
- Node.js 20+
- npm 10+
- Optional: Docker (Postgres + Redis)

## Quick start (SQLite)
```bash
git clone <repo-url>
cd bodiqo
git checkout social-platform
cp .env.example .env
npm install
npx prisma db push
npm run db:seed:phase2
npm run db:seed:phase3
npm run db:seed:phase4
npm run dev
```
Open http://localhost:3000

## Demo accounts
Password for all: `cirqua1234`
- `maya@cirqua.local`
- `leo@cirqua.local`
- `sana@cirqua.local`
- `admin@cirqua.local` (SUPER_ADMIN) → `/admin`

## Postgres + Redis
```bash
docker compose up -d
# Set DATABASE_URL to the Postgres URL in .env
npx prisma db push
npm run db:seed:phase2 && npm run db:seed:phase3 && npm run db:seed:phase4
npm run dev
```

## Scripts
| Script | Purpose |
| --- | --- |
| `npm run dev` | Custom server (Next + Socket.io) |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run test:smoke` | Local API smoke checks |

## Brand note
Product brand is **Relune**. The `bodiqo-store-backup` git branch is an unrelated store snapshot — do not modify it for Relune work.
