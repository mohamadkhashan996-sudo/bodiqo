# Relune — Architecture

## Principles
- Modular boundaries by domain
- Thin route handlers; fat services
- Typed contracts at module edges
- Production-shaped from day one

## Stack
| Layer | Choice |
| --- | --- |
| App | Next.js 15 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS 4 + Framer Motion + Relune design system |
| Data | Prisma → PostgreSQL (production) / SQLite (local) |
| Auth | NextAuth (Auth.js) v5 |
| Realtime | Socket.io via custom `server.ts` |
| Cache | In-memory (Redis-ready) |

## Module map (`src/modules`)
| Module | Responsibility |
| --- | --- |
| `auth` | Sessions, credentials, OAuth, tokens |
| `users` | Profiles, follows, privacy |
| `feed` | Posts, comments |
| `messaging` | DMs, conversation ACLs |
| `media` | Calls, stories |
| `notifications` | In-app fanout |
| `communities` | Spaces membership |
| `admin` | Moderation, audit, ops |
| `ai` | Recommendations & assists |

See also: `docs/API.md`, `docs/DEPLOY.md`, `docs/FUTURE.md`.
