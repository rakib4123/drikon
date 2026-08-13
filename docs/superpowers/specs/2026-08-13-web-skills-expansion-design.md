# Web skills expansion — design

Date: 2026-08-13

## Goal

Expand Drikon's demonstrated engineering surface with four new,
independent-but-complementary subsystems, without duplicating anything
already built (REST API, JWT auth, RBAC, rate limiting, structured
logging, Jest/Vitest/Playwright testing, CI, Redis, BullMQ, Cloudinary
uploads).

## Scope

1. GraphQL API
2. Real-time (WebSockets)
3. SEO + PWA
4. Full-text product search

## 1. GraphQL API

Add `@nestjs/graphql` + Apollo Server (code-first) as a parallel API
surface alongside the existing REST controllers, reusing the existing
service layer — no duplicated business logic.

- New module: `apps/api/src/modules/graphql/`
- Types: `Product`, `Category`, `Brand` (code-first classes with
  `@ObjectType()`/`@Field()`)
- Resolvers: `products` (paginated/filterable list, mirroring existing
  REST query params), `product(slug)`, `categories`
- `DataLoader` for `Product.category` / `Product.brand` to avoid N+1
  queries
- Mounted at `/graphql`; Apollo sandbox enabled only outside
  production (`NODE_ENV !== 'production'`)

## 2. Real-time (WebSockets)

NestJS `@WebSocketGateway` (Socket.io) at `/ws`, JWT-authenticated
using the existing access-token guard.

- `stock:updated` — emitted from `ProductsService.update()` when
  `stock` changes; clients viewing that product's detail page
  subscribe to it
- `order:created` — emitted to an `admin` room when an order is
  created; the admin dashboard subscribes for a live order feed
- Frontend: `useSocket` hook in `apps/web/src/lib`, wired into the
  product detail page and the admin dashboard

## 3. SEO + PWA

- `apps/web/src/app/sitemap.ts` / `robots.ts` (Next.js file
  conventions) — sitemap enumerates active product slugs from the API
- `generateMetadata()` on product/category pages: OpenGraph + Twitter
  card metadata
- JSON-LD `Product` structured data (price, availability, rating) via
  `<script type="application/ld+json">` on product detail pages
- `manifest.json` + app icons for installability
- Minimal service worker: cache-first for static assets, network-first
  for pages. No offline cart/checkout — installable shell only.

## 4. Full-text product search

- Postgres `tsvector` generated column on `Product` (`name` +
  `description`, weighted), GIN index — migrated via Prisma's
  `fullTextSearch` preview feature (already enabled in
  `schema.prisma`)
- New endpoint: `GET /api/v1/products/search?q=`, ranked by `ts_rank`
- Same query exposed as a GraphQL field once (1) lands

## Build order

1. Full-text search (foundation; no dependents)
2. GraphQL API (exposes search as a field)
3. Real-time
4. SEO + PWA (independent, lowest risk, can land anytime — sequenced
   last)

## Testing

- Unit tests for resolvers, gateway event handlers, and search ranking
  logic (Jest, matching the existing `*.spec.ts` convention in
  `apps/api`)
- One Playwright e2e smoke test per user-facing feature (search
  results render, live stock update reflects in UI)

## Out of scope

- i18n / multi-language support
- Offline cart/checkout persistence via service worker
- GraphQL subscriptions (real-time stays on the separate WebSocket
  gateway for this iteration)
