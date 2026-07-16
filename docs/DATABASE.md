# Database

## Engines
| Environment | Engine |
| --- | --- |
| Local default | SQLite (`file:./dev.db`) |
| Production | PostgreSQL 16 (see `docker-compose.yml`) |

## Schema
Source of truth: `prisma/schema.prisma`

Key domains: users/auth, feed/media, messaging/calls, communities, moderation/admin, analytics.

## Commands
```bash
npx prisma generate
npx prisma db push
npx prisma studio
```

Seeds:
```bash
npm run db:seed:phase2
npm run db:seed:phase3
npm run db:seed:phase4
```

## Scale notes
- Prefer Postgres + connection pooling (PgBouncer) beyond single-node
- Swap in-memory rate limit/cache for Redis (`REDIS_URL`)
- Use managed backups (`pg_dump`) in addition to app JSON backups
- Soft-delete and indexes are already modeled for moderation retention
