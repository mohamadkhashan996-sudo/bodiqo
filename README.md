# Cirqua

**Presence, beautifully shared.**

Cirqua is a premium social platform foundation — modular, production-shaped, and independent from any e-commerce storefront.

> The previous BODIQO store lives untouched on Git branch `bodiqo-store-backup`.

## Phase 1 status

Foundation complete:
- Brand system + assets
- Design tokens / splash / loading
- Auth scaffolding (NextAuth credentials + register)
- Modular architecture
- Prisma data foundation
- Marketing landing + app shell

See `docs/PHASE-1.md`, `docs/brand/BRAND.md`, and `docs/ARCHITECTURE.md`.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · Prisma · NextAuth · Framer Motion  
Prepared for: PostgreSQL · Redis · Socket.io · WebRTC · Cloudinary · UploadThing

## Local development

```bash
git checkout social-platform
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

- Site: http://localhost:3000
- Health: http://localhost:3000/api/health

### Postgres + Redis (optional)

```bash
docker compose up -d
# then switch DATABASE_URL / provider to postgresql and redis URL
```

## Brand note

Cirqua was selected after comparing multiple candidates. Trademark and domain clearance still require **manual legal verification** before launch — see `docs/brand/BRAND.md`.
