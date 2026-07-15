# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-07-16

### Added

- First-launch `/setup` wizard (admin, store, logo, PayPal, crypto wallets)
- Production-empty seed; `db:purge-demo` and optional `db:seed:demo`

### Removed

- Automatic demo admin (`demo@bodiqo.com`) and storefront catalog.json fallback

## [0.4.0] - 2026-07-16

### Added

- General-merchandise marketplace pivot (unlimited categories, blue premium UI)
- Nested categories, tags/collections schema, product status (draft/publish/archive)
- Wishlist, track order, blog, CMS policies, FAQ, contact
- Stripe + crypto wallet checkout (addresses only); tax rates; STAFF role
- Product duplicate + bulk edit; Cloudinary media adapter; sitemap/robots
- Homepage builder, menus/pages/blog CRUD, sellers schema hook for future multi-vendor
- Shop filters: brand, price, newest, bestselling, rating + pagination

### Changed

- Brand accent champagne → blue; copy no longer automotive-only
- Inventory sync shared across PayPal/Stripe/crypto; refund restores stock

## [0.3.0] - 2026-07-15

### Added

- Internal dropshipping hub (AliExpress URL + CSV import) — no Shopify/DSers dependency
- Suppliers management, product variants, cost/markup/inventory tools
- Supplier order export CSV and fulfillment status workflow
- Product editor fields for supplier links and dropship controls

## [0.2.0] - 2026-07-15

### Added

- Full Admin CMS (`/admin`) for products, orders, categories, coupons, media, import, and settings
- PayPal Checkout with credentials stored in Admin → Settings (Sandbox/Live)
- Store settings for SMTP, shipping, currency, language, domain, SEO, and homepage
- CSV + Shopify JSON product import (DSers/Shopify migration path)
- Customer account dashboard with order history
- Media uploads to `/public/uploads`

### Changed

- Premium storefront UI overhaul (spacing, typography, cards, sticky header, search/filters)
- Checkout redirects to PayPal when enabled; orders marked PAID on capture
- Catalog prefers PostgreSQL with JSON fallback

## [0.1.0] - 2026-07-15

### Added

- Next.js 15 App Router storefront with TypeScript and Tailwind CSS
- Premium homepage, shop, product detail, cart, and checkout flows
- Catalog imported and normalized from bodiqo.store (11 products)
- Prisma schema for PostgreSQL (users, products, orders)
- NextAuth credentials authentication with registration API
- Framer Motion interactions and luxury brand UI
- Docker Compose PostgreSQL, seed script, and project documentation
- GitHub repository wiring with `main` / `develop` branch strategy
