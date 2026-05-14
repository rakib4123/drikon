# ─── Stage 1: build ───
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace files for proper monorepo install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types

# Generate Prisma client + build
RUN cd apps/api && pnpm db:generate && pnpm build

# ─── Stage 2: runtime ───
FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate \
    && apk add --no-cache tini

# Create non-root user
RUN addgroup -S drikon && adduser -S drikon -G drikon

# Copy build artefacts + production deps
COPY --from=builder --chown=drikon:drikon /app/apps/api/dist ./dist
COPY --from=builder --chown=drikon:drikon /app/apps/api/package.json ./
COPY --from=builder --chown=drikon:drikon /app/apps/api/prisma ./prisma
COPY --from=builder --chown=drikon:drikon /app/node_modules ./node_modules

USER drikon

EXPOSE 4000

ENV NODE_ENV=production

# tini for proper PID 1 signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
