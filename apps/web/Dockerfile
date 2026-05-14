# ─── Stage 1: deps + build ───
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web
COPY packages/shared-types ./packages/shared-types

# Next.js standalone build (slim runtime image)
RUN cd apps/web && pnpm build

# ─── Stage 2: runtime ───
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache tini \
    && addgroup -S drikon \
    && adduser -S drikon -G drikon

# .next/standalone bundles only what we need
COPY --from=builder --chown=drikon:drikon /app/apps/web/.next/standalone ./
COPY --from=builder --chown=drikon:drikon /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=drikon:drikon /app/apps/web/public ./apps/web/public

USER drikon
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
