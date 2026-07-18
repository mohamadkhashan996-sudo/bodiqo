# Changelog

## 1.0.0 — 2026-07-16

### Platform

- Social feed, profiles, communities, hashtags, trending, bookmarks
- Messaging (DM/group), media, reactions, search
- WebRTC calls with TURN support and call history
- Notifications + Web Push
- Admin moderation, analytics, audit, settings
- Security: 2FA (TOTP), device sessions, rate limits, CSP

### Deployment

- Custom Node server (`server.ts`) with Socket.IO + optional Redis adapter
- Docker / Compose / Fly / Render blueprints
- Capacitor iOS & Android shells loading production HTTPS
- GitHub Actions CI + release image publish
- Production env validation, health probes, maintenance mode
