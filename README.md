# Cirqua

**Presence, beautifully shared.**

Cirqua is a premium social platform — modular, production-shaped, and independent from the BODIQO storefront.

> Store backup (immutable): Git branch `bodiqo-store-backup`

## Phase status

### Phase 1 — Foundation
Brand, design system, modular architecture, runnable shell.

### Phase 2 — Auth · Users · Feed · Social
Complete authentication (email + OAuth hooks + 2FA), onboarding, profiles, follow/block/mute/report, home feed, posts/comments, explore, search, notifications, stories, and shorts.

Docs: `docs/PHASE-1.md`, `docs/PHASE-2.md`, `docs/brand/BRAND.md`, `docs/ARCHITECTURE.md`.

## Local development

```bash
git checkout social-platform
npm install
cp .env.example .env
npx prisma db push
npm run db:seed:phase2
npm run dev
```

- Site: http://localhost:3000  
- Health: http://localhost:3000/api/health  

Demo logins (password `cirqua1234`):
- `maya@cirqua.local`
- `leo@cirqua.local`
- `sana@cirqua.local`

### OAuth
Providers activate when credentials are set in `.env` (see `.env.example`).

### Postgres + Redis (optional)

```bash
docker compose up -d
```

Then switch `DATABASE_URL` / Prisma provider to PostgreSQL for production shape.
