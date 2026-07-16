# Phase 1 — Project Transfer (complete when green)

## Goals
1. Preserve the e-commerce store untouched on `bodiqo-store-backup`.
2. Launch independent Cirqua foundation on `social-platform`.
3. Brand, design system, modular architecture, auth scaffolding, runnable UI.

## Delivered
- Store backup branch (immutable unless explicitly requested)
- Cirqua brand + guidelines + mark/wordmark/app icon/favicon
- Design tokens + typography + splash/loading
- Modular folder architecture
- Prisma foundation (User/Auth/Post/AuditLog)
- NextAuth credentials auth + registration rate limits
- Marketing landing, auth pages, app shell
- Health API, docker-compose for Postgres + Redis
- Documentation (BRAND, ARCHITECTURE)

## Not in Phase 1 (next phases)
- Full feed / discovery ranking
- Realtime messaging (Socket.io) + WebRTC
- Redis-backed rate limits / queues
- UploadThing + Cloudinary production pipelines
- Circles product surface
- Admin moderation console UI

## Local run
```bash
git checkout social-platform
cp .env.example .env   # if needed
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000
