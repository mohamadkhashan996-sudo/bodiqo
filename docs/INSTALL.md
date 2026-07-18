# Installation

## Requirements

- Node.js 20+
- npm 10+
- Docker (recommended for Postgres + Redis)

## Quick start

```bash
git clone <repo-url>
cd relune
git checkout social-platform
cp .env.example .env   # or let `npm run up` create a minimal .env
npm install
npm run up             # Postgres + Redis + migrate + seed + server
```

Open http://localhost:3000

`npm run up` starts embedded Postgres/Redis when Docker is unavailable (uses `pgserver` + `redislite`). With Docker:

```bash
docker compose up postgres redis -d
npm run db:migrate
npm run db:seed:phase2 && npm run db:seed:phase3 && npm run db:seed:phase4
npm run dev
```

> **Note:** Relune uses PostgreSQL. `npm run up` writes `DATABASE_URL` / `REDIS_URL` into `.env` automatically for the embedded stack.

## Verify

```bash
npm run test:smoke
npm run test:verify   # auth + feed + messaging + socket.io
```

## Demo accounts (development only)

Password for all: `cirqua1234`

- `maya@cirqua.local`
- `leo@cirqua.local`
- `sana@cirqua.local`
- `admin@cirqua.local` (SUPER_ADMIN) → `/admin`

Demo seeds are **blocked in production** unless `ALLOW_DEMO_SEEDS=true`.

## Production

See `docs/DEPLOY.md`, `docs/PRODUCTION.md`, and `docs/RELEASE.md`.

```bash
cp .env.example .env
# Set MAIL_PROVIDER=resend, RESEND_API_KEY, strong AUTH_SECRET, public AUTH_URL
docker compose up -d --build
# or: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Mobile (iOS / Android)

See `docs/MOBILE.md`.

```bash
export CAPACITOR_SERVER_URL=https://your.production.domain
npm run mobile:add
npm run mobile:sync
```

## Scripts

| Script                   | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `npm run dev`            | Custom server (Next + Socket.io)                         |
| `npm run build`          | Production build                                         |
| `npm start`              | Production server                                        |
| `npm run db:migrate`     | Apply migrations (production)                            |
| `npm run db:migrate:dev` | Create/apply migrations locally                          |
| `npm run typecheck`      | TypeScript                                               |
| `npm run lint`           | ESLint                                                   |
| `npm run up`             | One-command local boot (infra + migrate + seed + server) |
| `npm run test:smoke`     | Local API smoke checks                                   |
| `npm run test:verify`    | Auth, feed, messaging, socket.io verification            |

## Brand note

Product brand is **Relune**. The `relune-store-backup` git branch is an unrelated store snapshot — do not modify it for Relune work.
