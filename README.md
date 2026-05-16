---

## 🏗️ What it is

Drikon is a complete e-commerce platform — frontend, API, admin panel, image uploads, auth — running across six free-tier cloud services with **$0/month** total cost.

It's built to be a **real production application**, not a toy. Same patterns you'd see in a Series A startup's codebase: monorepo, shared types, rotating JWTs, role-based access, structured logging, edge CDN, distributed cron, schema-first migrations.

### What works today

- ✅ **Storefront** — Homepage, product catalog with filters/sort/pagination, product detail pages with related items
- ✅ **Auth** — Register, login (with 2FA support), rotating refresh tokens, secure cookie sessions
- ✅ **Admin panel** — Create / edit / soft-delete products, with direct-to-Cloudinary image uploads
- ✅ **Role-based access** — `@Roles(ADMIN)` decorators on the backend, nav-conditional rendering on the frontend
- ✅ **Production hardening** — Account lockout, 3-tier rate limiting, CSP, HSTS, strict CORS, argon2id

### What's coming

- ⏳ Working cart + checkout (Zustand store is ready, UI is built, persistence is TODO)
- ⏳ Stripe test-mode payments
- ⏳ Order management UI
- ⏳ Wishlist + reviews
- ⏳ Full-text product search (Postgres `tsvector`)

---

## 🧱 Stack

### Frontend (`apps/web`)

| Technology | Why |
|---|---|
| **Next.js 15** | App Router, React Server Components, hybrid rendering (static + dynamic + ISR) |
| **React 19** | Latest stable, concurrent rendering, transitions |
| **TypeScript (strict)** | End-to-end type safety with shared schemas |
| **Tailwind CSS v4** | Utility-first, dark mode via CSS variables |
| **Zustand** | Lightweight global state (auth, cart) |
| **TanStack Query** | Server-state cache, automatic refetching |
| **Zod** | Runtime validation, schemas shared with backend |
| **Cloudinary** | Browser-direct image uploads with CDN delivery |

### Backend (`apps/api`)

| Technology | Why |
|---|---|
| **NestJS 11** | DI, decorators, modular structure, URI-versioned routing |
| **Prisma 5** | Schema-first ORM, type-safe queries, separate pooled + direct connections |
| **PostgreSQL 16** | Production-grade relational store |
| **Redis 7** | Token blocklist, rate limit state |
| **`nestjs-zod`** | Shared Zod DTOs validated server-side |
| **Pino** | Structured logging with request IDs and PII redaction |
| **`argon2`** | Password hashing (memory-hard, GPU-resistant) |
| **Passport JWT** | Auth strategy with rotating refresh tokens |

### Infrastructure

| Service | Region | Cost | Role |
|---|---|---|---|
| **Vercel** | Edge (global) | Free | Next.js frontend, CDN |
| **Render** | Singapore | Free | NestJS API |
| **Supabase** | Mumbai | Free | PostgreSQL + connection pooling |
| **Upstash** | Mumbai | Free | Redis with TLS |
| **Cloudinary** | Global | Free | Image storage + CDN |
| **Cloudflare Workers** | 300+ cities | Free | Cron keep-warm |
| **GitHub** | — | Free | Source + auto-deploy webhooks |

---

## 🏛️ Architecture

