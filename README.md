# BODIQO

Premium automotive accessories e-commerce platform.

BODIQO is a standalone Next.js storefront (not Shopify) for a luxury car accessories brand. The initial catalog is imported from [bodiqo.store](https://bodiqo.store).

## Features

- Premium marketing homepage with full-bleed hero and motion
- Product catalog with category filters (phone holders, dash cams, chargers, and more)
- Product detail pages with related items
- Persistent shopping cart
- Checkout with order persistence in PostgreSQL
- NextAuth credentials authentication (sign in / sign up)
- Prisma ORM + PostgreSQL schema for users, products, and orders
- Framer Motion micro-interactions
- Responsive luxury dark UI (champagne accent on graphite)

## Tech Stack

| Layer     | Choice                   |
| --------- | ------------------------ |
| Framework | Next.js 15 (App Router)  |
| Language  | TypeScript               |
| Styling   | Tailwind CSS 4           |
| Database  | PostgreSQL               |
| ORM       | Prisma                   |
| Auth      | NextAuth.js (Auth.js) v5 |
| Motion    | Framer Motion            |
| State     | Zustand (cart)           |

## Installation

```bash
# Requirements: Node.js 20+, Docker (for local PostgreSQL)
git clone https://github.com/mohamadkhashan996-sudo/bodiqo.git
cd bodiqo
cp .env.example .env
npm install

# Start PostgreSQL
docker compose up -d

# Push schema + seed catalog + demo user
npm run db:push
npm run db:seed

# Develop
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo account (after seed): `demo@bodiqo.com` / `bodiqo1234`

> The storefront catalog renders from `src/data/catalog.json` (imported from bodiqo.store), so browsing works even before PostgreSQL is connected. Auth, registration, and checkout require the database.

## Environment variables

| Variable               | Description                                 |
| ---------------------- | ------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string                |
| `AUTH_SECRET`          | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_URL`             | App origin (e.g. `http://localhost:3000`)   |
| `NEXT_PUBLIC_SITE_URL` | Public site URL for metadata                |

See `.env.example`.

## Deployment

1. Provision PostgreSQL (Neon, Supabase, Railway, or managed Postgres).
2. Set environment variables on your host (Vercel recommended).
3. Run migrations / push schema: `npx prisma db push`
4. Seed production catalog: `npm run db:seed`
5. Deploy the Next.js app (`npm run build` → `npm start`, or Vercel).

Allow `cdn.shopify.com` for product images (already configured in `next.config.ts`).

## Folder structure

```text
bodiqo/
├── docker-compose.yml          # Local PostgreSQL
├── prisma/
│   ├── schema.prisma           # Database models
│   ├── seed.ts                 # Seed products + demo user
│   └── seed-source.json        # Raw Shopify export from bodiqo.store
├── src/
│   ├── app/                    # App Router pages + API routes
│   │   ├── api/auth/           # NextAuth + registration
│   │   ├── api/checkout/       # Order creation
│   │   ├── auth/               # Sign in / sign up UI
│   │   ├── cart/               # Cart
│   │   ├── checkout/           # Checkout + success
│   │   ├── product/[slug]/     # Product detail
│   │   ├── shop/               # Catalog
│   │   └── about/              # Brand story
│   ├── components/             # UI building blocks
│   ├── data/catalog.json       # Normalized product catalog
│   ├── lib/                    # Catalog helpers, Prisma, utils
│   ├── store/                  # Zustand cart
│   └── auth.ts                 # NextAuth config
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Scripts

| Script                | Purpose                    |
| --------------------- | -------------------------- |
| `npm run dev`         | Start Turbopack dev server |
| `npm run build`       | Production build           |
| `npm run start`       | Start production server    |
| `npm run lint`        | ESLint                     |
| `npm run format`      | Prettier                   |
| `npm run db:generate` | Generate Prisma client     |
| `npm run db:push`     | Push Prisma schema to DB   |
| `npm run db:seed`     | Seed catalog + demo user   |
| `npm run db:studio`   | Open Prisma Studio         |

## Branch strategy

- `main` — stable releases
- `develop` — integration branch
- `feature/*` — feature work → merge into `develop`

## License

MIT — see [LICENSE](./LICENSE).
