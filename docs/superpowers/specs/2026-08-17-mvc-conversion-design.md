# MVC Conversion — Design Spec

**Date:** 2026-08-17
**Status:** Approved for planning
**Driver:** Course/assignment requirement — the codebase must visibly demonstrate an MVC (Model/View/Controller) separation. No strict rubric on folder names; general MVC concept is sufficient.

## Goal

Introduce an explicit, documented Model/View/Controller separation across both apps in the monorepo, without breaking Next.js file-based routing, NestJS dependency injection, or any rule in the root `CLAUDE.md` (App Router only, Server Components by default, no `pages/`, `motion/react` imports, etc.). This is an *idiomatic* MVC mapping, not a literal top-level `model/`/`view/`/`controller/` folder rename — see "Rejected approaches" below for why.

## Non-goals

- No behavior change. Every refactored endpoint/page must return the same data and render the same UI as before.
- No new features.
- No change to the database schema, Prisma models, or API contracts.
- No touching `packages/shared-types`, deploy configs, or CI beyond what's needed to keep builds green.

## Rejected approaches

- **Literal top-level `model/`/`view/`/`controller/` folders in `apps/web`**: would require moving `page.tsx` files out of `app/`, which breaks Next.js's file-based router. Rejected.
- **Literal top-level folders in `apps/api`**: NestJS doesn't require feature-module folders technically, but moving every controller/service out of its module folder is a large, purely cosmetic diff with high regression risk for no functional benefit. Rejected in favor of adding the one genuinely missing layer (Model).

## apps/api (NestJS) — add a Model layer

**Current state:** each service holds `PrismaService` and writes Prisma queries inline. Controllers are already thin and correctly scoped (Controller layer is done). There is no data-access abstraction between services and Prisma.

**Change:** add `apps/api/src/models/`, one injectable class per domain entity, wrapping the Prisma calls currently inlined in services. Services inject the Model instead of `PrismaService` and keep only orchestration/business logic (validation, cross-entity coordination, side effects like emitting events or calling `MailService`).

Model files to create, derived from which services currently import `PrismaService` directly:

| Model file | Replaces inline Prisma calls currently in |
|---|---|
| `models/product.model.ts` | `products.service.ts` |
| `models/order.model.ts` | `orders.service.ts` |
| `models/user.model.ts` | `auth.service.ts` (User, Session, VerificationToken, PasswordResetToken, TwoFactorSecret queries) and the inline `UsersService` in `users.module.ts` |
| `models/review.model.ts` | `reviews.service.ts` |
| `models/coupon.model.ts` | `coupons.service.ts` |
| `models/brand.model.ts` | `brands.service.ts` |
| `models/category.model.ts` | `categories.service.ts` |
| `models/banner.model.ts` | `banners.service.ts` |
| `models/flash-sale.model.ts` | `flash-sales.service.ts` |
| `models/wishlist.model.ts` | `wishlist.service.ts` |
| `models/settings.model.ts` | `settings.service.ts` |

`admin.service.ts` does cross-entity dashboard aggregation — it will consume the existing per-entity models above rather than getting its own model file. `prisma.service.ts` (the Prisma client provider itself) and `mail.service.ts`/`health.module.ts` (no Prisma usage) are unaffected.

Each Model class:
- Is `@Injectable()`, provided via a shared `ModelsModule` (`models/models.module.ts`) that imports `PrismaModule` and exports every Model class, so feature modules just import `ModelsModule` instead of `PrismaModule` directly.
- Contains only data-access methods (`findMany`, `findById`, `create`, `update`, `delete`, plus any named custom queries the service currently builds, e.g. `findActiveBySlug`). No business rules, no throwing `NotFoundException`/`ConflictException` — those stay in the service, which decides what a missing/conflicting record *means*.

**View mapping (documentation only, no structural change):** the API's "View" is its response shape — the `dto/*.dto.ts` response DTOs plus the existing global `ResponseInterceptor` (`common/interceptors/response.interceptor.ts`). Where a controller currently returns a raw Prisma entity instead of a DTO, wrap it in the module's existing response DTO while doing this pass, since that's the natural point to fix it and it's what makes the View layer real rather than aspirational.

