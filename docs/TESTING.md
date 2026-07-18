# Testing

## Commands

| Script                  | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `npm test`              | Vitest unit suite                         |
| `npm run test:watch`    | Vitest watch mode                         |
| `npm run test:smoke`    | HTTP smoke vs running server (`BASE_URL`) |
| `npm run test:verify`   | Broader API + Socket.IO checks            |
| `npm run typecheck`     | TypeScript                                |
| `npm run lint`          | ESLint                                    |
| `npm run release:check` | Pre-release gate                          |

## CI

`.github/workflows/ci.yml` runs typecheck → unit tests → lint → build → smoke against an ephemeral server (Postgres + Redis services).

## Writing tests

- Place `*.test.ts` next to the module under `src/`
- Use path alias `@/` (see `vitest.config.ts`)
- Prefer pure unit tests for permissions, parsing, and helpers
- Use smoke/verify for end-to-end HTTP against a real process

## Local full check

```bash
npm run up          # or docker compose up -d
npm test
npm run test:smoke
npm run test:verify
```
