# Deploying Drikon (Vercel + Render)

This is the only supported deployment path: **`apps/web` on Vercel, `apps/api` +
Postgres on Render.** Both platforms auto-deploy from GitHub on every push to
`main`, so once this is set up, `git push` is the whole deploy step.

Do the two sides **in this order** — the API needs to exist before Vercel can
be told where it lives, and Vercel needs to exist before Render can be told
which origin to trust.

---

## 1. Render — API + database

1. In the [Render dashboard](https://dashboard.render.com), **New → Blueprint**,
   connect this repo. Render reads `render.yaml` at the repo root and creates:
   - `drikon-db` — a managed Postgres database
   - `drikon-api` — a Node web service, built and started via `pnpm --filter api`
     from the monorepo root (required so pnpm can resolve the
     `@drikon/shared-types` workspace package — don't change this to run from
     `apps/api` directly).
2. `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_DOMAIN`,
   and `COOKIE_SECURE` are already set correctly by the blueprint — nothing to
   do there.
3. Leave `WEB_ORIGIN` unset for now; you'll come back and set it in step 3.
4. Deploy. `prisma migrate deploy` runs automatically as part of the start
   command on every deploy, so the schema is created for you. Watch the
   Render dashboard's logs for `Nest application successfully started`.
5. Note the service's URL — something like `https://drikon-api.onrender.com`.
   You'll need it in the next step.

**Free tier note:** Render's free web service plan spins down after ~15
minutes of inactivity and takes a few seconds to wake back up on the next
request. Fine for a demo; upgrade the `drikon-api` service's plan for an
always-on production API.

### Seed the first admin (once)

From your machine, pointed at the Render database (copy `DATABASE_URL` from
the Render dashboard's `drikon-db` page — use the **External** connection
string, not the internal one):

```bash
DATABASE_URL="<external connection string from Render>" pnpm --filter @drikon/api db:seed
```

Default admin (change the password immediately after first login):
`admin@drikon.com` / `Admin@drikon2026`

> Prefer a clean catalog with no demo products? Skip this and create your
> admin directly in the database, then add real products via the admin panel.

---

## 2. Vercel — storefront

1. In the [Vercel dashboard](https://vercel.com), **Add New → Project**,
   import this repo. Vercel auto-detects the Next.js app — set:
   - **Root Directory:** `apps/web`
   - Framework preset: Next.js (auto-detected)
2. Environment variables:

   | Variable | Value | Required? |
   |---|---|---|
   | `NEXT_PUBLIC_API_URL` | Your Render API URL from step 1 (e.g. `https://drikon-api.onrender.com`) | Yes |
   | `NEXT_PUBLIC_APP_URL` | Your production domain, if using a custom one | No — falls back to Vercel's own URL automatically |
   | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | Only if using image uploads |
   | `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | An unsigned upload preset from your Cloudinary settings | Only if using image uploads |

3. Deploy. Vercel builds and hosts the frontend; no Dockerfile or build config
   needed — the platform handles it.
4. Note your Vercel URL (e.g. `https://drikon-web.vercel.app`, or your custom
   domain).

---

## 3. Wire them together

Back in the Render dashboard, on the `drikon-api` service's environment
variables, set:

```
WEB_ORIGIN=https://drikon-web.vercel.app
```

Comma-separate multiple values if you need more than one allowed origin
(e.g. production plus one specific preview URL). Save — Render redeploys the
service automatically when an env var changes.

---

## 4. Verify

- `https://<your-vercel-url>/` → storefront loads
- `https://<your-render-url>/health` → `{"success":true,"data":{"status":"ok",...}}`
- `https://<your-vercel-url>/admin` → log in with the seeded admin, confirm
  the dashboard loads real data (not just an empty state)
- Place a test order end-to-end to confirm the cross-domain auth cookies
  actually work (see the note below if login silently fails)

---

## Why `COOKIE_DOMAIN` must stay blank

Vercel and Render are on **different registrable domains** — unlike a
single-VPS setup where `app.example.com` and `api.example.com` can share a
cookie via `Domain=.example.com`, there's no domain here that both platforms
share. The API's auth cookies (`sameSite: 'none'`, `secure: true` in
production) work cross-domain *only* if no `Domain` attribute is set at all
— the browser then scopes the cookie to the exact host that set it, which is
correct for this setup. `render.yaml` already sets `COOKIE_DOMAIN=""` for
this reason; if you ever see login succeed but the app immediately act
logged-out, check that this wasn't accidentally overridden.

## Day-2 operations

- **Deploy updates:** `git push` to `main` — both platforms redeploy
  automatically.
- **Logs:** Render dashboard → `drikon-api` → Logs. Vercel dashboard →
  project → Deployments → (a deployment) → Logs.
- **Run a migration manually** (normally automatic on every Render deploy):
  ```bash
  DATABASE_URL="<external connection string>" pnpm --filter @drikon/api db:migrate:deploy
  ```
- **Database backup:** Render's Postgres dashboard has built-in automated
  backups on paid plans; on the free tier, use `pg_dump` against the external
  connection string periodically.
- **Rotating secrets:** change `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` in the
  Render dashboard — this invalidates every existing session (everyone gets
  logged out), so only do it when you mean to.