**Controller:** unchanged in role. No file moves.

## apps/web (Next.js) — add Models, add thin Controllers, keep Views

**Current state:** `lib/*.ts` (`catalog.ts`, `banners.ts`, `settings.ts`, `content.ts`) already does data-fetching against the NestJS API via `api-client.ts`. `components/` is already pure presentation. `page.tsx` files mix data-fetching and rendering inline. There are no `app/api/*/route.ts` handlers and no server actions — this app is a pure API client.

**Change:**

1. **Model** — move the data-fetching functions out of `lib/` into `src/models/`, grouped by domain entity rather than by the file names that happen to exist today:
   - `models/product.model.ts`, `models/category.model.ts`, `models/brand.model.ts` (from `catalog.ts`)
   - `models/banner.model.ts` (from `banners.ts`)
   - `models/settings.model.ts` (from `settings.ts`)
   - `models/content.model.ts` (from `content.ts`)
   - `lib/api-client.ts`, `lib/cloudinary.ts`, `lib/utils.ts` stay in `lib/` — infrastructure/utilities, not domain data.

2. **Controller** — new `src/controllers/*.ts`, one per route (or shared across closely related routes), each exporting a function like `getProductListPageData(searchParams)` that reads route params, calls the Model layer, and returns props ready for the View. `page.tsx` becomes: call the controller, render the component tree. No business logic or fetch calls live in `page.tsx` after this change.

3. **View** — `components/` unchanged. `page.tsx` files shrink to orchestration calls + JSX.

**Scope / rollout order** (26 `page.tsx` files total, split evenly):

- **Pass 1 — customer-facing (13 files):** `app/page.tsx` (home), `(shop)/*` (cart, checkout, compare, products, products/[slug], showcase, wishlist), `(account)/*` (dashboard, orders, orders/[orderNumber]), `(auth)/*` (login, register).
- **Pass 2 — admin (13 files):** `(admin)/admin/*` (home, banners, brands, categories, coupons, flash-sales, orders, products, products/new, products/[id]/edit, reviews, settings, users) — same mechanical pattern, lower priority since it's internal tooling.

Zustand stores (`store/`) are left untouched — they hold transient client UI state (cart, auth session, compare, wishlist toggles), which isn't domain data persisted anywhere; forcing it into "Model" would misrepresent what it is.

## Documentation

Add a new section to `ARCHITECTURE.md` (after section 3, "Monorepo Layout") titled "MVC Layer Mapping" with a table per app showing which folder plays which MVC role, plus the one-sentence rationale for Service existing as a fourth layer in `apps/api`. This is what makes the structure legible as MVC to a grader without renaming `app/` or breaking either framework.

## Testing / verification

- No existing test suite changes required beyond keeping them green — this is a structural refactor.
- After each module/route conversion: `pnpm --filter api build` / `pnpm --filter web build` must pass, and any existing tests for that module (`apps/api` has Jest; check for `*.spec.ts` per module) must still pass.
- Manual smoke check per the `run` skill: start both apps, exercise the golden path (browse products, add to cart, checkout flow, admin CRUD on one entity) to confirm no regression, since this touches nearly every module.
- Since this is a large mechanical refactor across ~35 files (11 API modules + 26 web routes), the implementation plan should sequence it module-by-module / route-by-route so each step is independently verifiable, rather than one giant diff.

## Risks

- **Regression risk from touching ~35 files**: mitigated by doing one module/route at a time with a build+smoke check between each, not a single sweeping commit.
- **`users` module oddity**: `UsersModule` currently defines its Service and Controller inline in the module file rather than separate files. This pass will also split it into standard `users.controller.ts` / `users.service.ts` files as a byproduct of extracting `user.model.ts`, since leaving it inline while every other module has separate files would undercut the "visible MVC structure" goal.
