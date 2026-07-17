# Relune production image
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Placeholder secrets so Next build can evaluate modules that read env
ENV AUTH_SECRET=build-time-placeholder-secret-min-32-chars
ENV AUTH_URL=http://localhost:3000
ENV NEXTAUTH_URL=http://localhost:3000
ENV MAIL_PROVIDER=log
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 relune \
  && useradd --system --uid 1001 --gid relune relune
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=builder /app/scripts/backup.sh ./scripts/backup.sh
COPY --from=builder /app/scripts/restore.sh ./scripts/restore.sh
RUN chmod +x ./scripts/docker-entrypoint.sh ./scripts/backup.sh ./scripts/restore.sh \
  && mkdir -p public/uploads data/backups \
  && chown -R relune:relune /app
USER relune
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=50s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health?mode=ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["./scripts/docker-entrypoint.sh"]
