# Database

## Engines
| Environment | Engine |
| --- | --- |
| Local | PostgreSQL 16 via Docker (`docker compose up postgres -d`) |
| Production | PostgreSQL 16 + Redis |

## Schema
Source of truth: `prisma/schema.prisma`

## Commands
```bash
npx prisma generate
npm run db:migrate:dev   # local schema changes
npm run db:migrate       # production deploy
npx prisma studio
```

Legacy `db push` remains for quick experiments only — prefer migrations.

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
