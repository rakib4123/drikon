# MVC Conversion — apps/web Admin Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the `models/` data-fetching layer from the customer-facing plan to cover the admin panel's 13 routes, so every `apiGet`/`apiPost`/`apiPatch`/`apiDelete` call currently inline in an admin `page.tsx` goes through a Model function instead.

**Architecture:** Every admin route under `app/(admin)/admin/**` is a Client Component (confirmed by reading all 13 files — each starts with `'use client'` and manages its own `load`/`save`/`remove` functions via `useEffect`/`useState`). Per the Client Component rule established in the customer-facing plan (`docs/superpowers/plans/2026-08-17-mvc-web-customer-routes.md`), Client Components get **Model-only extraction, no controller files** — their `useEffect`-driven `load()`/`save()`/`remove()` functions already are the thin "call Model, hand data to state" glue. This plan is therefore Model-only across all 13 routes: no `controllers/*.ts` files are created here. Several Model files already exist from the customer-facing plan (`banner.model.ts`, `brand.model.ts`, `category.model.ts`, `product.model.ts`, `settings.model.ts`, `order.model.ts`) — this plan extends them with the admin-specific list/create/update/delete functions those pages need, alongside new Model files for resources the customer-facing app never touched (coupons, flash sales, reviews, admin dashboard stats, users).

**Tech Stack:** Next.js 15 App Router, React 19 Client Components, TypeScript strict, `react-hook-form` (settings page only).

**Spec:** `docs/superpowers/specs/2026-08-17-mvc-conversion-design.md`

## Global Constraints

- No behavior change, no visual change, no new features. Every relocated call keeps its exact original request shape, response typing, and error handling.
- `components/admin/product-form.tsx` and any other component under `components/` are the View layer and are explicitly out of scope — same rule the customer-facing plan applied to `components/shop/coupon-field.tsx`. If a component makes its own API calls, that stays as-is; only `page.tsx` files are refactored here.
- `apps/web` has no test runner configured (see the customer-facing plan's Global Constraints for the same finding) — verification is `pnpm --filter web build` plus manual smoke checks in the dev server.
- Admin pages that hit an endpoint **already covered by a public Model function** (e.g. admin brands hits the same `/api/v1/brands` the storefront uses) get their own admin-typed function rather than reusing the public one — the public function's return type is intentionally narrower (matches what the storefront needs) and widening it risks a type error or an accidental extra field leaking into a public-facing consumer. This mirrors how `apps/api`'s `ProductsService.findAll` takes an `{ admin?: boolean }` option rather than admin code calling the public method and casting.
- Every task is a single git commit. Commit only after `pnpm --filter web build` succeeds.

### Route inventory (13 `page.tsx` files under `app/(admin)/admin/`)

| Route | Resource(s) it manages | Task |
|---|---|---|
| `admin/banners/page.tsx` | Banners (full CRUD) | 1 |
| `admin/brands/page.tsx` | Brands (full CRUD) | 2 |
| `admin/categories/page.tsx` | Categories (full CRUD) | 3 |
| `admin/coupons/page.tsx` | Coupons (full CRUD) + a categories lookup | 4 |
| `admin/flash-sales/page.tsx` | Flash sales (CRUD + product line items) + a products lookup | 5 |
| `admin/orders/page.tsx` | Orders (list, filter, status change) | 6 |
| `admin/page.tsx` | Dashboard stats | 7 |
| `admin/reviews/page.tsx` | Reviews (list, visibility toggle) | 8 |
| `admin/settings/page.tsx` | Settings (read, update) | 9 |
| `admin/users/page.tsx` | Users (list, role change) | 10 |
| `admin/products/page.tsx` | Products (admin list, delete) | 11 |
| `admin/products/[id]/edit/page.tsx` | Products (get by id) | 11 |
| `admin/products/new/page.tsx` | none — delegates entirely to `<ProductForm>` | 12 (verified, no change) |

`admin/layout.tsx` (the sidebar shell + auth guard) makes no API calls of its own — only reads `useAuthStore`/`useIsAdmin` — so it needs no change.

---

### Task 1: Extend `banner.model.ts` with admin CRUD + refactor the admin banners page

**Files:**
- Modify: `apps/web/src/models/banner.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/banners/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks (this plan's first task).
- Produces: `listBannersAdmin(): Promise<AdminBanner[]>`, `createBanner(body): Promise<AdminBanner>`, `updateBanner(id, body): Promise<AdminBanner>`, `deleteBanner(id): Promise<void>` (all in `@/models/banner.model`).

- [ ] **Step 1: Add the admin functions to `models/banner.model.ts`**

Append to the existing file (the storefront-facing `Banner` interface and `getBanners` from the customer-facing plan stay untouched above this):

```typescript
// apps/web/src/models/banner.model.ts (additions)
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client';

export interface AdminBanner {
  id: string;
  heading: string;
  subheading: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  position: number;
  isActive: boolean;
}

export interface BannerDraftBody {
  heading: string;
  subheading: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  position: number;
  isActive: boolean;
}

/** Admin: every banner (active and inactive), unlike the storefront's `getBanners()`. */
export function listBannersAdmin(): Promise<AdminBanner[]> {
  return apiGet<AdminBanner[]>('/api/v1/banners');
}

export function createBanner(body: BannerDraftBody): Promise<AdminBanner> {
  return apiPost<AdminBanner>('/api/v1/banners', body);
}

export function updateBanner(id: string, body: Partial<BannerDraftBody>): Promise<AdminBanner> {
  return apiPatch<AdminBanner>(`/api/v1/banners/${id}`, body);
}

export function deleteBanner(id: string): Promise<void> {
  return apiDelete<void>(`/api/v1/banners/${id}`);
}
```

(Merge the `apiGet, apiPost, apiPatch, apiDelete` import into the file's existing `apiGet` import from `@/lib/api-client` rather than duplicating the import line.)

- [ ] **Step 2: Swap the four call sites in `app/(admin)/admin/banners/page.tsx`**

Remove the page-local `Banner` interface (now `AdminBanner` from the model) and change the import:
```typescript
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import { listBannersAdmin, createBanner, updateBanner, deleteBanner, type AdminBanner as Banner } from '@/models/banner.model';
```

(Aliasing `AdminBanner as Banner` keeps every other reference to the `Banner` type name in this file — `useState<Banner[]>`, `(b: Banner) =>`, etc. — unchanged, so this is a two-line diff instead of a find-and-replace across the whole file.)

Change the four call sites:
```typescript
      setItems(await apiGet<Banner[]>('/api/v1/banners'));
```
→
```typescript
      setItems(await listBannersAdmin());
```
```typescript
        await apiPatch(`/api/v1/banners/${editingId}`, body);
```
→
```typescript
        await updateBanner(editingId, body);
```
```typescript
        await apiPost('/api/v1/banners', body);
```
→
```typescript
        await createBanner(body);
```
```typescript
      await apiPatch(`/api/v1/banners/${b.id}`, { isActive: !b.isActive });
```
→
```typescript
      await updateBanner(b.id, { isActive: !b.isActive });
```
```typescript
      await apiDelete(`/api/v1/banners/${b.id}`);
```
→
```typescript
      await deleteBanner(b.id);
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin/banners`, create, edit, toggle-active, and delete a banner, confirm the storefront hero at `/` still reflects active banners.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/banner.model.ts "apps/web/src/app/(admin)/admin/banners/page.tsx"
git commit -m "refactor(web): extend BannerModel with admin CRUD"
```

---

### Task 2: Extend `brand.model.ts` with admin CRUD + refactor the admin brands page

**Files:**
- Modify: `apps/web/src/models/brand.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/brands/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `listBrandsAdmin(): Promise<AdminBrand[]>`, `createBrand(body): Promise<AdminBrand>`, `updateBrand(id, body): Promise<AdminBrand>`, `deleteBrand(id): Promise<void>` (all in `@/models/brand.model`).

- [ ] **Step 1: Add the admin functions to `models/brand.model.ts`**

```typescript
// apps/web/src/models/brand.model.ts (additions)
import { apiPost, apiPatch, apiDelete } from '@/lib/api-client';
// (merge into the file's existing `apiGet` import from '@/lib/api-client')

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  _count: { products: number };
}

