# Drikon — The Tech Shop

**🔗 Live demo:** [drikon-web-vert1v.vercel.app](https://drikon-web-vert1v.vercel.app/)

Drikon is a full-stack tech e-commerce shop — laptops, PC components, and peripherals.
It has a customer storefront (browse, search, cart, wishlist, reviews, checkout) and a
complete admin panel to run the store (products, orders, customers, coupons, flash sales,
hero banners, and white-label branding).

## 🧰 Built with

- **Next.js 15** + **React 19** + **TypeScript** (storefront)
- **NestJS 11** + **Prisma** + **PostgreSQL** + **Redis** (API)
- **Tailwind CSS** + **Motion** (UI & animation)
- **Cloudinary** (image uploads)

## 🚀 Self-hosting

The whole stack runs on a single VPS with Docker + Caddy (automatic HTTPS).
See **[deploy/DEPLOY.md](deploy/DEPLOY.md)** — `docker compose up -d --build`.
