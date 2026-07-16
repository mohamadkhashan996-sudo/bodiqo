# Phase 4 — Admin Dashboard · Database · Security · Performance

## Delivered

### Admin dashboard (`/admin`)
- Overview metrics: users, activity, reports, verification queue, server/DB/storage health, revenue-ready flag
- User management: search/filter, edit, suspend, temp/permanent ban, delete, password/2FA reset, verify, notes, warnings, login/device history, logout-all
- Content: posts, videos, stories, comments, communities, deleted content, pin/unpin, hashtag trends
- Moderation center: report queue by status/category (spam, fake, scam, harassment, copyright, …)
- Verification workflow: approve / reject / request info (+ user API `POST /api/verification`)
- Roles & permissions: SUPER_ADMIN, OWNER, ADMIN, MODERATOR, SUPPORT, USER + custom roles
- System settings JSON panel (site, email, push, maintenance, security, storage, media/video/comment/registration)
- Backups: manual/daily/weekly, download, settings restore
- Media registry + storage stats
- Analytics (DAU/MAU, growth series, countries, devices, features)
- Monitoring (errors, audit volume, memory, security events)
- Admin search across users/posts/videos/communities/messages/comments/stories

### Database
- Expanded `Role`, `AccountStatus.BANNED`, ban fields, report status/category
- Models: `SystemSetting`, `CustomRole`, `VerificationRequest`, `UserNote`, `UserWarning`, `MediaAsset`, `BackupRecord`, `SecurityEvent`, `AnalyticsDaily`
- Indexes on high-traffic admin queries

### Security & performance
- `requireStaff` / permission matrix (`src/lib/permissions.ts`)
- API rate limiting + security event logging (`guardApiAbuse`)
- CSP + security headers in middleware
- In-memory cache layer (`src/lib/cache.ts`) for overview/analytics
- Automatic cleanup + scheduled backups on custom server boot
- Auth sessions / device logout-all remain available from Phase 2

## Demo access
```bash
npm run db:seed:phase4
```
- `admin@cirqua.local` / `cirqua1234` → **SUPER_ADMIN**
- `maya@cirqua.local` promoted to **ADMIN** (sign out/in to refresh JWT role)

## Key APIs
| Method | Path |
| --- | --- |
| GET | `/api/admin/overview` |
| GET/PATCH/POST | `/api/admin/users` |
| GET/POST | `/api/admin/content` |
| GET/PATCH | `/api/admin/reports` |
| GET/POST | `/api/admin/verification` |
| GET/PATCH | `/api/admin/settings` |
| GET/POST | `/api/admin/backups` |
| GET | `/api/admin/analytics` |
| GET | `/api/admin/monitoring` |
| GET/POST | `/api/admin/media` |
| GET | `/api/admin/search` |
| GET/POST | `/api/admin/roles` |
| GET | `/api/admin/audit` |
| GET/POST | `/api/verification` |

## Notes
- SQLite locally; Postgres via `docker-compose.yml` for production scale
- Redis URL is reserved; cache/rate-limit currently memory-backed and swap-ready
- Full DB dump/restore in production should use `pg_dump` / volume snapshots — app backups store metadata + settings JSON under `data/backups/`