export interface BrandDraftBody {
  name: string;
  slug?: string;
  logoUrl: string;
}

/** Admin: same `/api/v1/brands` endpoint as `getBrands()`, but typed with the
 * `_count.products` field the admin list needs and the storefront doesn't. */
export function listBrandsAdmin(): Promise<AdminBrand[]> {
  return apiGet<AdminBrand[]>('/api/v1/brands');
}

export function createBrand(body: BrandDraftBody): Promise<AdminBrand> {
  return apiPost<AdminBrand>('/api/v1/brands', body);
}

export function updateBrand(id: string, body: Partial<BrandDraftBody>): Promise<AdminBrand> {
  return apiPatch<AdminBrand>(`/api/v1/brands/${id}`, body);
}

export function deleteBrand(id: string): Promise<void> {
  return apiDelete<void>(`/api/v1/brands/${id}`);
}
```

- [ ] **Step 2: Swap the four call sites in `app/(admin)/admin/brands/page.tsx`**

Remove the page-local `Brand` interface and change the import:
```typescript
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import { listBrandsAdmin, createBrand, updateBrand, deleteBrand, type AdminBrand as Brand } from '@/models/brand.model';
```

Change the call sites:
```typescript
      setItems(await apiGet<Brand[]>('/api/v1/brands'));
```
→
```typescript
      setItems(await listBrandsAdmin());
```
```typescript
        await apiPatch(`/api/v1/brands/${editingId}`, body);
```
→
```typescript
        await updateBrand(editingId, body);
```
```typescript
        await apiPost('/api/v1/brands', body);
```
→
```typescript
        await createBrand(body);
```
```typescript
      await apiDelete(`/api/v1/brands/${b.id}`);
