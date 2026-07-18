# Phase 6 — Final optimization · testing · production · future

## Goals

Make Relune production-ready: secure, documented, deployable, SEO/PWA prepared, email capable, analytics-pluggable.

## Delivered

- **SEO:** metadataBase, Open Graph, Twitter cards, JSON-LD, `sitemap.xml`, `robots.txt`
- **PWA:** web manifest, service worker (`/sw.js`), installable icons, splash retained
- **Email:** branded templates (welcome/verify/reset/security/digest) + Resend provider hook (`MAIL_PROVIDER`)
- **Analytics:** pluggable client tracker (none/console/plausible) + page views
- **Security:** same-origin checks on guarded writes; rate limits on posts, reports, communities, forgot-password
- **Ops:** health/ready/live modes; Dockerfile; INSTALL/DEPLOY/API/MAINTENANCE/FUTURE docs
- **UX fixes:** communities create flow; Cirqua→Relune residual brand cleanup on marketing/auth/loading
- **Smoke test:** `npm run test:smoke`

## Manual / legal (do not guess)

- Relune trademark + domain availability (USPTO/EUIPO/WIPO, stores, handles) — see `docs/brand/BRAND.md`
- Production mail DNS (SPF/DKIM/DMARC)
- Privacy policy / terms for real-user launch
- Penetration test before handling sensitive scale

## Verify locally

```bash
npm run typecheck
npm run build
npm run test:smoke
```

Admin: `admin@cirqua.local` / `cirqua1234`
