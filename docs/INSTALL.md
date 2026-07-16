# Installation

## Requirements
- Node.js 20+
- npm 10+
- Docker (recommended for Postgres + Redis)

## Quick start
```bash
git clone <repo-url>
cd bodiqo
git checkout social-platform
cp .env.example .env
docker compose up postgres redis -d
npm install
npx prisma generate
npm run db:migrate
npm run db:seed:phase2
npm run db:seed:phase3
npm run db:seed:phase4
npm run dev
```
Open http://localhost:3000

> **Note:** Relune uses PostgreSQL. Update `DATABASE_URL` in `.env` if your ports differ.

## Demo accounts (development only)
Password for all: `cirqua1234`
- `maya@cirqua.local`
- `leo@cirqua.local`
- `sana@cirqua.local`
- `admin@cirqua.local` (SUPER_ADMIN) → `/admin`

Demo seeds are **blocked in production** unless `ALLOW_DEMO_SEEDS=true`.

## Production
```bash
cp .env.example .env
# Set MAIL_PROVIDER=resend, RESEND_API_KEY, strong AUTH_SECRET, public AUTH_URL
docker compose up -d
npm run db:migrate
npm run build
npm start
```

## Scripts
| Script | Purpose |
| --- | --- |
| `npm run dev` | Custom server (Next + Socket.io) |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run db:migrate` | Apply migrations (production) |
| `npm run db:migrate:dev` | Create/apply migrations locally |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run test:smoke` | Local API smoke checks |

## Brand note
Product brand is **Relune**. The `bodiqo-store-backup` git branch is an unrelated store snapshot — do not modify it for Relune work.
