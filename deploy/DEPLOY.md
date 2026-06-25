# Deploying Drikon on your own VPS

This runs the **entire stack** on one Linux server — no Vercel, no Render:

```
                 ┌──────────── your VPS ────────────┐
  example.com ──▶│ Caddy ─▶ web (Next.js :3000)      │
  api.example ──▶│   │   ─▶ api (NestJS :4000)        │
                 │   └────────────┐                  │
                 │        Postgres :5432  Redis :6379 │
                 └───────────────────────────────────┘
```

Caddy gets + renews HTTPS certificates automatically. Postgres and Redis run in
containers with persistent volumes. The only things specific to you live in
`deploy/.env`.

---

## 1. Point DNS at the VPS

At your domain registrar, create two **A records** pointing to your server's IP:

| Type | Host  | Value            |
|------|-------|------------------|
| A    | `@`   | `YOUR_VPS_IP`    |
| A    | `www` | `YOUR_VPS_IP`    |
| A    | `api` | `YOUR_VPS_IP`    |

> All three point to the **same** server — Caddy routes by hostname.
> Wait for DNS to propagate before step 4 (check: `dig +short example.com`).

Make sure ports **80** and **443** are open in the VPS firewall:
```bash
sudo ufw allow 80,443/tcp
```

---

## 2. Install Docker (once)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # then log out + back in
```

---

## 3. Get the code + configure

```bash
git clone https://github.com/rakib4123/drikon.git
cd drikon/deploy
cp .env.example .env
nano .env        # set SITE_DOMAIN, ACME_EMAIL, DB password, JWT secrets
```

Generate the secrets:
```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
openssl rand -base64 24   # POSTGRES_PASSWORD
```

---

## 4. Launch

```bash
docker compose up -d --build
```

First build takes a few minutes. The API automatically runs `prisma migrate
deploy` on boot, so the schema is created for you.

Watch it come up:
```bash
docker compose ps
docker compose logs -f api      # look for "Drikon API running"
docker compose logs -f caddy    # look for certificate provisioning
```

---

## 5. Seed the first admin + (optional) the Ninja hero product

```bash
docker compose exec api pnpm --filter @drikon/api db:seed            # admin user + demo data
docker compose exec api pnpm --filter @drikon/api exec tsx prisma/seed-ninja.ts   # Ninja hero (optional)
```

Default admin (change the password immediately): `admin@drikon.com` / `Admin@drikon2026`

> Prefer a clean catalog? Skip `db:seed` (it adds demo products) and instead just
> create your admin in the DB, then add real products via the admin panel.

---

## 6. Verify

- `https://example.com` → storefront
- `https://api.example.com/health` → `ok`
- `https://example.com/admin` → log in

---

## Day-2 operations

```bash
# Update to latest code
git pull && docker compose up -d --build

# Logs
docker compose logs -f web api

# Backup the database
docker compose exec postgres pg_dump -U drikon drikon > backup_$(date +%F).sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U drikon drikon

# Run a one-off migration manually (normally automatic on boot)
docker compose exec api pnpm --filter @drikon/api db:migrate:deploy

# Stop / start everything
docker compose down          # keeps volumes (data safe)
docker compose up -d
```

---

## Notes

- **Changing the API URL** (`SITE_DOMAIN`) requires a `web` rebuild, because
  `NEXT_PUBLIC_API_URL` is compiled into the frontend bundle:
  `docker compose up -d --build web`.
- **Cookies** work because the API sets `COOKIE_DOMAIN=.<your-domain>` and both
  apps share that registrable domain — no cross-site cookie problems.
- **Data** lives in the `pgdata` / `redisdata` Docker volumes. `docker compose
  down` keeps them; `docker compose down -v` **deletes** them — don't do that in
  production unless you mean it.
- **Smaller VPS?** This comfortably fits in ~2 GB RAM. Below that, add swap.
