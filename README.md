# Cirqua

**Presence, beautifully shared.**

Cirqua is a premium social platform — modular, production-shaped, and independent from the BODIQO storefront.

> Store backup (immutable): Git branch `bodiqo-store-backup`

## Phase status

### Phase 1 — Foundation
Brand, design system, modular architecture, runnable shell.

### Phase 2 — Auth · Users · Feed · Social
Authentication, onboarding, profiles, feed, explore, search, notifications, stories, shorts.

### Phase 3 — Realtime · Messaging · Calls · Communities · Privacy
Custom Socket.io server, DMs/groups, WebRTC voice/video signaling, communities, and privacy controls.

Docs: `docs/PHASE-1.md`, `docs/PHASE-2.md`, `docs/PHASE-3.md`, `docs/brand/BRAND.md`, `docs/ARCHITECTURE.md`.

## Local development

```bash
git checkout social-platform
npm install
cp .env.example .env
npx prisma db push
npm run db:seed:phase2
npm run db:seed:phase3
npm run dev
```

`npm run dev` runs the custom Next.js + Socket.io server (`server.ts`).

- Site: http://localhost:3000  
- Health: http://localhost:3000/api/health  
- Realtime: Socket.io on the same origin  

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
