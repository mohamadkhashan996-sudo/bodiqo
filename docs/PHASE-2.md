# Cirqua Phase 2 — Authentication · Users · Feed · Social

## Delivered

### Authentication
- Email register / login / logout
- Email verification tokens (dev mail logs + token return)
- Forgot / reset password
- TOTP 2FA setup / enable / disable + backup codes storage model
- Session / device session tracking, revoke sessions
- Login history + trusted devices APIs
- Secure session cookies via Auth.js
- OAuth: Google, Apple, GitHub, Microsoft Entra (env-gated)

### Onboarding
- Multi-step elegant wizard: photo, cover, username, bio, interests, language, theme

### Profiles & social
- Rich profile fields, verification flag, counts
- Tabs: Posts / Media / Videos / Saved / Likes / About
- Follow / unfollow, block, mute, report, friend requests
- Public / private account flag (`isPrivate`)

### Feed & posts
- Home feed with stories rail, composer, infinite scroll
- Post types: text, image, video/short, poll, link, repost fields
- Like, bookmark, comments, edit/delete APIs
- Explore + search (users, posts, hashtags) + notifications

### Stories & shorts
- 24h stories with view/react APIs
- Vertical Shorts experience

## Local demo

```bash
npx prisma db push
npm run db:seed:phase2
npm run dev
```

Accounts (password `cirqua1234`):
- maya@cirqua.local
- leo@cirqua.local
- sana@cirqua.local

## Notes
- OAuth buttons appear only when provider env vars are configured.
- Email delivery logs to console in development (production SMTP/provider later).
- Store branch `bodiqo-store-backup` remains untouched.
