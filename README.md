<div align="center">

# Drikon — The Tech Shop

**A full-stack, white-label tech e-commerce platform.** Storefront, REST API, and a complete admin panel — type-safe end to end and deployed across six free-tier services for **$0/month**.

[Live storefront](https://drikon-web.vercel.app) · [API](https://drikon-api.onrender.com) · [Repo](https://github.com/rakib4123/drikon)

![Next.js 15](https://img.shields.io/badge/Next.js-15-000) ![React 19](https://img.shields.io/badge/React-19-149eca) ![NestJS 11](https://img.shields.io/badge/NestJS-11-e0234e) ![Prisma](https://img.shields.io/badge/Prisma-5-2d3748) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![License](https://img.shields.io/badge/license-MIT-22c55e)

</div>

---

## What it is

Drikon is a **production-grade tech store** — laptops, PC components, and peripherals — not a toy demo. It pairs a polished Next.js storefront with a NestJS API and an admin panel that actually runs the shop: orders, customers, catalog, marketing, and **white-label branding** you control from the UI.

The same patterns you'd find in a real startup codebase: a pnpm/Turborepo monorepo, Zod schemas shared between client and server, rotating JWTs with reuse detection, role-based access, structured logging, schema-first migrations, and an edge CDN — all on free tiers.

---

## Features

### 🛍️ Storefront
- **Catalog** — product grid with filters, sort, pagination; rich product detail pages with related items
- **Mega-menu** navigation — parent → subcategory, driven by the live category tree
- **⌘K command-palette search** — debounced, abortable, instant results
- **Cart** — Zustand + `localStorage` persistence, quantity controls, toasts
- **Wishlist** — heart toggles synced to your account, a dedicated `/wishlist` page
- **Product compare** — pick up to 4, side-by-side spec table
- **Reviews & ratings** — star form, verified-buyer badges, live rating aggregates
- **Checkout & orders** — place an order, apply **coupon codes**, order confirmation + history
- **Flash sales** — time-boxed deals with a live countdown on the home page
- **Hero slider** — auto cross-fading, admin-managed banners
- Motion polish throughout (scroll reveals, hover, page transitions) with reduced-motion support

### 🛠️ Admin panel (`/admin`)
- **Dashboard** — revenue, orders, customers, pending count, top sellers, recent orders
- **Orders** — filter/search, inline status transitions
- **Users** — search, role management (with self-demotion guard)
- **Catalog** — products CRUD + Cloudinary uploads, categories & brands CRUD (nested categories), review moderation
- **Marketing** — discount coupons (percent/fixed, min-order, expiry, redemption caps) and flash sales (per-product sale prices)
- **Hero banners** — CRUD for the home slider (image, copy, CTA, ordering)
- **Branding / settings** — white-label the store: upload a logo, set the name, tagline, and accent colours; the whole UI re-themes at runtime

### 🔐 Platform
- **White-label branding** — one `SiteSettings` record drives the logo, name, metadata, and a runtime CSS accent override across the storefront
- **Auth** — register, login with **TOTP 2FA**, rotating refresh tokens, secure signed cookies
- **Role-based access** — `@Roles(ADMIN)` guards on the API, conditional UI on the client
- **Hardening** — Argon2id hashing, account lockout, 3-tier rate limiting, CSP/HSTS, strict CORS

---

## Stack

### Frontend (`apps/web`)

| Tech | Why |
|---|---|
| **Next.js 15** (App Router, RSC) | Server Components, hybrid static/dynamic rendering |
| **React 19** | Latest stable; `ref` as a prop, concurrent rendering |
| **TypeScript (strict)** | End-to-end type safety via shared schemas |
| **Tailwind CSS v4** | CSS-first config (`@theme` / `:root` tokens), no JS config |
| **Motion 11** | Animations (slider, reveals, micro-interactions) |
| **Zustand** | Lightweight global state (auth, cart, wishlist, compare) |
| **TanStack Query** | Server-state cache |
| **Zod** | Runtime validation, schemas shared with the backend |
| **Sonner** | Toasts · **Cloudinary** for browser-direct image uploads |

### Backend (`apps/api`)

| Tech | Why |
|---|---|
| **NestJS 11** | DI, modular structure, URI-versioned routing (`/api/v1`) |
| **Prisma 5** | Schema-first ORM, pooled + direct connections |
| **PostgreSQL 16** | Relational store (~two dozen tables) |
| **Redis 7** | Token blocklist, rate-limit state |
| **`nestjs-zod`** | Zod DTOs validated server-side |
| **Pino** | Structured logging with request IDs + PII redaction |
| **`argon2`** · **Passport JWT** | Memory-hard hashing · rotating-token auth |

### Infrastructure ($0/month)

| Service | Region | Role |
|---|---|---|
| **Vercel** | Edge (global) | Next.js frontend + CDN |
| **Render** | Singapore | NestJS API |
| **Supabase** | Mumbai | PostgreSQL + pooling |
| **Upstash** | Mumbai | Redis (TLS) |
| **Cloudinary** | Global | Image storage + CDN |
| **Cloudflare Workers** | 300+ cities | Cron keep-warm (every 14 min) |
| **GitHub** | — | Source + auto-deploy webhooks |

---

## Architecture

```
┌──────────────────────┐        ┌──────────────────────┐
│    User's Browser    │ ─────▶ │   Vercel Edge CDN    │
└──────────────────────┘        │   (Next.js 15 RSC)   │
                                └──────────┬───────────┘
                                           │ fetch /api/v1/*
                                           ▼
┌──────────────────────┐        ┌──────────────────────┐
│  Cloudflare Workers  │ ─────▶ │    Render (NestJS)   │
│  cron every 14 min   │ warm   │   Singapore region   │
└──────────────────────┘        └──────┬────────┬──────┘
                                       ▼        ▼
                            ┌──────────────┐ ┌──────────────┐
                            │   Supabase   │ │   Upstash    │
                            │ PostgreSQL16 │ │ Redis (TLS)  │
                            └──────────────┘ └──────────────┘

   Admin image uploads:  Browser ──── direct ────▶ Cloudinary CDN
```

**Notable design choices**

- **Monorepo** (pnpm + Turborepo) with Zod schemas shared in `packages/shared-types` — the same `CreateOrderSchema` validates the checkout form *and* the API controller
- **White-label at runtime** — settings are fetched server-side (React `cache()`), inject the brand into `<title>`/metadata, and override `--accent` via a single injected `<style>`
- **Server-trusted money** — order totals, discounts, and stock are computed and validated on the server inside one Prisma transaction (address + order + items + stock decrement + coupon redemption)
- **Hybrid rendering** — static where possible, `force-dynamic` for catalog/detail freshness
- **Rotating refresh tokens** with reuse detection (revokes the whole token family on replay), scoped to `/api/v1/auth`
- **Connection split** — pooled (PgBouncer, 6543) for app queries, direct (5432) for migrations
- **Cold-start mitigation** — Cloudflare Workers cron pings `/health` so Render never sleeps

---

## Local development

**Prerequisites:** Node 20+, pnpm 9+, Docker.

```bash
git clone https://github.com/rakib4123/drikon.git
cd drikon
pnpm install

# Local Postgres + Redis + Mailhog
pnpm docker:up                              # docker compose up -d

# Env: API + Prisma read apps/api/.env (note: Prisma needs DIRECT_URL)
cp .env.example apps/api/.env
#   add: DIRECT_URL="<same as DATABASE_URL for a single local Postgres>"
printf 'NEXT_PUBLIC_API_URL=http://localhost:4000\n' > apps/web/.env.local

# Database
pnpm --filter @drikon/api db:migrate        # apply migrations
pnpm --filter @drikon/api db:seed           # demo catalog + accounts

# Run API + web together
pnpm dev
```

Storefront → http://localhost:3000 · API/Swagger → http://localhost:4000/api/docs

**Demo accounts** (from the seed):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@drikon.com` | `Admin@drikon2026` |
| Customer | `demo@drikon.com` | `User@drikon2026` |

> If ports 5432/6379 are already taken locally, expose the containers on alternate ports (e.g. via a `docker-compose.override.yml`) and update `DATABASE_URL` / `REDIS_URL` accordingly.

---

## Project structure

```
drikon/
├── apps/
│   ├── api/                         NestJS backend
│   │   ├── src/modules/
│   │   │   ├── auth/                JWT + 2FA + role guards
│   │   │   ├── products/           CRUD + filters + search
│   │   │   ├── categories/ brands/ catalog CRUD (nested categories)
│   │   │   ├── wishlist/ reviews/   account features + aggregates
│   │   │   ├── orders/              checkout, totals, stock, coupons
│   │   │   ├── coupons/ flash-sales/ marketing
│   │   │   ├── banners/             hero slider content
│   │   │   ├── settings/            white-label branding
│   │   │   ├── admin/               dashboard stats, orders, users
│   │   │   └── prisma/ health/ mail/ users/
│   │   └── prisma/                  schema.prisma + migrations + seed
│   └── web/                         Next.js frontend
│       └── src/
│           ├── app/
│           │   ├── (shop)/          storefront (catalog, cart, checkout, compare…)
│           │   ├── (auth)/          login + register
│           │   ├── (account)/       dashboard, orders, wishlist
│           │   └── (admin)/         admin panel
│           ├── components/          shop / admin / layout / ui
│           ├── store/               Zustand stores
│           └── lib/                 API client, settings, catalog, banners
└── packages/
    └── shared-types/               Zod schemas shared by both apps
```

---

## Engineering notes

A few real bugs shipped and squashed along the way:

- **Cross-domain cookies** — `SameSite=Strict` won't travel from `*.vercel.app` to `*.onrender.com`. Fixed with `SameSite=None; Secure` in prod, gated by `NODE_ENV`.
- **The JWT that expired on issue** — `config.get<number>(...)` doesn't coerce env strings, so `jsonwebtoken` got `"900"` and minted `iat === exp` tokens. Fix: `Number(...)` every numeric config read.
- **Tailwind v4 is CSS-first** — a leftover `tailwind.config.ts` was silently ignored, so brand-gradient utilities produced *zero* CSS. Invisible on a dark bg, white-on-white on light. Fix: define utilities in the global CSS and delete the dead config.
- **Server-trusted checkout** — never trust client prices: order lines, discounts, and stock are recomputed server-side and committed in a single transaction.

---

## Security model

| Concern | Defense |
|---|---|
| Password storage | Argon2id (memory-hard, GPU-resistant) |
| Session theft | httpOnly + signed + `SameSite` + `Secure` cookies |
| Refresh-token replay | Rotating tokens with reuse detection (revokes family) |
| Brute force | 5-fail account lockout + 3-tier IP rate limiting |
| Mass assignment | Zod DTOs strip unknown properties |
| XSS / clickjacking | CSP, `X-Frame-Options: DENY`, no raw HTML injection |
| MITM | HSTS preload, TLS everywhere |
| User enumeration | Constant-time login (dummy hash on missing user) |
| Authorization | Global JWT + role guards; `@Public()` opt-out |

---

## License

MIT — see [LICENSE](LICENSE).

<div align="center">
<sub>Made with care in Dhaka, Bangladesh.</sub>
</div>
