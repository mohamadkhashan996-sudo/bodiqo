# API overview

Base URL: `AUTH_URL` (local `http://localhost:3000`)

## Conventions
- JSON request/response
- Auth via Auth.js session cookie
- Errors: `{ error, code? }` with HTTP status
- Staff routes require elevated `role` + permission matrix (`src/lib/permissions.ts`)
- Sensitive writes use `guardApiAbuse` (rate limit + same-origin check in production)

## Auth
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | Creates user + welcome/verify email |
| * | `/api/auth/[...nextauth]` | Auth.js (Google, Apple, Facebook, X, credentials) |
| GET | `/api/auth/providers-config` | Public provider availability |
| GET/DELETE/POST | `/api/auth/accounts` | Connected accounts / unlink / confirm link |
| GET | `/api/auth/link-account` | Pending OAuth link preview |
| POST | `/api/auth/forgot-password` | Reset link email |
| POST | `/api/auth/verify-email` | Consume token |
| POST | `/api/auth/reset-password` | Consume token |
| * | `/api/auth/2fa/*` | TOTP setup |
| GET/DELETE | `/api/auth/sessions` | Device sessions (`{ all: true }` revokes all) |
| GET | `/api/auth/login-history` | Login history |
| GET/DELETE | `/api/auth/trusted-devices` | Trusted devices |
| POST | `/api/upload` | Authenticated media upload (multipart `file`) |
| POST | `/api/auth/phone/send` | Send phone OTP |
| POST | `/api/auth/phone/login` | Verify phone OTP → session/2FA challenge |
| * | `/api/auth/phone` | Bind / verify / remove phone |
| * | `/api/auth/2fa/*` | Setup, enable, disable, recovery codes |
| POST | `/api/auth/password` | Change / set password |
| GET | `/api/auth/challenge` | Peek 2FA challenge |

## Social / feed
| Method | Path |
| --- | --- |
| GET/POST | `/api/posts` |
| * | `/api/posts/[id]/*` |
| GET | `/api/explore` |
| GET | `/api/search` |
| POST | `/api/social/report` |
| * | `/api/users/[handle]/*` |

## Messaging / calls / communities
| Method | Path |
| --- | --- |
| * | `/api/conversations*` |
| * | `/api/messages*` |
| * | `/api/calls*` |
| GET/POST | `/api/communities` |

## AI
| Method | Path |
| --- | --- |
| GET | `/api/ai?kind=recommend\|search\|trending` |
| POST | `/api/ai` actions: caption, hashtags, comment, spam, fake, translate |

## Admin (`requireStaff`)
| Path | Purpose |
| --- | --- |
| `/api/admin/overview` | Dashboard metrics |
| `/api/admin/users` | User moderation |
| `/api/admin/auth` | Provider flags + auth stats |
| `/api/admin/content` | Content moderation |
| `/api/admin/reports` | Report queue |
| `/api/admin/verification` | Verification review |
| `/api/admin/settings` | System settings |
| `/api/admin/backups` | Backup/restore |
| `/api/admin/analytics` | Analytics |
| `/api/admin/monitoring` | Ops monitoring |
| `/api/admin/media` | Media registry |
| `/api/admin/search` | Admin search |
| `/api/admin/roles` | Roles |
| `/api/admin/audit` | Audit log |

## Health & observability
| Path | Purpose |
| --- | --- |
| `GET /api/health` | DB ping |
| `GET /api/health?mode=ready` | Readiness |
| `GET /api/health?mode=live` | Liveness |
| `GET /api/metrics` | Prometheus metrics (`METRICS_TOKEN` or staff) |
| `GET /api/metrics?format=json` | JSON metrics + recent errors |
| `POST /api/errors` | Client error ingest (rate-limited) |

Realtime events are delivered over Socket.io (`/socket.io`) on the custom server — not REST.