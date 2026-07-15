# Contributing to BODIQO

Thanks for helping improve the BODIQO storefront.

## Branch workflow

1. Create a feature branch from `develop`:

```bash
git checkout develop
git pull
git checkout -b feature/short-description
```

2. Implement your change.
3. Before committing, run quality checks:

```bash
npm run lint
npm run format
npx tsc --noEmit
npm run build
```

4. Commit with a clear message focused on why the change exists.
5. Open a pull request into `develop`.
6. Merge `develop` → `main` only when the release is stable.

## Coding guidelines

- Prefer TypeScript-strict patterns; avoid `any`.
- Keep components focused; colocate UI in `src/components`.
- Use the shared catalog helpers in `src/lib/catalog.ts` for product reads.
- Do not commit secrets (`.env`). Use `.env.example` for documentation.
- Match the existing premium visual language (graphite + champagne accent).

## Database changes

1. Update `prisma/schema.prisma`
2. Run `npm run db:push` locally (or create a migration when adopting migrate workflow)
3. Update seed data if product/category shape changes

## Reporting issues

Include steps to reproduce, expected vs actual behavior, and environment details (Node version, OS, whether Docker Postgres is running).
