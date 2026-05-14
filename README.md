<div align="center">

# Drikon

**Vision, engineered.**

A production-grade, type-safe, security-hardened e-commerce platform.
Built with Next.js 15, NestJS 11, PostgreSQL, Prisma, and TypeScript end-to-end.

[Architecture](./ARCHITECTURE.md) · [Quickstart](#quickstart) · [Stack](#stack) · [Security](#security-highlights)

</div>

---

## Why this exists

Drikon is a portfolio-grade reference implementation of a real e-commerce platform —
the kind of thing you'd build on day one of a senior engineering role. Every choice
is one you can defend in an interview. See [ARCHITECTURE.md](./ARCHITECTURE.md) for
the full design rationale.

---

## Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 15 (App Router, RSC) + TS strict + Tailwind v4 + shadcn/ui + Motion + Zustand + TanStack Query |
| Backend | NestJS 11 + TS strict + Prisma 5 + PostgreSQL 16 + Redis 7 + BullMQ |
| Auth | NestJS-native JWT (access + rotating refresh in httpOnly cookies) · argon2id · Google OAuth · TOTP 2FA |
| Validation | Zod (shared between web & api via `packages/shared-types`) |
| Payments | Stripe (Checkout + webhooks) |
| Storage | Cloudinary signed uploads |
| Email | Resend |
| Observability | Pino · Sentry-ready · `X-Request-Id` everywhere |
| Tests | Jest · Vitest · Playwright |
| CI/CD | GitHub Actions · Docker · Vercel + Railway/Fly |

---

## Quickstart

```bash
# 1. Clone and install
git clone <your-repo-url> drikon
cd drikon
pnpm install

# 2. Configure env
cp .env.example .env
# generate JWT secrets:
openssl rand -base64 64   # paste into JWT_ACCESS_SECRET
openssl rand -base64 64   # paste into JWT_REFRESH_SECRET

# 3. Start Postgres + Redis + Mailhog
docker-compose up -d

# 4. Migrate + seed
pnpm db:migrate
pnpm db:seed

# 5. Run everything
pnpm dev
```

Then visit:
- 🛍️ **Frontend** → http://localhost:3000
- 🔌 **API**      → http://localhost:4000
- 📚 **Swagger**  → http://localhost:4000/api/docs
- 📧 **Mailhog**  → http://localhost:8025 (catches all dev emails)

### Demo accounts

| Email | Password | Role |
|---|---|---|
| `admin@drikon.com` | `Admin@drikon2026` | `SUPER_ADMIN` |
| `demo@drikon.com`  | `User@drikon2026`  | `USER` |

---

## Project layout

```
drikon/
├── apps/
│   ├── api/        NestJS backend (modules, Prisma, auth, products)
│   └── web/        Next.js 15 frontend (App Router, RSC)
├── packages/
│   ├── shared-types    Zod schemas + DTO types shared web ↔ api
│   ├── config-tsconfig Shared tsconfig bases
│   └── config-eslint   Shared lint configs
├── docker-compose.yml  Postgres + Redis + Mailhog
├── turbo.json          Pipeline definitions
└── ARCHITECTURE.md     Full design doc
```

---

## Security highlights

A non-exhaustive list of what this codebase gets right by default:

- **`argon2id`** for password hashing (memory-hard, GPU-resistant — beats bcrypt).
- **Refresh-token rotation with reuse detection** — if a revoked refresh token is replayed, all sessions for that user are nuked.
- **httpOnly + signed + SameSite=strict cookies** for tokens. Never localStorage.
- **Constant-time-ish login** — even when the user doesn't exist, we run a fake hash check so attackers can't enumerate emails via timing.
- **Account lockout** after 5 failed logins (30-minute cool-down).
- **Per-route rate limits** via `@nestjs/throttler` (login 5/min, register 3/min, forgot-password 3/min) on top of a global ceiling.
- **TOTP 2FA** with hashed one-time recovery codes (`otplib` + `qrcode`).
- **Helmet** with strict CSP, HSTS, X-Frame-Options DENY, COOP, CORP.
- **SQL injection impossible** by construction — Prisma parameterizes every query.
- **No PCI scope** — Stripe handles all card data; we store last-4 only for receipts.
- **Webhook signature verification** for every Stripe event.
- **Pino logs** redact `authorization`, `cookie`, `password`, `token` automatically.
- **Trust-proxy** + `x-powered-by` disabled.
- **No user enumeration** on register or forgot-password (uniform responses).

See [ARCHITECTURE.md §6](./ARCHITECTURE.md) for the full threat model.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run web + api in parallel |
| `pnpm build` | Build everything |
| `pnpm lint` | Lint everything |
| `pnpm typecheck` | Strict TS check across the monorepo |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run Playwright e2e tests |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm docker:up` | Start Postgres + Redis + Mailhog |

---

## Status

**Day 1 (shipped):**
- ✅ Monorepo skeleton + tooling
- ✅ Full Prisma schema (users, products, orders, payments, reviews, coupons, sessions, 2FA, audit)
- ✅ Auth module — register, login, refresh rotation, Google OAuth, 2FA, email verify, password reset
- ✅ Products module — list (filter/sort/paginate), detail, admin CRUD, atomic stock
- ✅ Next.js frontend — home, auth pages, products listing, cart, dashboard
- ✅ Security hardening (Helmet, rate-limit, CORS, lockout, structured logs)
- ✅ Docker + docker-compose + GitHub Actions CI
- ✅ Demo seed data

**Day 2+ (planned):**
- [ ] Stripe Checkout + webhooks
- [ ] Order timeline + shipping events
- [ ] Reviews + ratings
- [ ] Coupons + flash sales
- [ ] Admin dashboard
- [ ] Playwright e2e
- [ ] AI recommendations (pgvector)

---

## License

MIT — see [LICENSE](./LICENSE).