```
→
```typescript
      await deleteBrand(b.id);
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin/brands`, create, edit, and delete a brand, confirm `/products` brand filters still work.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/brand.model.ts "apps/web/src/app/(admin)/admin/brands/page.tsx"
git commit -m "refactor(web): extend BrandModel with admin CRUD"
```

---

### Task 3: Extend `category.model.ts` with admin CRUD + refactor the admin categories page

The admin categories page needs the **raw** category list — not the storefront's `getCategories()`, which merges in synthetic "virtual brand" entries for the mega-menu (see the customer-facing plan, Task 1). Using `getCategories()` here would leak those fake `virtual-brand-*` rows into the admin CRUD list, which is exactly the kind of behavior change this refactor must not introduce.

**Files:**
- Modify: `apps/web/src/models/category.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/categories/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `listCategoriesAdmin(): Promise<AdminCategory[]>`, `createCategory(body): Promise<AdminCategory>`, `updateCategory(id, body): Promise<AdminCategory>`, `deleteCategory(id): Promise<void>` (all in `@/models/category.model`).

- [ ] **Step 1: Add the admin functions to `models/category.model.ts`**

```typescript
// apps/web/src/models/category.model.ts (additions)
import { apiPost, apiPatch, apiDelete } from '@/lib/api-client';
// (merge into the file's existing `apiGet` import from '@/lib/api-client')

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  _count: { products: number };
}

export interface CategoryDraftBody {
  name: string;
  slug?: string;
  description: string;
  imageUrl: string;
  parentId: string;
}

/** Admin: the raw category list — no virtual-brand rows, unlike `getCategories()`. */
export function listCategoriesAdmin(): Promise<AdminCategory[]> {
  return apiGet<AdminCategory[]>('/api/v1/categories');
}

export function createCategory(body: CategoryDraftBody): Promise<AdminCategory> {
  return apiPost<AdminCategory>('/api/v1/categories', body);
}

export function updateCategory(id: string, body: Partial<CategoryDraftBody>): Promise<AdminCategory> {
  return apiPatch<AdminCategory>(`/api/v1/categories/${id}`, body);
}

export function deleteCategory(id: string): Promise<void> {
  return apiDelete<void>(`/api/v1/categories/${id}`);
}
```

- [ ] **Step 2: Swap the four call sites in `app/(admin)/admin/categories/page.tsx`**

Remove the page-local `Category` interface and change the import:
```typescript
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import { listCategoriesAdmin, createCategory, updateCategory, deleteCategory, type AdminCategory as Category } from '@/models/category.model';
```

Change the call sites:
```typescript
      setItems(await apiGet<Category[]>('/api/v1/categories'));
```
→
```typescript
      setItems(await listCategoriesAdmin());
```
```typescript
        await apiPatch(`/api/v1/categories/${editingId}`, body);
```
→
```typescript
        await updateCategory(editingId, body);
```
```typescript
        await apiPost('/api/v1/categories', body);
```
→
```typescript
        await createCategory(body);
```
```typescript
      await apiDelete(`/api/v1/categories/${c.id}`);
```
→
```typescript
      await deleteCategory(c.id);
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin/categories`, create a parent and a child category, edit, delete, confirm the mega-menu at `/` still shows only real categories plus the intended virtual brand entries under "Mobile" (i.e. confirm this task didn't touch `getCategories()` at all).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/category.model.ts "apps/web/src/app/(admin)/admin/categories/page.tsx"
git commit -m "refactor(web): extend CategoryModel with admin CRUD"
```

---

### Task 4: `coupon.model.ts` (new) + refactor the admin coupons page

**Files:**
- Create: `apps/web/src/models/coupon.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/coupons/page.tsx`

**Interfaces:**
- Consumes: `listCategoriesAdmin()` (`@/models/category.model`, Task 3) — the coupon page's category-restriction dropdown used its own narrow local `Cat` type (`id`, `name`, `slug`), which `AdminCategory` structurally satisfies.
- Produces: `listCoupons(): Promise<AdminCoupon[]>`, `createCoupon(body)`, `updateCoupon(id, body)`, `deleteCoupon(id)` (all in `@/models/coupon.model`).

- [ ] **Step 1: Create `models/coupon.model.ts`**

```typescript
// apps/web/src/models/coupon.model.ts
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client';

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  isPercentage: boolean;
  value: string | number;
  minOrderAmount: string | number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  isActive: boolean;
  freeShipping: boolean;
  isPublic: boolean;
  categoryId: string | null;
  category?: { name: string } | null;
}

export function listCoupons(): Promise<AdminCoupon[]> {
  return apiGet<AdminCoupon[]>('/api/v1/coupons');
}

export function createCoupon(body: Record<string, unknown>): Promise<AdminCoupon> {
  return apiPost<AdminCoupon>('/api/v1/coupons', body);
}

export function updateCoupon(id: string, body: Record<string, unknown>): Promise<AdminCoupon> {
  return apiPatch<AdminCoupon>(`/api/v1/coupons/${id}`, body);
}

export function deleteCoupon(id: string): Promise<void> {
  return apiDelete<void>(`/api/v1/coupons/${id}`);
}
```

