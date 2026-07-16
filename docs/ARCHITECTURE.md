# Cirqua — Architecture (Phase 1)

## Principles
- Modular boundaries by domain
- Thin route handlers; fat services
- Typed contracts at module edges
- Production-shaped from day one (even when Phase 1 ships a shell)

## Stack
| Layer | Choice |
| --- | --- |
| App | Next.js 15 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS 4 + Framer Motion + Cirqua design system |
| Data | Prisma → PostgreSQL (production) / SQLite (local Phase 1) |
| Auth | NextAuth (Auth.js) v5 |
| Cache / realtime (Phase 2+) | Redis, Socket.io, WebRTC |
| Media (Phase 2+) | Cloudinary + UploadThing |

## Module map (`src/modules`)

| Module | Responsibility |
| --- | --- |
| `auth` | Sessions, credentials, OAuth adapters, guards |
| `users` | Profiles, follows, privacy |
| `feed` | Posts, reactions, ranking hooks |
| `messaging` | DMs, conversation ACLs |
| `media` | Upload pipelines, transforms, CDN URLs |
| `notifications` | In-app / push fanout contracts |
| `communities` | Circles / spaces membership |
| `admin` | Moderation, audit, ops |

Supporting layers:
- `src/components` — UI primitives & layouts
- `src/design-system` — tokens, typography helpers
- `src/services` — cross-cutting infra (mail, queue stubs)
- `src/lib` — prisma, errors, rate-limit, logger, security helpers
- `src/config` — env & feature flags
- `src/hooks` — client hooks
- `docs/` — brand + architecture

## API posture
- Zod validation on inputs
- AuthN / AuthZ checks in services
- Rate limiting for sensitive routes
- Structured error responses
- Request logging hooks (Phase 1: health + auth scaffolding)

## Security baseline
- Parameterized Prisma queries (SQLi mitigation)
- Next.js XSS defaults + careful `dangerouslySetInnerHTML` ban
- CSRF via Auth.js / SameSite cookies
- Brute-force resistance via rate limits
- Spam / fake account hooks prepared in user model (`trustScore`, `status`)

## Data scale notes
- Index foreign keys + high-cardinality lookup columns
- Soft-delete where moderation needs retention
- Prepare for sharding keys later via opaque public IDs (`cuid` / `ulid`-style)
