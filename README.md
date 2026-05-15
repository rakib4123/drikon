# Drikon — Vision, engineered.

A modern e-commerce marketplace built around taste. Type-safe end to end, secure by default, fast everywhere.

🌐 **Live demo:** https://drikon-web.vercel.app  
⚙️ **API:** https://drikon-api.onrender.com  

## Stack

**Frontend** Next.js 15 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · TanStack Query · Zustand  
**Backend** NestJS 11 · Prisma 5 · PostgreSQL 16 · Redis 7 · Zod · Pino · argon2id · JWT rotation · TOTP 2FA  
**Infrastructure** Vercel · Render · Supabase · Upstash · Cloudflare Workers (cron) · GitHub Actions

## Architecture highlights

- Monorepo with pnpm workspaces (apps/api, apps/web, packages/shared-types)
- Shared Zod schemas drive validation on both client and server
- Hybrid rendering: static marketing pages, dynamic product pages, ISR-ready
- Rotating refresh tokens with reuse detection, httpOnly+signed cookies
- Account lockout, rate limiting (3 tiers), CSP, HSTS, strict CORS
- Cloudflare Worker cron prevents Render free-tier sleep ($0/mo always-on)
- Structured Pino logs with request-ID propagation via AsyncLocalStorage

## Demo credentials

- Admin: `admin@drikon.com` / `Admin@drikon2026`
- User: `demo@drikon.com` / `User@drikon2026`