- [ ] **Step 2: Swap the call sites in `app/(admin)/admin/coupons/page.tsx`**

Remove the page-local `Cat` and `Coupon` interfaces and change the import:
```typescript
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import { listCoupons, createCoupon, updateCoupon, deleteCoupon, type AdminCoupon as Coupon } from '@/models/coupon.model';
import { listCategoriesAdmin, type AdminCategory as Cat } from '@/models/category.model';
```

Change `load()`:
```typescript
  const load = async () => {
    try {
      const [c, cat] = await Promise.all([
        apiGet<Coupon[]>('/api/v1/coupons'),
        apiGet<Cat[]>('/api/v1/categories').catch(() => []),
      ]);
      setItems(c);
      setCats(cat);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };
```
to:
```typescript
  const load = async () => {
    try {
      const [c, cat] = await Promise.all([
        listCoupons(),
        listCategoriesAdmin().catch(() => []),
      ]);
      setItems(c);
      setCats(cat);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };
```

Change the remaining three call sites:
```typescript
        await apiPatch(`/api/v1/coupons/${editingId}`, body);
```
→
```typescript
        await updateCoupon(editingId, body);
```
```typescript
        await apiPost('/api/v1/coupons', body);
```
→
```typescript
        await createCoupon(body);
```
```typescript
      await apiDelete(`/api/v1/coupons/${c.id}`);
```
→
```typescript
      await deleteCoupon(c.id);
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin/coupons`, create a percentage and a fixed-amount coupon (one category-restricted), edit, delete, then confirm a coupon code still applies correctly at `/cart` or `/checkout`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/coupon.model.ts "apps/web/src/app/(admin)/admin/coupons/page.tsx"
git commit -m "refactor(web): extract CouponModel"
```

---

### Task 5: `flash-sale.model.ts` (new) + refactor the admin flash sales page

**Files:**
- Create: `apps/web/src/models/flash-sale.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/flash-sales/page.tsx`

**Interfaces:**
- Consumes: `getProducts(queryString)` (`@/models/product.model`, customer-facing plan Task 2) — the product picker uses the same public `/api/v1/products` listing the storefront already wraps.
- Produces: `listFlashSales(): Promise<AdminFlashSale[]>`, `createFlashSale(body)`, `updateFlashSale(id, body)`, `deleteFlashSale(id)`, `addFlashSaleProduct(saleId, body)`, `removeFlashSaleProduct(saleId, productId)` (all in `@/models/flash-sale.model`).

- [ ] **Step 1: Create `models/flash-sale.model.ts`**

```typescript
// apps/web/src/models/flash-sale.model.ts
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client';

export interface FlashSaleProductLine {
  productId: string;
  salePrice: string | number;
  soldCount: number;
  product: { id: string; name: string; slug: string; price: string | number; currency: string };
}

export interface AdminFlashSale {
  id: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  products: FlashSaleProductLine[];
}

export function listFlashSales(): Promise<AdminFlashSale[]> {
  return apiGet<AdminFlashSale[]>('/api/v1/flash-sales');
}

export function createFlashSale(body: { name: string; startsAt: string; endsAt: string }): Promise<AdminFlashSale> {
  return apiPost<AdminFlashSale>('/api/v1/flash-sales', body);
}

export function updateFlashSale(id: string, body: Record<string, unknown>): Promise<AdminFlashSale> {
  return apiPatch<AdminFlashSale>(`/api/v1/flash-sales/${id}`, body);
}

export function deleteFlashSale(id: string): Promise<void> {
  return apiDelete<void>(`/api/v1/flash-sales/${id}`);
}

export function addFlashSaleProduct(
  saleId: string,
  body: { productId: string; salePrice: number },
): Promise<FlashSaleProductLine> {
  return apiPost<FlashSaleProductLine>(`/api/v1/flash-sales/${saleId}/products`, body);
}

export function removeFlashSaleProduct(saleId: string, productId: string): Promise<void> {
  return apiDelete<void>(`/api/v1/flash-sales/${saleId}/products/${productId}`);
}
```

- [ ] **Step 2: Swap the call sites in `app/(admin)/admin/flash-sales/page.tsx`**

Remove the page-local `SaleProduct` and `FlashSale` interfaces and change the import:
```typescript
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import {
  listFlashSales,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  addFlashSaleProduct,
  removeFlashSaleProduct,
  type AdminFlashSale as FlashSale,
  type FlashSaleProductLine as SaleProduct,
} from '@/models/flash-sale.model';
import { getProducts } from '@/models/product.model';
```

Change `load()`:
```typescript
      const [s, p] = await Promise.all([
        apiGet<FlashSale[]>('/api/v1/flash-sales'),
        apiGet<ProductListResponse>('/api/v1/products?limit=60'),
      ]);
```
to:
```typescript
      const [s, p] = await Promise.all([
        listFlashSales(),
        getProducts('limit=60'),
      ]);
