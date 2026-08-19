# Drikon — The Tech Shop

**🔗 Live demo:** [drikon-web-vert1v.vercel.app](https://drikon-web-vert1v.vercel.app/)

Drikon is a full-stack e-commerce shop for premium smartphones and mobile accessories.
It has a customer storefront (browse, search, cart, wishlist, reviews, checkout with
bKash or Cash on Delivery) and a complete admin panel to run the store (products,
orders, customers, coupons, flash sales, hero banners, and white-label branding).

## 🧰 Built with

- **Next.js 15** + **React 19** + **TypeScript** (storefront)
- **NestJS 11** + **Prisma** + **PostgreSQL** (API)
- **Tailwind CSS** + **Motion** (UI & animation)
- **Cloudinary** (image uploads)

## 🚀 Deployment

`apps/web` on Vercel, `apps/api` + Postgres on Render — both auto-deploy from
GitHub on every push. See **[DEPLOY.md](DEPLOY.md)** for the full setup, and
`render.yaml` for the API's infra-as-code config.
