# Drikon — Vision, Engineered

**🔗 Live demo:** [drikon-web-vert1v.vercel.app](https://drikon-web-vert1v.vercel.app/)

Drikon is a full-stack e-commerce platform for premium smartphones and mobile
accessories — a customer storefront and a complete admin panel to run the
store, built as a real, production-shaped application rather than a toy demo.

## ✨ Features

**Storefront**
- Product catalog with search, category/brand/price filtering, and sorting
- Voice search — speak a query via the browser's Web Speech API instead of typing
- **"Frequently bought together" / "Add these too" / "Recommended for you"** —
  product recommendations mined from real order history with the Apriori
  association-rule algorithm, surfaced on the product page, cart, and homepage
- Two product page templates — a standard layout and an alternate cinematic
  "premium" template, selectable per product
- Cart, wishlist, and side-by-side product comparison
- Checkout with **bKash (Send Money)** or **Cash on Delivery** — no payment
  gateway required; bKash orders are verified manually against a submitted
  Transaction ID
- Coupons and time-boxed flash sales
- Customer reviews and ratings
- Order history and tracking
- Accounts with email/password (email verification, password reset),
  Google OAuth, and optional TOTP two-factor authentication

**Admin panel**
- Dashboard with revenue, order, and top-seller stats
- Products, categories, brands, and hero banner management
- Order management, including manual bKash payment verification
  (mark paid/failed) — Cash on Delivery orders are marked paid automatically
  on delivery
- Recommendations — trigger and inspect Apriori recomputation, with a preview
  of the generated rules (confidence, lift)
- Coupons, flash sales, and review moderation
- Customer/role management
- White-label branding: site identity, theme accent color, homepage content,
  and payment method configuration — all editable without a redeploy

## 🧰 Built with

- **Next.js 15** (App Router) + **React 19** + **TypeScript** — storefront
- **NestJS 11** + **Prisma** + **PostgreSQL** — API
- **Zod**, shared end-to-end between frontend and backend via a `shared-types` package
- **Tailwind CSS v4** + **Motion** — UI and animation
- **Argon2** password hashing, JWT access/refresh cookies, TOTP 2FA
- **Cloudinary** — image uploads
- **pnpm workspaces** + **Turborepo** — monorepo tooling

## 📁 Project structure

```
apps/
  web/    — Next.js storefront + admin panel
  api/    — NestJS API
packages/
  shared-types/  — Zod schemas and types shared by both apps
```

## 🚀 Getting started

Prerequisites: Node 20+, pnpm 9+, and a reachable PostgreSQL database.

```bash
pnpm install
cp .env.example .env          # fill in DATABASE_URL and the JWT secrets at minimum
pnpm --filter @drikon/api db:migrate
pnpm --filter @drikon/api db:seed   # optional demo data + a seeded admin account
pnpm dev
```

The storefront runs at `http://localhost:3000`, the API at
`http://localhost:4000` (Swagger docs at `/api/docs` in development).

## ☁️ Deployment

`apps/web` deploys to **Vercel**, `apps/api` + PostgreSQL to **Render** — both
auto-deploy from GitHub on every push. See **[DEPLOY.md](DEPLOY.md)** for the
full walkthrough and `render.yaml` for the API's infra-as-code config.