```

(The `ProductListResponse` type import from `@drikon/shared-types` is no longer needed directly in this file — remove it, keeping the `ProductSummary` import which is still used for the `products` state type.)

Change the remaining five call sites:
```typescript
      await apiPost('/api/v1/flash-sales', {
        name: form.name.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
```
→
```typescript
      await createFlashSale({
        name: form.name.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
```
```typescript
      await apiPatch(`/api/v1/flash-sales/${s.id}`, { isActive: !s.isActive });
```
→
```typescript
      await updateFlashSale(s.id, { isActive: !s.isActive });
```
```typescript
      await apiDelete(`/api/v1/flash-sales/${s.id}`);
```
→
```typescript
      await deleteFlashSale(s.id);
```
```typescript
      await apiPost(`/api/v1/flash-sales/${sale.id}/products`, { productId: pid, salePrice: Number(price) });
```
→
```typescript
      await addFlashSaleProduct(sale.id, { productId: pid, salePrice: Number(price) });
```
```typescript
      await apiDelete(`/api/v1/flash-sales/${sale.id}/products/${productId}`);
```
→
```typescript
      await removeFlashSaleProduct(sale.id, productId);
```

And the reschedule call:
```typescript
      await apiPatch(`/api/v1/flash-sales/${sale.id}`, {
        startsAt: new Date(dates.startsAt).toISOString(),
        endsAt: new Date(dates.endsAt).toISOString(),
      });
```
→
```typescript
      await updateFlashSale(sale.id, {
        startsAt: new Date(dates.startsAt).toISOString(),
        endsAt: new Date(dates.endsAt).toISOString(),
      });
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin/flash-sales`, create a sale, add/remove a product line, reschedule it, toggle active, delete it, confirm an active sale surfaces in the storefront's flash sale section on `/`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/flash-sale.model.ts "apps/web/src/app/(admin)/admin/flash-sales/page.tsx"
git commit -m "refactor(web): extract FlashSaleModel"
```

---

### Task 6: Extend `order.model.ts` with admin list + status change + refactor the admin orders page

**Files:**
- Modify: `apps/web/src/models/order.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/orders/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `listOrdersAdmin(query: string): Promise<AdminOrderListResponse>`, `updateOrderStatus(id: string, status: OrderStatus): Promise<void>` (both in `@/models/order.model`).

- [ ] **Step 1: Add the admin functions to `models/order.model.ts`**

```typescript
// apps/web/src/models/order.model.ts (additions)
import { apiPatch } from '@/lib/api-client';
// (merge into the file's existing `apiGet, apiPost` import from '@/lib/api-client')
import type { OrderStatus, Pagination } from '@drikon/shared-types';

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string | number;
  currency: string;
  createdAt: string;
  items: { id: string; quantity: number }[];
  user: { id: string; name: string; email: string };
}

export interface AdminOrderListResponse {
  items: AdminOrder[];
  pagination: Pagination;
}

export function listOrdersAdmin(query: string): Promise<AdminOrderListResponse> {
  return apiGet<AdminOrderListResponse>(`/api/v1/admin/orders?${query}`);
}

export function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  return apiPatch<void>(`/api/v1/admin/orders/${id}/status`, { status });
}
```

- [ ] **Step 2: Swap the call sites in `app/(admin)/admin/orders/page.tsx`**

Remove the page-local `AdminOrder` interface and change the import:
```typescript
import { apiGet, apiPatch } from '@/lib/api-client';
```
to:
```typescript
import { listOrdersAdmin, updateOrderStatus, type AdminOrder } from '@/models/order.model';
```

Change `load()`'s fetch:
```typescript
      const data = await apiGet<{ items: AdminOrder[]; pagination: Pagination }>(
        `/api/v1/admin/orders?${qs.toString()}`,
      );
```
to:
```typescript
      const data = await listOrdersAdmin(qs.toString());
```

Change `changeStatus()`'s call:
```typescript
      await apiPatch(`/api/v1/admin/orders/${id}/status`, { status: next });
```
to:
```typescript
      await updateOrderStatus(id, next);
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin/orders`, filter by status, search, change an order's status, confirm it updates and the customer's `/orders/<number>` page reflects the new status.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/order.model.ts "apps/web/src/app/(admin)/admin/orders/page.tsx"
git commit -m "refactor(web): extend OrderModel with admin list and status change"
```

---

### Task 7: `admin.model.ts` (new) + refactor the admin dashboard home page

The dashboard stats endpoint returns a pre-composed DTO spanning orders, users, products, and reviews — it doesn't belong to any single domain entity's Model (mirroring how `apps/api`'s `AdminService` isn't backed by its own `AdminModel` either; see Plan A, Task 11). This gets its own small `admin.model.ts` with one function.

**Files:**
- Create: `apps/web/src/models/admin.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `getAdminStats(): Promise<AdminStats>` (`@/models/admin.model`).

- [ ] **Step 1: Create `models/admin.model.ts`**

```typescript
// apps/web/src/models/admin.model.ts
import { apiGet } from '@/lib/api-client';
import type { OrderStatus } from '@drikon/shared-types';

export interface AdminStats {
  totals: {
    revenue: string | number;
    orders: number;
    customers: number;
    products: number;
    reviews: number;
    pendingOrders: number;
  };
  ordersByStatus: Record<string, number>;
  recentOrders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    total: string | number;
    currency: string;
    createdAt: string;
    user: { name: string; email: string };
  }[];
  topProducts: {
    id: string;
    name: string;
    slug: string;
    salesCount: number;
    price: string | number;
    currency: string;
    image: string | null;
  }[];
}

export function getAdminStats(): Promise<AdminStats> {
  return apiGet<AdminStats>('/api/v1/admin/stats');
}
```

- [ ] **Step 2: Swap the call site in `app/(admin)/admin/page.tsx`**

Remove the page-local `AdminStats` interface and change the import:
```typescript
import { apiGet } from '@/lib/api-client';
```
to:
```typescript
import { getAdminStats, type AdminStats } from '@/models/admin.model';
```

Change the effect:
```typescript
  useEffect(() => {
    apiGet<AdminStats>('/api/v1/admin/stats')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);
```
to:
```typescript
  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin`, confirm the revenue/orders/customers/products/pending stat cards, recent orders table, and top sellers list all render with real numbers.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/admin.model.ts "apps/web/src/app/(admin)/admin/page.tsx"
git commit -m "refactor(web): extract admin dashboard stats into a Model"
```

---

### Task 8: `review.model.ts` (new) + refactor the admin reviews page

**Files:**
- Create: `apps/web/src/models/review.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/reviews/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `listReviewsAdmin(query: string): Promise<AdminReviewListResponse>`, `setReviewVisibility(id: string, isHidden: boolean): Promise<void>` (both in `@/models/review.model`).

- [ ] **Step 1: Create `models/review.model.ts`**

```typescript
// apps/web/src/models/review.model.ts
import { apiGet, apiPatch } from '@/lib/api-client';
import type { Pagination } from '@drikon/shared-types';

export interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isHidden: boolean;
  isVerified: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; name: string; slug: string };
}

