# BODIQO

Premium standalone marketplace platform for physical products — electronics, home, fashion, beauty, sports, automotive, and more.

BODIQO is **not Shopify**. It is an independent Next.js commerce stack with a Shopify-like admin so daily operations require **zero code**.

## Features

### Storefront
- Home, Shop, Categories, Product pages, Search & advanced filters
- Wishlist, Cart, Checkout, Track Order
- About, Contact, FAQ, Blog, CMS policy pages
- Login / Register / Customer dashboard
- Premium dark UI with blue accent, sticky header, motion, mobile-first

### Admin (Shopify-like)
- Dashboard, Products (CRUD, duplicate, bulk edit, variants, media)
- Orders, Customers, Inventory (Available / Reserved / Sold)
- Categories (nested), Collections, Coupons, Reviews, Analytics
- Media Library (local or Cloudinary), Homepage Builder, Menus, Pages, Blog, SEO
- Payments (PayPal + Stripe + Apple/Google Pay via Stripe), Crypto wallets
- Shipping, Taxes, Users & Roles (USER / STAFF / ADMIN), Settings
- Dropshipping hub (AliExpress / CSV / supplier links)

### Payments
- **PayPal** — Business Email, Client ID/Secret, Sandbox/Live (Admin → Payments)
- **Stripe** — keys + webhooks; Apple Pay / Google Pay when domain-verified
- **Crypto** — BTC, ETH, USDT (TRC20/ERC20), USDC, SOL, BNB wallet addresses only (no private keys)

### Inventory
- Automatic reservation on unpaid checkout, reduction on paid orders
- Stock restore on refund
- Low stock / out of stock; Add to Cart hidden when OOS

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | SQLite locally / PostgreSQL in production |
| ORM | Prisma |
| Auth | NextAuth.js (Auth.js) v5 |
| Motion | Framer Motion |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Payments | PayPal, Stripe, Crypto wallets |

## Installation

```bash
# Node.js 20+
git clone https://github.com/mohamadkhashan996-sudo/bodiqo.git
cd bodiqo
cp .env.example .env
npm install

# Local default uses SQLite (no Docker required)
npm run db:push
npm run db:seed

# Optional production Postgres:
# docker compose up -d
# set DATABASE_URL + change prisma provider to postgresql
# npm run db:push && npm run db:seed

npm run dev
```

- Store: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)
- Demo admin: `demo@bodiqo.com` / `bodiqo1234`

## GitHub

- Repository: [mohamadkhashan996-sudo/bodiqo](https://github.com/mohamadkhashan996-sudo/bodiqo)
- Active branch: `develop`
- Collaborator (Write): [WoodbutcherTh1](https://github.com/WoodbutcherTh1)

## Documentation

- [CHANGELOG.md](./CHANGELOG.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [LICENSE](./LICENSE)

## License

MIT