┌──────────────────────┐        ┌──────────────────────┐
│   User's Browser     │───────▶│  Vercel Edge CDN     │
└──────────────────────┘        │  (Next.js 15 RSC)    │
└──────────┬───────────┘
│ fetch /api/v1/*
▼
┌──────────────────────┐        ┌──────────────────────┐
│  Cloudflare Workers  │───────▶│   Render (NestJS)    │
│  Cron every 14 min   │keepwarm│   Singapore region   │
└──────────────────────┘        └──────┬───────────┬───┘
│           │
▼           ▼
┌──────────────┐  ┌──────────────┐
│   Supabase   │  │   Upstash    │
│  PostgreSQL  │  │  Redis (TLS) │
│   Mumbai     │  │    Mumbai    │
└──────────────┘  └──────────────┘
(Admin image uploads)
Browser ──── direct ────▶ Cloudinary CDN


### Notable design choices

- **Monorepo** with pnpm workspaces and shared types in `packages/shared-types`
- **Shared Zod schemas** — same `CreateProductSchema` validates inputs in both Next.js form and NestJS controller
- **Hybrid rendering** — static marketing routes, `force-dynamic` for product detail (fresh data), ISR-ready
- **Rotating refresh tokens** with reuse detection (revokes whole token family on replay)
- **Refresh token scoped to `/api/v1/auth`** — defense in depth (smaller attack surface)
- **Free-tier cold-start mitigation** via Cloudflare Workers cron pinging `/health` every 14 min
- **PostgreSQL connection split** — pooled (PgBouncer, port 6543) for app queries, direct (5432) for Prisma migrate
- **JWT signed cookies** — `httpOnly` + `Secure` + `SameSite=None` (cross-domain) + signed by `JWT_ACCESS_SECRET`

---

## 🚀 Local development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local Postgres + Redis)

### Setup

```bash
# Clone
git clone https://github.com/rakib4123/drikon.git
cd drikon

# Install
pnpm install

# Start Postgres + Redis locally
docker compose up -d

# Copy env templates
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Migrate schema + seed
pnpm --filter @drikon/api db:push
pnpm --filter @drikon/api db:seed

# Run both frontend and backend
pnpm dev
```

Frontend at http://localhost:3000  ·  API at http://localhost:4000

---

## 📁 Project structure

drikon/
├── apps/
│   ├── api/                NestJS backend
│   │   ├── src/modules/
│   │   │   ├── auth/       JWT + 2FA + role guards
│   │   │   ├── products/   CRUD + filters + Zod DTOs
│   │   │   ├── categories/ Public catalog metadata
│   │   │   ├── brands/     Public catalog metadata
│   │   │   ├── users/      Profile management
│   │   │   ├── health/     /health endpoint
│   │   │   └── prisma/     Prisma service wrapper
│   │   └── prisma/         schema.prisma + seed.ts (22 tables)
│   └── web/                Next.js frontend
│       └── src/
│           ├── app/
│           │   ├── (shop)/       Storefront pages
│           │   ├── (auth)/       Login + register
│           │   ├── (account)/    User dashboard
│           │   └── (admin)/      Admin panel
│           ├── components/
│           │   ├── shop/         Product card, etc.
│           │   ├── admin/        Form, uploader, sidebar
│           │   └── layout/       Navbar + Footer
│           ├── store/            Zustand stores
│           └── lib/              API client + utilities
└── packages/
└── shared-types/       Zod schemas shared by both apps

---

## 🧠 Engineering stories from shipping this

### The cross-domain cookie nightmare

`SameSite=Strict` cookies don't traverse from `drikon-web.vercel.app` to `drikon-api.onrender.com`. Solution: `SameSite=None; Secure` in production, `Lax` locally — gated by `NODE_ENV`.

### The JWT that expired on issue

`config.get<number>('JWT_ACCESS_TTL')` is a TypeScript lie — it doesn't coerce env vars. With Render storing values as strings, `jsonwebtoken` received `"900"` and silently created `iat === exp` tokens (instantly expired). Fix: wrap every numeric config read in `Number(...)`.

### The render-race null safety bug

`user.name.split(' ')` works in dev where auth resolves instantly, but crashes in production when `user` is briefly null during initial hydration. Optional chaining required all the way through: `user?.name?.split(' ')?.[0] ?? 'there'`.

### Free-tier cold start, solved free

Render's 15-minute idle timeout meant recruiters hitting the link saw 30-second loading. Cloudflare Workers cron — running every 14 min for $0/mo — pings `/health` so Render never sleeps.

### NestJS validation system mismatch

Default `ValidationPipe` reads class-validator decorators. `nestjs-zod`'s `createZodDto` doesn't add those — it stashes Zod schemas elsewhere. Result: every query parameter rejected with `VALIDATION_ERROR`. Fix: replace global pipe with `ZodValidationPipe`.

---

## 🔐 Security model

| Concern | Defense |
|---|---|
| Password storage | Argon2id (memory-hard, GPU-resistant) |
| Session theft | httpOnly + signed + SameSite=None + Secure cookies |
| Refresh token replay | Rotating tokens with reuse detection (revokes family) |
| Brute force | 5-fail account lockout + IP rate limiting (3 tiers) |
| Mass assignment | Zod DTOs strip unknown properties |
| XSS | CSP headers, no `dangerouslySetInnerHTML` |
| Clickjacking | `X-Frame-Options: DENY` |
| MITM | HSTS preload, TLS everywhere |
| User enumeration | Constant-time login (fake argon2 hash on missing user) |
| CSRF | SameSite cookies + Origin allowlist + double-submit ready |

---

## 📜 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
  Made with care in Dhaka, Bangladesh.
</div>
EOF