export interface AdminReviewListResponse {
  items: AdminReview[];
  pagination: Pagination;
}

export function listReviewsAdmin(query: string): Promise<AdminReviewListResponse> {
  return apiGet<AdminReviewListResponse>(`/api/v1/reviews/admin/all?${query}`);
}

export function setReviewVisibility(id: string, isHidden: boolean): Promise<void> {
  return apiPatch<void>(`/api/v1/reviews/${id}/visibility`, { isHidden });
}
```

- [ ] **Step 2: Swap the call sites in `app/(admin)/admin/reviews/page.tsx`**

Remove the page-local `AdminReview` interface and change the import:
```typescript
import { apiGet, apiPatch } from '@/lib/api-client';
```
to:
```typescript
import { listReviewsAdmin, setReviewVisibility, type AdminReview } from '@/models/review.model';
```

Change `load()`'s fetch:
```typescript
      const data = await apiGet<{ items: AdminReview[]; pagination: Pagination }>(
        `/api/v1/reviews/admin/all?page=${page}&limit=20`,
      );
```
to:
```typescript
      const data = await listReviewsAdmin(`page=${page}&limit=20`);
```

Change `toggle()`'s call:
```typescript
      await apiPatch(`/api/v1/reviews/${r.id}/visibility`, { isHidden: next });
```
to:
```typescript
      await setReviewVisibility(r.id, next);
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin/reviews`, hide and restore a review, confirm the product's public review count/average updates accordingly on its detail page.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/review.model.ts "apps/web/src/app/(admin)/admin/reviews/page.tsx"
git commit -m "refactor(web): extract ReviewModel"
```

---

### Task 9: Extend `settings.model.ts` with `updateSettings` + refactor the admin settings page

The customer-facing plan's Task 1 already moved `lib/content.ts`'s `CONTENT_DEFAULTS` into `models/settings.model.ts` and updated this page's import for it — this task only adds the missing write operation and swaps the read/write call sites.

**Files:**
- Modify: `apps/web/src/models/settings.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/settings/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `updateSettings(payload: UpdateSettingsInput): Promise<SiteSettings>` (`@/models/settings.model`).

- [ ] **Step 1: Add `updateSettings` to `models/settings.model.ts`**

```typescript
// apps/web/src/models/settings.model.ts (addition)
import { apiPatch } from '@/lib/api-client';
// (merge into the file's existing `apiGet` import from '@/lib/api-client')
import type { UpdateSettingsInput } from '@drikon/shared-types';

export function updateSettings(payload: UpdateSettingsInput): Promise<SiteSettings> {
  return apiPatch<SiteSettings>('/api/v1/settings', payload);
}
```

- [ ] **Step 2: Swap the two call sites in `app/(admin)/admin/settings/page.tsx`**

Change the import:
```typescript
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import { getSettings, updateSettings } from '@/models/settings.model';
```

Change the load effect:
```typescript
    apiGet<SiteSettings>('/api/v1/settings')
      .then((s) =>
```
to:
```typescript
    getSettings()
      .then((s) =>
```

Change `onSubmit`:
```typescript
      await apiPatch('/api/v1/settings', payload);
```
to:
```typescript
      await updateSettings(payload);
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin/settings`, change the site name and accent color, save, confirm the change reflects across the storefront (navbar, footer, hero) after `router.refresh()`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/settings.model.ts "apps/web/src/app/(admin)/admin/settings/page.tsx"
git commit -m "refactor(web): extend SettingsModel with updateSettings"
```

---

### Task 10: `user.model.ts` (new, `apps/web`) + refactor the admin users page

Not to be confused with `apps/api/src/models/user.model.ts` from Plan A — this is the frontend's own Model file, scoped to what the admin users page needs (list + role change), not authentication.

**Files:**
- Create: `apps/web/src/models/user.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/users/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `listUsersAdmin(query: string): Promise<AdminUserListResponse>`, `updateUserRole(id: string, role: Role): Promise<void>` (both in `@/models/user.model`).

- [ ] **Step 1: Create `models/user.model.ts`**

```typescript
// apps/web/src/models/user.model.ts
import { apiGet, apiPatch } from '@/lib/api-client';
import type { Role, Pagination } from '@drikon/shared-types';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  twoFactorEnabled: boolean;
  _count: { orders: number };
}

export interface AdminUserListResponse {
  items: AdminUser[];
  pagination: Pagination;
}

export function listUsersAdmin(query: string): Promise<AdminUserListResponse> {
  return apiGet<AdminUserListResponse>(`/api/v1/admin/users?${query}`);
}

export function updateUserRole(id: string, role: Role): Promise<void> {
  return apiPatch<void>(`/api/v1/admin/users/${id}/role`, { role });
}
```

- [ ] **Step 2: Swap the call sites in `app/(admin)/admin/users/page.tsx`**

Remove the page-local `AdminUser` interface and change the import:
```typescript
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import { listUsersAdmin, updateUserRole, type AdminUser } from '@/models/user.model';
```

Change `load()`'s fetch:
```typescript
      const data = await apiGet<{ items: AdminUser[]; pagination: Pagination }>(
        `/api/v1/admin/users?${qs.toString()}`,
      );
```
to:
```typescript
      const data = await listUsersAdmin(qs.toString());
```

Change `changeRole()`'s call:
```typescript
      await apiPatch(`/api/v1/admin/users/${id}/role`, { role: next });
```
to:
```typescript
      await updateUserRole(id, next);
```

- [ ] **Step 3: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin/users`, search for a user, change a non-self user's role, confirm the "you can't change your own role" disabled state still works for the signed-in admin's own row.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/models/user.model.ts "apps/web/src/app/(admin)/admin/users/page.tsx"
git commit -m "refactor(web): extract web-side UserModel for the admin users page"
```

---

### Task 11: Extend `product.model.ts` with admin list/delete/get-by-id + refactor the admin products list and edit pages

Bundled because both files need the same new `product.model.ts` additions.

**Files:**
- Modify: `apps/web/src/models/product.model.ts`
- Modify: `apps/web/src/app/(admin)/admin/products/page.tsx`
- Modify: `apps/web/src/app/(admin)/admin/products/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `listProductsAdmin(query: string): Promise<ProductListResponse>`, `deleteProductAdmin(id: string): Promise<void>`, `getProductByIdAdmin(id: string): Promise<any>` (all in `@/models/product.model`).

- [ ] **Step 1: Add the admin functions to `models/product.model.ts`**

```typescript
// apps/web/src/models/product.model.ts (additions)
import { apiDelete } from '@/lib/api-client';
// (merge into the file's existing `apiGet, ApiError` import from '@/lib/api-client')

/** Admin: every product including inactive ones, unlike the public `getProducts()`. */
export function listProductsAdmin(query: string): Promise<ProductListResponse> {
  return apiGet<ProductListResponse>(`/api/v1/products/admin/all?${query}`);
}

export function deleteProductAdmin(id: string): Promise<void> {
  return apiDelete<void>(`/api/v1/products/${id}`);
}

/**
 * Typed `any` deliberately, matching the original admin edit page's own typing —
 * the edit form consumes this dynamically field-by-field and was never given a
 * proper response type; introducing one now would be a scope-creeping type
 * change unrelated to this MVC refactor.
 */
export function getProductByIdAdmin(id: string): Promise<any> {
  return apiGet<any>(`/api/v1/products/${id}`);
}
```

- [ ] **Step 2: Swap the call sites in `app/(admin)/admin/products/page.tsx`**

Change the import:
```typescript
import { apiGet, apiDelete, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import { listProductsAdmin, deleteProductAdmin } from '@/models/product.model';
```

Change `load()`'s fetch:
```typescript
      const data = await apiGet<ProductListResponse>(
        `/api/v1/products/admin/all?page=${page}&limit=${PAGE_SIZE}`,
      );
```
to:
```typescript
      const data = await listProductsAdmin(`page=${page}&limit=${PAGE_SIZE}`);
```

Change `handleDelete()`'s call:
```typescript
      await apiDelete(`/api/v1/products/${id}`);
```
to:
```typescript
      await deleteProductAdmin(id);
```

- [ ] **Step 3: Swap the call site in `app/(admin)/admin/products/[id]/edit/page.tsx`**

Change the import:
```typescript
import { apiGet, ApiError } from '@/lib/api-client';
```
to:
```typescript
import { ApiError } from '@/lib/api-client';
import { getProductByIdAdmin } from '@/models/product.model';
```

Change the effect:
```typescript
    void apiGet<any>(`/api/v1/products/${id}`)
      .then(setProduct)
```
to:
```typescript
    void getProductByIdAdmin(id)
      .then(setProduct)
```

- [ ] **Step 4: Build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 5: Manual smoke check**

Run `pnpm --filter web dev`, open `/admin/products`, confirm the (including inactive) list and pagination render, open a product to edit, confirm the form pre-fills correctly, delete a product with a confirm step.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/models/product.model.ts "apps/web/src/app/(admin)/admin/products/page.tsx" "apps/web/src/app/(admin)/admin/products/[id]/edit/page.tsx"
git commit -m "refactor(web): extend ProductModel with admin list/delete/get-by-id"
```

---

### Task 12: Final verification — confirm `products/new` needs no action, and sanity-check the whole admin surface

`app/(admin)/admin/products/new/page.tsx` makes zero direct API calls — it renders `<ProductForm mode="create" />` and lets that component (View layer, out of scope) handle the create request. This task verifies that's still true rather than modifying it, then does a full pass over every admin route.

**Files:** none modified — verification only.

- [ ] **Step 1: Confirm `products/new/page.tsx` still has no direct API calls**

Run: `grep -n "apiGet\|apiPost\|apiPatch\|apiDelete" "apps/web/src/app/(admin)/admin/products/new/page.tsx"`
Expected: no output.

- [ ] **Step 2: Confirm no admin page.tsx still imports `apiGet`/`apiPost`/`apiPatch`/`apiDelete` directly (only `ApiError`, where still needed for `instanceof` checks in `onSubmit`/`save`/`remove` handlers, should remain)**

Run: `grep -rn "apiGet\|apiPost\|apiPatch\|apiDelete" "apps/web/src/app/(admin)"`
Expected: no output — every call now goes through a Model function. (`ApiError` matches are fine since that grep pattern doesn't include it; a separate check confirms nothing was missed: `grep -rln "from '@/lib/api-client'" "apps/web/src/app/(admin)"` should list only files that still need `ApiError`.)

- [ ] **Step 3: Confirm `apps/web/src/models/` now covers every admin resource**

Run: `ls apps/web/src/models/`
Expected: `admin.model.ts`, `banner.model.ts`, `brand.model.ts`, `category.model.ts`, `content` folded into `settings.model.ts` (from the customer-facing plan), `coupon.model.ts`, `flash-sale.model.ts`, `order.model.ts`, `product.model.ts`, `review.model.ts`, `settings.model.ts`, `user.model.ts`, `wishlist.model.ts`.

- [ ] **Step 4: Full build**

Run: `pnpm --filter web build`
Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 5: Full manual smoke pass**

Run `pnpm --filter web dev`, sign in as an admin, and click through every admin route once: dashboard → products (list, new, edit, delete) → categories → brands → banners → coupons → flash sales → orders (filter, status change) → reviews (hide/restore) → users (search, role change) → settings (edit, save). Confirm nothing regressed from before Task 1, and spot-check that the storefront still reflects admin changes (banner on `/`, updated settings in the navbar/footer, a hidden review disappearing from a product page).

- [ ] **Step 6: Commit** (only if Steps 1-4 required any fixes)

```bash
git status
# If clean, this plan is done — no commit needed for this task.
# If Steps 1-4 surfaced anything, fix it, then:
git add -A
git commit -m "fix(web): resolve issues found during MVC admin-routes verification pass"
```

## Definition of Done

- Tasks 1-11 committed, in order, each with a green `pnpm --filter web build`.
- Every admin `page.tsx` under `app/(admin)/admin/` calls a Model function for every read/write instead of `apiGet`/`apiPost`/`apiPatch`/`apiDelete` directly (`products/new/page.tsx` and `layout.tsx` excepted — verified to need no change).
- `apps/web/src/models/` contains 13 files covering every domain entity across both the customer-facing and admin surfaces: `product`, `category`, `brand`, `banner`, `settings` (with `content` folded in), `wishlist`, `order`, `coupon`, `flash-sale`, `review`, `admin`, `user`.
- Task 12's verification steps all pass.
- This completes all three plans from `docs/superpowers/specs/2026-08-17-mvc-conversion-design.md`: apps/api Model layer (Plan A), apps/web customer-facing routes (Plan B), apps/web admin routes (Plan C, this plan). Once all three are implemented, revisit `ARCHITECTURE.md`'s "MVC Layer Mapping" section (added in Plan A, Task 12) to confirm it still accurately describes the finished structure.