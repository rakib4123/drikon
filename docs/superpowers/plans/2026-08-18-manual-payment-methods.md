# Manual Payment Methods (bKash Send Money + COD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers actually pay for orders, via two methods that need no merchant/gateway approval — bKash "Send Money" to a published personal number (admin-verified manually) and Cash on Delivery — replacing checkout's current "Demo checkout — no payment is taken."

**Architecture:** Every order gets exactly one `Payment` row created atomically with the order. `Payment.method` (`BKASH_MANUAL` | `COD`) and `Payment.status` (`PENDING`/`SUCCEEDED`/`FAILED`/`REFUNDED`, unchanged enum) track payment state independently of `Order.status`, which keeps its existing fulfillment lifecycle untouched. bKash payments start `PENDING` and are flipped to `SUCCEEDED`/`FAILED` by an admin action; COD payments auto-flip to `SUCCEEDED` when an order is marked `DELIVERED`.

**Tech Stack:** NestJS + Prisma (apps/api), Next.js 15 App Router + react-hook-form + zod (apps/web), shared zod schemas in `packages/shared-types`.

**Spec:** `docs/superpowers/specs/2026-08-18-manual-payment-methods-design.md`

## Global Constraints

- No real payment-gateway API integration (no Stripe/SSLCommerz/bKash Merchant API) — this plan is bKash Send Money (manual, admin-verified) + Cash on Delivery only.
- No automatic payment verification — matching a TrxID to bKash's real transaction record requires API access this project doesn't have; verification is a manual admin action only.
- No refund automation. `PaymentStatus.REFUNDED` exists for record-keeping; nothing in this plan sets it.
- No changes to `OrderStatus` enum values or its `PENDING → PROCESSING → SHIPPED → DELIVERED`/`CANCELLED` semantics. Payment state lives on `Payment`, independently.
- No stock-reservation redesign — stock still decrements at order creation exactly as it does today, regardless of payment method or verification state.
- `Payment.providerPaymentId` is **reused**, not renamed, to hold the customer-submitted bKash Transaction ID end-to-end (Prisma column → API DTO → frontend type). This matches this codebase's existing convention of returning Prisma-shaped objects with no separate view-DTO field-renaming layer (confirmed: `OrderSummary`'s other fields — `subtotal`, `shipping`, `total`, etc. — already match Prisma column names 1:1). Do not introduce a `trxId`-named field anywhere; the UI *label* shown to users says "Transaction ID (TrxID)," but the field name stays `providerPaymentId`.
- `Payment.method` enum values are exactly `BKASH_MANUAL` and `COD` — use these spellings verbatim everywhere (Prisma enum, DTOs, frontend types, UI logic).
- This plan does not introduce service-level unit tests. No `*.service.ts` file in `apps/api` has ever had a companion spec — only `*.model.ts` files do (confirmed: 11 Model spec files, 0 Service spec files). New business logic in `OrdersService`/`AdminService` is verified via the Model-layer tests (which cover the actual persisted behavior) plus the manual build/typecheck/smoke-check steps inside each task. This mirrors the precedent already set by every other service in this codebase — do not add a first service spec file as part of this plan.
- After every `apps/api`-touching task: `pnpm --filter api build` must pass with zero TypeScript errors, and `pnpm --filter api test` must pass.
- After every `apps/web`-touching task: `pnpm --filter web typecheck` and `pnpm --filter web build` must both pass with zero errors.
- After Task 2: `pnpm --filter @drikon/shared-types typecheck` must pass.
- Every task is a single git commit, only after its verification commands are green.
- Task 1's Prisma migration needs a reachable local Postgres (`docker-compose up -d postgres` per `deploy/DEPLOY.md`) and a `.env` in `apps/api` with `DATABASE_URL`/`DIRECT_URL` set. This is **independent of** the pre-existing `ConfigModule.forRoot()` env-loading bug documented elsewhere in this repo's history (that bug breaks the NestJS app's own `pnpm dev` boot via `ConfigService`; the Prisma CLI reads env directly via dotenv and is unaffected by it) — don't let that known issue block this migration step.

---

## File Structure

**New files:**
- `apps/web/src/components/shop/payment-method-field.tsx` — self-contained checkout payment-method widget (mirrors the existing `coupon-field.tsx` pattern: local state + `onChange` callback into the parent page).

**Modified files:**
- `apps/api/prisma/schema.prisma` — new `PaymentMethod` enum; retype `Payment.provider`→`method`; add `Payment.adminNote`; drop `Payment.providerCustomerId`/`cardLast4`/`cardBrand`; add 4 fields to `SiteSettings`.
- `apps/api/prisma/migrations/` — new migration (generated, not hand-written).
- `packages/shared-types/src/index.ts` — `PaymentMethod`/`PaymentStatus` types, `PaymentInputSchema`, `payment` field on `CreateOrderSchema`, `OrderPaymentSummary` + `payment` field on `OrderSummary`, 4 new `SiteSettings` fields + `UpdateSettingsSchema` fields.
- `apps/api/src/models/order.model.ts` — `CreateOrderPersistArgs` gains `payment`; `createOrderTransaction` creates the `Payment` row; new `updatePayment` generic method.
- `apps/api/src/models/order.model.spec.ts` — covers the above.
- `apps/api/src/modules/settings/settings.module.ts` — exports `SettingsService` (currently doesn't).
- `apps/api/src/modules/settings/dto/settings.dto.ts` — 4 new fields on `UpdateSettingsSchema`.
- `apps/api/src/modules/orders/dto/order.dto.ts` — new `PaymentInputSchema`, `payment` field on `CreateOrderSchema`.
- `apps/api/src/modules/orders/orders.module.ts` — imports `SettingsModule`.
- `apps/api/src/modules/orders/orders.service.ts` — reads settings to gate disabled methods, passes `payment` through, friendly error on duplicate TrxID.
- `apps/api/src/modules/admin/dto/admin.dto.ts` — new `VerifyPaymentDto`.
- `apps/api/src/modules/admin/admin.service.ts` — new `verifyPayment`; `updateOrderStatus` auto-succeeds COD payments on `DELIVERED`; `listOrders` includes `payment`.
- `apps/api/src/modules/admin/admin.controller.ts` — new `PATCH /admin/orders/:id/payment` route.
- `apps/web/src/app/(shop)/checkout/page.tsx` — payment-method section, submits `payment`, updated footer copy.
- `apps/web/src/app/(account)/orders/[orderNumber]/page.tsx` — renders payment state.
- `apps/web/src/app/(admin)/admin/orders/page.tsx` — payment column + verify actions.
- `apps/web/src/app/(admin)/admin/settings/page.tsx` — bKash/COD config fields.

---

### Task 1: Prisma schema — `PaymentMethod` enum, `Payment` retype, `SiteSettings` fields

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Generate: a new migration under `apps/api/prisma/migrations/`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `PaymentMethod` enum (`BKASH_MANUAL`, `COD`); `Payment.method: PaymentMethod`; `Payment.providerPaymentId: String? @unique` (kept, now holds the bKash TrxID); `Payment.payerReference: String?`; `Payment.adminNote: String?`; `SiteSettings.bkashNumber/bkashInstructions/bkashEnabled/codEnabled`. Every later task depends on the regenerated Prisma client this task produces.

- [ ] **Step 1: Add the `PaymentMethod` enum**

In `apps/api/prisma/schema.prisma`, right after the existing `PaymentStatus` enum (currently lines 43-48):

```prisma
enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum PaymentMethod {
  BKASH_MANUAL
  COD
}
```

- [ ] **Step 2: Retype the `Payment` model**

Replace the entire `Payment` model block (currently starting `model Payment {`) with:

```prisma
model Payment {
  id                String        @id @default(cuid())
  orderId           String        @unique
  order             Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  method            PaymentMethod
  // Holds the customer-submitted bKash Transaction ID for BKASH_MANUAL payments. Null for COD.
  // The @unique constraint doubles as a fraud guard — two orders can't both claim the same TrxID.
  providerPaymentId String?       @unique
  // bKash sender's phone number, for BKASH_MANUAL only.
  payerReference    String?
  amount            Decimal       @db.Decimal(12, 2)
  currency          String        @default("BDT")
  status            PaymentStatus @default(PENDING)
  paidAt            DateTime?
  refundedAt        DateTime?
  failureReason     String?
  // Free-text note an admin can attach when verifying (e.g. "confirmed against bKash statement, ref #1234").
  adminNote         String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([providerPaymentId])
}
```

This drops `provider`, `providerCustomerId`, `cardLast4`, `cardBrand` (meaningless for manual methods; the table has never had a real row, so there's no data to migrate) and adds `method`, `payerReference`, `adminNote`.

- [ ] **Step 3: Add the payment fields to `SiteSettings`**

In `apps/api/prisma/schema.prisma`, find the `SiteSettings` model. Right after the `socialInstagram String?` line and before the `// ── Editable storefront content ...` comment, insert:

```prisma
  socialFacebook  String?
  socialInstagram String?

  // ── Payments (manual methods — see docs/superpowers/specs/2026-08-18-manual-payment-methods-design.md) ──
  bkashNumber       String?
  bkashInstructions String?
  bkashEnabled      Boolean @default(true)
  codEnabled        Boolean @default(true)

  // ── Editable storefront content (white-label; null falls back to defaults) ──
```

- [ ] **Step 4: Validate the schema**

Run: `pnpm --filter api exec prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 5: Generate and apply the migration**

Ensure Postgres is running: `docker-compose up -d postgres` (from the repo root, per `deploy/DEPLOY.md`). Ensure `apps/api/.env` has `DATABASE_URL`/`DIRECT_URL` pointing at it.

Run: `pnpm --filter api db:migrate -- --name manual_payment_methods`
Expected: prompts complete non-interactively (the `--name` flag supplies the name), ends with `Your database is now in sync with your schema.` and regenerates the Prisma client automatically.

- [ ] **Step 6: Confirm the client regenerated cleanly**

Run: `pnpm --filter api db:generate`
Expected: `✔ Generated Prisma Client` with no errors.

Run: `pnpm --filter api build`
Expected: succeeds (nothing references the removed `Payment` fields yet, so this should be a clean no-op build).

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(api): add PaymentMethod enum and manual-payment fields to schema"
```

---

### Task 2: `packages/shared-types` — payment shapes

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Consumes: nothing new from Task 1 (this package doesn't depend on the Prisma client; it mirrors shapes by hand).
- Produces: `PaymentMethod`, `PaymentStatus` types; `PaymentInputSchema`/`PaymentInput`; `payment` field on `CreateOrderSchema`/`CreateOrderInput`; `OrderPaymentSummary` interface + `payment` field on `OrderSummary`; 4 new fields on `SiteSettings` and `UpdateSettingsSchema`/`UpdateSettingsInput`. Every `apps/web` task below imports these from `@drikon/shared-types`.

- [ ] **Step 1: Add payment types and the discriminated-union schema**

In `packages/shared-types/src/index.ts`, right after the existing `CheckoutItemSchema` block and before `CreateOrderSchema`:

```ts
export const CheckoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.coerce.number().int().positive().max(99),
});

export type PaymentMethod = 'BKASH_MANUAL' | 'COD';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export const PaymentInputSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('BKASH_MANUAL'),
    payerReference: z.string().min(5, 'Required').max(30).trim(),
    providerPaymentId: z.string().min(4, 'Required').max(30).trim(),
  }),
  z.object({
    method: z.literal('COD'),
  }),
]);
export type PaymentInput = z.infer<typeof PaymentInputSchema>;

export const CreateOrderSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1, 'Your cart is empty').max(50),
  shippingAddress: ShippingAddressSchema,
  notes: z.string().max(500).trim().optional(),
  payment: PaymentInputSchema,
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
```

(This replaces the existing `CreateOrderSchema`/`CreateOrderInput` block — same as before, plus the new `payment` field.)

- [ ] **Step 2: Add `OrderPaymentSummary` and wire it into `OrderSummary`**

Find the existing `OrderSummary` interface and the `OrderItemSummary` interface just above it. Right before `export interface OrderSummary {`, insert:

```ts
export interface OrderPaymentSummary {
  method: PaymentMethod;
  status: PaymentStatus;
  providerPaymentId?: string | null;
  payerReference?: string | null;
  paidAt?: string | null;
  adminNote?: string | null;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string | number;
  shipping: string | number;
  tax: string | number;
  discount: string | number;
  total: string | number;
  currency: string;
  createdAt: string;
  items: OrderItemSummary[];
  payment?: OrderPaymentSummary | null;
}
```

(Only the added `OrderPaymentSummary` interface and the new `payment?` line are new — the rest of `OrderSummary` is unchanged, shown here for exact placement.)

- [ ] **Step 3: Add the 4 fields to `SiteSettings` and `UpdateSettingsSchema`**

In the `SiteSettings` interface, right after `socialInstagram?: string | null;`, insert:

```ts
  socialFacebook?: string | null;
  socialInstagram?: string | null;
  bkashNumber?: string | null;
  bkashInstructions?: string | null;
  bkashEnabled?: boolean;
  codEnabled?: boolean;
```

In `UpdateSettingsSchema`, right after `socialInstagram: z.string().url().optional().or(z.literal('')),`, insert:

```ts
  socialInstagram: z.string().url().optional().or(z.literal('')),
  bkashNumber: emptyableText(30),
  bkashInstructions: emptyableText(300),
  bkashEnabled: z.boolean().optional(),
  codEnabled: z.boolean().optional(),
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @drikon/shared-types typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/index.ts
git commit -m "feat(shared-types): add payment shapes and SiteSettings payment fields"
```

---

### Task 3: `OrderModel` — persist the `Payment` row, add `updatePayment`

**Files:**
- Modify: `apps/api/src/models/order.model.ts`
- Modify: `apps/api/src/models/order.model.spec.ts`

**Interfaces:**
- Consumes: the regenerated Prisma client from Task 1 (`Payment`, `PaymentMethod`).
- Produces: `CreateOrderPersistArgs.payment: PaymentPersistInput` (new required field); `OrderModel.createOrderTransaction` now also creates the `Payment` row inside its existing transaction; `OrderModel.updatePayment<T extends Prisma.PaymentUpdateArgs>(args)`. Task 4 (`OrdersService.create`) passes `payment` into `createOrderTransaction`; Task 5 (`AdminService`) calls `updatePayment`.

- [ ] **Step 1: Write the failing tests**

In `apps/api/src/models/order.model.spec.ts`, update the existing `createOrderTransaction` test's `tx` mock to include `payment.create`, and add assertions plus two new tests. Replace the first `it('createOrderTransaction creates the address, order, decrements stock, bumps sales and coupon redemption', ...)` test with:

```ts
  it('createOrderTransaction creates the address, order, payment, decrements stock, bumps sales and coupon redemption', async () => {
    const tx = {
      address: { create: jest.fn().mockResolvedValue({ id: 'addr1' }) },
      order: { create: jest.fn().mockResolvedValue({ id: 'order1', items: [] }) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'pay1' }) },
      product: { update: jest.fn() },
      productVariant: { update: jest.fn() },
      coupon: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const args: CreateOrderPersistArgs = {
      userId: 'u1',
      shippingAddress: {
        fullName: 'A', phone: '1', line1: 'L1', city: 'C', postalCode: '000', country: 'BD',
      },
      orderNumber: 'DRK-2026-000001',
      subtotal: new Prisma.Decimal(100),
      shipping: new Prisma.Decimal(0),
      tax: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(100),
      currency: 'BDT',
      couponId: 'coup1',
      lines: [{
        productId: 'p1', variantId: 'v1', productName: 'X', productImage: null,
        unitPrice: new Prisma.Decimal(100), quantity: 1, lineTotal: new Prisma.Decimal(100),
      }],
      payment: { method: 'BKASH_MANUAL', providerPaymentId: 'TRX123', payerReference: '01711111111' },
    };

    const result = await model.createOrderTransaction(args);

    expect(tx.address.create).toHaveBeenCalledWith({ data: { userId: 'u1', ...args.shippingAddress } });
    expect(tx.order.create).toHaveBeenCalled();
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order1',
        method: 'BKASH_MANUAL',
        amount: args.total,
        currency: 'BDT',
        providerPaymentId: 'TRX123',
        payerReference: '01711111111',
      },
    });
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { stock: { decrement: 1 }, salesCount: { increment: 1 } },
    });
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { stock: { decrement: 1 } },
    });
    expect(tx.coupon.update).toHaveBeenCalledWith({
      where: { id: 'coup1' },
      data: { redemptionCount: { increment: 1 } },
    });
    expect(result).toEqual({ id: 'order1', items: [] });
  });

  it('createOrderTransaction creates a COD payment with no providerPaymentId/payerReference', async () => {
    const tx = {
      address: { create: jest.fn().mockResolvedValue({ id: 'addr1' }) },
      order: { create: jest.fn().mockResolvedValue({ id: 'order2', items: [] }) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'pay2' }) },
      product: { update: jest.fn() },
      productVariant: { update: jest.fn() },
      coupon: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await model.createOrderTransaction({
      userId: 'u1',
      shippingAddress: { fullName: 'A', phone: '1', line1: 'L1', city: 'C', postalCode: '000', country: 'BD' },
      orderNumber: 'DRK-2026-000002',
      subtotal: new Prisma.Decimal(50), shipping: new Prisma.Decimal(0), tax: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(0), total: new Prisma.Decimal(50), currency: 'BDT', couponId: null,
      lines: [],
      payment: { method: 'COD' },
    });

    expect(tx.payment.create).toHaveBeenCalledWith({
      data: { orderId: 'order2', method: 'COD', amount: expect.anything(), currency: 'BDT' },
    });
  });
```

(Do not delete the existing `'createOrderTransaction skips the coupon update when couponId is null'` test — just add a `payment: { method: 'COD' }` field to its args object so it still type-checks, and add `payment: { create: jest.fn() }` to its `tx` mock.)

Add a new `describe` block at the end of the file, before the final closing, for `updatePayment`:

```ts
  it('updatePayment delegates to prisma.payment.update', async () => {
    prisma.payment = { update: jest.fn().mockResolvedValue({ id: 'pay1', status: 'SUCCEEDED' }) };
    const args = { where: { orderId: 'order1' }, data: { status: 'SUCCEEDED' as const } };
    await expect(model.updatePayment(args as any)).resolves.toEqual({ id: 'pay1', status: 'SUCCEEDED' });
    expect(prisma.payment.update).toHaveBeenCalledWith(args);
  });
```

Add this as the last `it` inside the existing top-level `describe('OrderModel', ...)` block.

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `pnpm --filter api test -- order.model`
Expected: FAIL — `CreateOrderPersistArgs` doesn't have a `payment` field yet (TypeScript compile error inside the test file), and `tx.payment.create`/`model.updatePayment` don't exist.

- [ ] **Step 3: Implement**

In `apps/api/src/models/order.model.ts`, change the import line and add the `PaymentPersistInput` type plus `payment` field to `CreateOrderPersistArgs`:

```ts
import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

interface ShippingAddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

interface OrderLineInput {
  productId: string;
  variantId: string | null;
  productName: string;
  productImage: string | null;
  unitPrice: Prisma.Decimal;
  quantity: number;
  lineTotal: Prisma.Decimal;
}

export type PaymentPersistInput =
  | { method: typeof PaymentMethod.BKASH_MANUAL; providerPaymentId: string; payerReference: string }
  | { method: typeof PaymentMethod.COD };

export interface CreateOrderPersistArgs {
  userId: string;
  shippingAddress: ShippingAddressInput;
  orderNumber: string;
  subtotal: Prisma.Decimal;
  shipping: Prisma.Decimal;
  tax: Prisma.Decimal;
  discount: Prisma.Decimal;
  total: Prisma.Decimal;
  currency: string;
  couponId: string | null;
  notes?: string;
  lines: OrderLineInput[];
  payment: PaymentPersistInput;
}
```

Inside `createOrderTransaction`, right after the `for (const l of args.lines) { ... }` stock-decrement loop and before the `if (args.couponId) { ... }` block, add:

```ts
      await tx.payment.create({
        data: {
          orderId: created.id,
          method: args.payment.method,
          amount: args.total,
          currency: args.currency,
          ...(args.payment.method === PaymentMethod.BKASH_MANUAL
            ? { providerPaymentId: args.payment.providerPaymentId, payerReference: args.payment.payerReference }
            : {}),
        },
      });
```

Add the new `updatePayment` method to the `OrderModel` class, alongside the other generic pass-throughs (e.g. right after `update`):

```ts
  updatePayment<T extends Prisma.PaymentUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.PaymentUpdateArgs>) {
    return this.prisma.payment.update(args);
  }
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `pnpm --filter api test -- order.model`
Expected: PASS, all tests green, no TypeScript errors.

- [ ] **Step 5: Full build check**

Run: `pnpm --filter api build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models/order.model.ts apps/api/src/models/order.model.spec.ts
git commit -m "feat(api): OrderModel persists Payment row, adds updatePayment"
```

---

### Task 4: Orders API — accept `payment`, gate disabled methods, friendly duplicate-TrxID error

**Files:**
- Modify: `apps/api/src/modules/settings/settings.module.ts`
- Modify: `apps/api/src/modules/orders/dto/order.dto.ts`
- Modify: `apps/api/src/modules/orders/orders.module.ts`
- Modify: `apps/api/src/modules/orders/orders.service.ts`

**Interfaces:**
- Consumes: `OrderModel.createOrderTransaction` (Task 3, now requires `payment`); `SettingsService.get()` (existing — returns `SiteSettings` including the new `bkashEnabled`/`codEnabled`, but `SettingsService` isn't currently exported from `SettingsModule`).
- Produces: `POST /api/v1/orders` now requires a `payment` field in its body and creates a `Payment` row per order.

- [ ] **Step 1: Export `SettingsService` from `SettingsModule`**

Replace `apps/api/src/modules/settings/settings.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
```

- [ ] **Step 2: Add `PaymentInputSchema` and wire it into `CreateOrderSchema`**

Replace `apps/api/src/modules/orders/dto/order.dto.ts`:

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Mirrors CreateOrderSchema / ShippingAddressSchema in @drikon/shared-types.
export const ShippingAddressSchema = z.object({
  fullName: z.string().min(2).max(120).trim(),
  phone: z.string().min(5).max(30).trim(),
  line1: z.string().min(2).max(200).trim(),
  line2: z.string().max(200).trim().optional(),
  city: z.string().min(1).max(120).trim(),
  state: z.string().max(120).trim().optional(),
  postalCode: z.string().min(1).max(20).trim(),
  country: z.string().min(2).max(60).default('BD'),
});

export const CheckoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.coerce.number().int().positive().max(99),
});

export const PaymentInputSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('BKASH_MANUAL'),
    payerReference: z.string().min(5).max(30).trim(),
    providerPaymentId: z.string().min(4).max(30).trim(),
  }),
  z.object({
    method: z.literal('COD'),
  }),
]);

export const CreateOrderSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1).max(50),
  shippingAddress: ShippingAddressSchema,
  notes: z.string().max(500).trim().optional(),
  couponCode: z.string().max(40).trim().optional().or(z.literal('')),
  payment: PaymentInputSchema,
});
export class CreateOrderDto extends createZodDto(CreateOrderSchema) {}

export const OrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export class OrderQueryDto extends createZodDto(OrderQuerySchema) {}
```

- [ ] **Step 3: Import `SettingsModule` into `OrdersModule`**

Replace `apps/api/src/modules/orders/orders.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CouponsModule } from '../coupons/coupons.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [CouponsModule, SettingsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

- [ ] **Step 4: Wire `SettingsService` and `payment` into `OrdersService.create`**

In `apps/api/src/modules/orders/orders.service.ts`, add the import and constructor param:

```ts
import { OrderModel } from '../../models/order.model';
import { ProductModel } from '../../models/product.model';
import { CouponsService } from '../coupons/coupons.service';
import { SettingsService } from '../settings/settings.service';
import type { CreateOrderDto, OrderQueryDto } from './dto/order.dto';

const FREE_SHIPPING_THRESHOLD = new Prisma.Decimal(3000);
const FLAT_SHIPPING_FEE = new Prisma.Decimal(60);

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly orders: OrderModel,
    private readonly products: ProductModel,
    private readonly coupons: CouponsService,
    private readonly settingsService: SettingsService,
  ) {}
```

At the very top of `async create(userId: string, dto: CreateOrderDto) {`, before the existing `productIds`/`products` lookup, add the settings gate:

```ts
  async create(userId: string, dto: CreateOrderDto) {
    const settings = await this.settingsService.get();
    if (dto.payment.method === 'BKASH_MANUAL' && settings.bkashEnabled === false) {
      throw new BadRequestException('bKash payment is currently unavailable');
    }
    if (dto.payment.method === 'COD' && settings.codEnabled === false) {
      throw new BadRequestException('Cash on delivery is currently unavailable');
    }

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    // ... (unchanged from here)
```

Replace the final block of `create` — the `const order = await this.orders.createOrderTransaction({...}); return this.attachSlugs(order);` — with:

```ts
    try {
      const order = await this.orders.createOrderTransaction({
        userId,
        shippingAddress: dto.shippingAddress,
        orderNumber,
        subtotal,
        shipping,
        tax,
        discount,
        total,
        currency,
        couponId,
        notes: dto.notes,
        lines,
        payment: dto.payment,
      });
      return this.attachSlugs(order);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        (err.meta?.target as string[] | undefined)?.includes('providerPaymentId')
      ) {
        throw new BadRequestException('This bKash Transaction ID has already been used for another order');
      }
      throw err;
    }
  }
```

- [ ] **Step 5: Build**

Run: `pnpm --filter api build`
Expected: succeeds with zero TypeScript errors.

- [ ] **Step 6: Test**

Run: `pnpm --filter api test`
Expected: all pass (this task doesn't add new automated tests per the Global Constraints — the `OrderModel` coverage from Task 3 already covers the persistence behavior this task wires up).

- [ ] **Step 7: Manual smoke check**

With Postgres reachable and `apps/api/.env` configured (see Task 1's note about the unrelated `ConfigModule` boot bug — if `pnpm --filter api dev` still doesn't boot in this environment due to that pre-existing issue, skip this step and note it in your task report; don't spend more than one attempt confirming it's the same known issue), start the API and `POST /api/v1/orders` twice with the same `payment.providerPaymentId` for two different orders (same or different products). Confirm: the first succeeds, the second returns a 400 with the friendly "already been used" message, not a raw 500.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/settings/settings.module.ts apps/api/src/modules/orders/dto/order.dto.ts apps/api/src/modules/orders/orders.module.ts apps/api/src/modules/orders/orders.service.ts
git commit -m "feat(api): orders accept payment method, gate disabled methods, reject duplicate TrxIDs"
```

---

### Task 5: Admin API — verify payment, auto-succeed COD on delivery

**Files:**
- Modify: `apps/api/src/modules/admin/dto/admin.dto.ts`
- Modify: `apps/api/src/modules/admin/admin.service.ts`
- Modify: `apps/api/src/modules/admin/admin.controller.ts`

**Interfaces:**
- Consumes: `OrderModel.updatePayment` (Task 3).
- Produces: `AdminService.verifyPayment(orderId, status, adminNote?)`; `PATCH /api/v1/admin/orders/:id/payment`; `AdminService.listOrders` results now include `payment`; `AdminService.updateOrderStatus` auto-succeeds a COD payment when the order is marked `DELIVERED`.

- [ ] **Step 1: Add `VerifyPaymentDto`**

In `apps/api/src/modules/admin/dto/admin.dto.ts`, add after the existing `UpdateOrderStatusDto` block:

```ts
export const VerifyPaymentSchema = z.object({
  status: z.enum(['SUCCEEDED', 'FAILED']),
  adminNote: z.string().max(300).trim().optional(),
});
export class VerifyPaymentDto extends createZodDto(VerifyPaymentSchema) {}
```

- [ ] **Step 2: Add `verifyPayment` and update `updateOrderStatus`/`listOrders` in `AdminService`**

In `apps/api/src/modules/admin/admin.service.ts`, change the import line:

```ts
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, Role } from '@prisma/client';
```

Replace `listOrders`'s `include` (inside the `findManyAndCount` call) to add `payment: true`:

```ts
    const [items, total] = await this.orders.findManyAndCount(
      {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true } },
          payment: true,
        },
      },
      { where },
    );
```

Replace `updateOrderStatus` with a version that also auto-succeeds a COD payment on delivery:

```ts
  async updateOrderStatus(id: string, status: OrderStatus) {
    const order = await this.orders.findUnique({
      where: { id },
      select: { id: true, payment: { select: { method: true, status: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (
      status === OrderStatus.DELIVERED &&
      order.payment?.method === PaymentMethod.COD &&
      order.payment.status !== PaymentStatus.SUCCEEDED
    ) {
      await this.orders.updatePayment({
        where: { orderId: id },
        data: { status: PaymentStatus.SUCCEEDED, paidAt: new Date() },
      });
    }

    return this.orders.update({
      where: { id },
      data: {
        status,
        ...(status === OrderStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
      },
      include: { items: true, user: { select: { id: true, name: true, email: true } } },
    });
  }
```

Add `verifyPayment` as a new method, right after `updateOrderStatus`:

```ts
  async verifyPayment(orderId: string, status: PaymentStatus, adminNote?: string) {
    const order = await this.orders.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
    if (!order) throw new NotFoundException('Order not found');

    const payment = await this.orders.updatePayment({
      where: { orderId },
      data: {
        status,
        adminNote,
        ...(status === PaymentStatus.SUCCEEDED
          ? { paidAt: new Date() }
          : status === PaymentStatus.FAILED
            ? { failureReason: adminNote }
            : {}),
      },
    });

    if (status === PaymentStatus.SUCCEEDED && order.status === OrderStatus.PENDING) {
      await this.orders.update({ where: { id: orderId }, data: { status: OrderStatus.PROCESSING } });
    }

    return payment;
  }
```

- [ ] **Step 3: Add the controller route**

In `apps/api/src/modules/admin/admin.controller.ts`, add `VerifyPaymentDto` to the import block:

```ts
import {
  AdminOrderQueryDto,
  UpdateOrderStatusDto,
  AdminUserQueryDto,
  UpdateUserRoleDto,
  VerifyPaymentDto,
} from './dto/admin.dto';
```

Add the route right after `updateOrderStatus`:

```ts
  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update an order status' })
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.admin.updateOrderStatus(id, dto.status);
  }

  @Patch('orders/:id/payment')
  @ApiOperation({ summary: 'Verify a manual payment (mark paid or failed)' })
  verifyPayment(@Param('id') id: string, @Body() dto: VerifyPaymentDto) {
    return this.admin.verifyPayment(id, dto.status, dto.adminNote);
  }
```

- [ ] **Step 4: Build**

Run: `pnpm --filter api build`
Expected: succeeds.

- [ ] **Step 5: Test**

Run: `pnpm --filter api test`
Expected: all pass (per Global Constraints, no new service spec is added here).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/admin/dto/admin.dto.ts apps/api/src/modules/admin/admin.service.ts apps/api/src/modules/admin/admin.controller.ts
git commit -m "feat(api): admin can verify manual payments; COD auto-succeeds on delivery"
```

---

### Task 6: Checkout page — payment method selection

**Files:**
- Create: `apps/web/src/components/shop/payment-method-field.tsx`
- Modify: `apps/web/src/app/(shop)/checkout/page.tsx`

**Interfaces:**
- Consumes: `PaymentInput` type (Task 2); public `GET /api/v1/settings` (existing endpoint, now returns the 4 new fields per Task 2's `SiteSettings` type); `POST /api/v1/orders` (Task 4, now requires `payment`).
- Produces: nothing consumed by later tasks — this is a leaf UI task.

- [ ] **Step 1: Write `PaymentMethodField`**

```tsx
// apps/web/src/components/shop/payment-method-field.tsx
'use client';

import { useEffect, useState } from 'react';
import { Banknote, Smartphone } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import type { PaymentInput, PaymentMethod } from '@drikon/shared-types';

interface SettingsSubset {
  bkashEnabled?: boolean;
  codEnabled?: boolean;
  bkashNumber?: string | null;
  bkashInstructions?: string | null;
}

export function PaymentMethodField({
  total,
  currency,
  onChange,
}: {
  total: number;
  currency: string;
  onChange: (payment: PaymentInput | null) => void;
}) {
  const [settings, setSettings] = useState<SettingsSubset | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [payerReference, setPayerReference] = useState('');
  const [providerPaymentId, setProviderPaymentId] = useState('');

  useEffect(() => {
    apiGet<SettingsSubset>('/api/v1/settings')
      .then(setSettings)
      .catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    if (!settings || method) return;
    if (settings.bkashEnabled !== false) setMethod('BKASH_MANUAL');
    else if (settings.codEnabled !== false) setMethod('COD');
  }, [settings, method]);

  useEffect(() => {
    if (method === 'COD') {
      onChange({ method: 'COD' });
    } else if (
      method === 'BKASH_MANUAL' &&
      payerReference.trim().length >= 5 &&
      providerPaymentId.trim().length >= 4
    ) {
      onChange({
        method: 'BKASH_MANUAL',
        payerReference: payerReference.trim(),
        providerPaymentId: providerPaymentId.trim(),
      });
    } else {
      onChange(null);
    }
  }, [method, payerReference, providerPaymentId, onChange]);

  if (!settings) return null;

  const bkashOn = settings.bkashEnabled !== false;
  const codOn = settings.codEnabled !== false;

  if (!bkashOn && !codOn) {
    return (
      <div className="card border-red-500/30 bg-red-500/5 text-sm text-red-600">
        Checkout is temporarily unavailable — no payment method is enabled. Please check back soon.
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="font-semibold">Payment method</div>

      <div className="grid sm:grid-cols-2 gap-3">
        {bkashOn && (
          <button
            type="button"
            onClick={() => setMethod('BKASH_MANUAL')}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-left transition-colors ${
              method === 'BKASH_MANUAL'
                ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/5'
                : 'border-[color:var(--border)]'
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            bKash (Send Money)
          </button>
        )}
        {codOn && (
          <button
            type="button"
            onClick={() => setMethod('COD')}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-left transition-colors ${
              method === 'COD'
                ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/5'
                : 'border-[color:var(--border)]'
            }`}
          >
            <Banknote className="w-4 h-4 shrink-0" />
            Cash on delivery
          </button>
        )}
      </div>

      {method === 'BKASH_MANUAL' && (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-[color:var(--fg-muted)] leading-relaxed">
            {settings.bkashInstructions ||
              `Open bKash → Send Money → send ${formatPrice(total, currency)} to ${
                settings.bkashNumber ?? 'our bKash number'
              } → enter the sender number and Transaction ID below.`}
          </p>
          <div>
            <span className="block text-xs font-medium text-[color:var(--fg-muted)] mb-1.5">
              Your bKash number
            </span>
            <input
              className="input"
              value={payerReference}
              onChange={(e) => setPayerReference(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div>
            <span className="block text-xs font-medium text-[color:var(--fg-muted)] mb-1.5">
              Transaction ID (TrxID)
            </span>
            <input
              className="input"
              value={providerPaymentId}
              onChange={(e) => setProviderPaymentId(e.target.value)}
              placeholder="e.g. 8N7A6C5D4E"
            />
          </div>
        </div>
      )}

      {method === 'COD' && (
        <p className="text-xs text-[color:var(--fg-muted)]">
          Pay {formatPrice(total, currency)} in cash when your order arrives.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the checkout page**

In `apps/web/src/app/(shop)/checkout/page.tsx`, add imports:

```tsx
import type {
  ShippingAddressInput,
  OrderSummary,
  PaymentInput,
} from '@drikon/shared-types';
import { CouponField, type CouponState } from '@/components/shop/coupon-field';
import { PaymentMethodField } from '@/components/shop/payment-method-field';
```

Add payment state right after the existing `coupon`/`onCoupon` state:

```tsx
  const [coupon, setCoupon] = useState<CouponState>({ code: null, discount: 0, freeShipping: false });
  const onCoupon = useCallback((s: CouponState) => setCoupon(s), []);

  const [payment, setPayment] = useState<PaymentInput | null>(null);
  const onPayment = useCallback((p: PaymentInput | null) => setPayment(p), []);
```

In `onSubmit`, add a guard right after the existing empty-cart check, and include `payment` in the `apiPost` body:

```tsx
  const onSubmit = async (address: ShippingAddressInput) => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    if (!payment) {
      toast.error('Please choose and complete a payment method');
      return;
    }
    try {
      const order = await apiPost<OrderSummary>('/api/v1/orders', {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingAddress: address,
        couponCode: couponCode ?? undefined,
        payment,
      });
```

Add the `<PaymentMethodField />` as a new card in the left column, right after the shipping-address `<div className="card space-y-4">...</div>` block and still inside the `<div className="space-y-4">` shipping-column wrapper:

```tsx
        {/* ── Shipping form ── */}
        <div className="space-y-4">
          <div className="card space-y-4">
            {/* ... existing shipping fields, unchanged ... */}
          </div>

          <PaymentMethodField total={total} currency={currency} onChange={onPayment} />
        </div>
```

Update the submit button's `disabled` condition and the footer note:

```tsx
          <button type="submit" disabled={isSubmitting || !payment} className="btn-primary w-full mt-5">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Place order <ArrowRight className="w-4 h-4" /></>}
          </button>
          <p className="text-[11px] text-[color:var(--fg-muted)] mt-3 text-center inline-flex items-center gap-1 justify-center w-full">
            <Lock className="w-3 h-3" />
            {payment?.method === 'BKASH_MANUAL'
              ? "We'll verify your payment and update your order shortly."
              : 'Your order is placed as soon as you submit.'}
          </p>
```

- [ ] **Step 3: Typecheck and build**

Run: `pnpm --filter web typecheck`
Expected: no errors.

Run: `pnpm --filter web build`
Expected: succeeds.

- [ ] **Step 4: Manual smoke check**

Start both apps (`pnpm --filter api dev` and `pnpm --filter web dev` — if the API can't boot due to the pre-existing `ConfigModule` issue noted in Task 1, note that and skip to a static/visual check of the page instead: `pnpm --filter web dev` alone, confirm the payment-method card renders without crashing even if the settings fetch fails, since `PaymentMethodField` falls back to `setSettings({})` on fetch failure). If the API is reachable: place one order with each method (bKash with a fake TrxID, and COD) and confirm both succeed and redirect to the order confirmation page.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shop/payment-method-field.tsx "apps/web/src/app/(shop)/checkout/page.tsx"
git commit -m "feat(web): checkout collects a payment method (bKash Send Money or COD)"
```

---

### Task 7: Order confirmation page — render payment state

**Files:**
- Modify: `apps/web/src/app/(account)/orders/[orderNumber]/page.tsx`

**Interfaces:**
- Consumes: `OrderSummary.payment` (Task 2); `GET /api/v1/orders/:orderNumber` (existing endpoint — now returns `payment` on the order object since `OrdersService.getByNumber` already does `include: { items: true, shippingAddress: true }` on a Prisma object and the global response interceptor passes it through as-is; no API change needed for this task, since `Payment?` is a real relation on `Order` — but it is **not currently included** in that query's `include`, so this task must add it).

- [ ] **Step 1: Include `payment` in the order-detail query**

This page's data comes from `OrdersService.getByNumber` in `apps/api/src/modules/orders/orders.service.ts`, which currently does:

```ts
    const order = await this.orders.findFirst({
      where: { orderNumber, userId },
      include: { items: true, shippingAddress: true },
    });
```

Change it to also include `payment`:

```ts
    const order = await this.orders.findFirst({
      where: { orderNumber, userId },
      include: { items: true, shippingAddress: true, payment: true },
    });
```

- [ ] **Step 2: Render payment status on the page**

In `apps/web/src/app/(account)/orders/[orderNumber]/page.tsx`, the `OrderDetail` interface already extends `OrderSummary` (which now has `payment?: OrderPaymentSummary | null` from Task 2) — no interface change needed here.

In the header block, right after the `<OrderStatusBadge status={order.status} className="text-xs px-3 py-1.5" />` line and before its closing `</div>`, add:

```tsx
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="display text-3xl">{order.orderNumber}</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">
            Placed {dateFmt.format(new Date(order.createdAt))}
          </p>
        </div>
        <div className="text-right">
          <OrderStatusBadge status={order.status} className="text-xs px-3 py-1.5" />
          {order.payment && (
            <p className="text-xs text-[color:var(--fg-muted)] mt-2">
              {order.payment.method === 'BKASH_MANUAL'
                ? order.payment.status === 'SUCCEEDED'
                  ? 'Payment verified ✓'
                  : order.payment.status === 'FAILED'
                    ? 'Payment verification failed — please contact support.'
                    : "Payment pending verification — we'll update this once confirmed."
                : order.payment.status === 'SUCCEEDED'
                  ? 'Paid on delivery ✓'
                  : `Pay ${formatPrice(order.total, order.currency)} in cash on delivery`}
            </p>
          )}
        </div>
      </div>
```

(This replaces the existing header `<div className="flex items-center justify-between flex-wrap gap-3 mb-8">...</div>` block — the `OrderStatusBadge` line is now wrapped in a `text-right` div alongside the new payment-status paragraph, instead of sitting bare at the top level.)

- [ ] **Step 3: Typecheck and build**

Run: `pnpm --filter api build` (for Step 1's service change)
Expected: succeeds.

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/orders/orders.service.ts "apps/web/src/app/(account)/orders/[orderNumber]/page.tsx"
git commit -m "feat: order confirmation page shows payment status"
```

---

### Task 8: Admin orders page — payment column + verify actions

**Files:**
- Modify: `apps/web/src/app/(admin)/admin/orders/page.tsx`

**Interfaces:**
- Consumes: `AdminService.listOrders`'s `payment` include (Task 5); `PATCH /api/v1/admin/orders/:id/payment` (Task 5).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Extend the `AdminOrder` interface and add a `verifyPayment` handler**

In `apps/web/src/app/(admin)/admin/orders/page.tsx`, update the `OrderStatus` import and the `AdminOrder` interface:

```tsx
import type { OrderStatus, PaymentMethod, PaymentStatus, Pagination } from '@drikon/shared-types';

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string | number;
  currency: string;
  createdAt: string;
  items: { id: string; quantity: number }[];
  user: { id: string; name: string; email: string };
  payment?: {
    method: PaymentMethod;
    status: PaymentStatus;
    providerPaymentId?: string | null;
    payerReference?: string | null;
  } | null;
}
```

Add a `verifyingId` state and `verifyPayment` handler right after the existing `changeStatus` function:

```tsx
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const verifyPayment = async (id: string, status: 'SUCCEEDED' | 'FAILED') => {
    setVerifyingId(id);
    try {
      await apiPatch(`/api/v1/admin/orders/${id}/payment`, { status });
      toast.success(status === 'SUCCEEDED' ? 'Payment marked paid' : 'Payment marked failed');
      load();
    } catch {
      toast.error('Could not update payment');
    } finally {
      setVerifyingId(null);
    }
  };
```

- [ ] **Step 2: Add the Payment column**

Add a `<th>` between "Status" and "Change" in the table header:

```tsx
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium text-right">Change</th>
```

Add the matching `<td>` in the row body, right after the existing status `<td>`:

```tsx
                    <td className="px-3 py-3"><OrderStatusBadge status={o.status} /></td>
                    <td className="px-3 py-3">
                      {o.payment ? (
                        <div className="space-y-1">
                          <div className="text-xs font-medium">
                            {o.payment.method === 'BKASH_MANUAL' ? 'bKash' : 'COD'} ·{' '}
                            {o.payment.status.charAt(0) + o.payment.status.slice(1).toLowerCase()}
                          </div>
                          {o.payment.method === 'BKASH_MANUAL' && o.payment.status === 'PENDING' && (
                            <div className="space-y-1">
                              <div className="text-[10px] text-[color:var(--fg-muted)]">
                                {o.payment.payerReference} · TrxID {o.payment.providerPaymentId}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => verifyPayment(o.id, 'SUCCEEDED')}
                                  disabled={verifyingId === o.id}
                                  className="btn-ghost !py-1 !px-2 text-[10px] text-emerald-600"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  type="button"
                                  onClick={() => verifyPayment(o.id, 'FAILED')}
                                  disabled={verifyingId === o.id}
                                  className="btn-ghost !py-1 !px-2 text-[10px] text-red-600"
                                >
                                  Mark Failed
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[color:var(--fg-muted)]">—</span>
                      )}
                    </td>
```

- [ ] **Step 3: Typecheck and build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(admin)/admin/orders/page.tsx"
git commit -m "feat(web): admin orders page shows payment status and can verify bKash payments"
```

---

### Task 9: Admin settings page — bKash/COD configuration

**Files:**
- Modify: `apps/api/src/modules/settings/dto/settings.dto.ts`
- Modify: `apps/web/src/app/(admin)/admin/settings/page.tsx`

**Interfaces:**
- Consumes: `SiteSettings`/`UpdateSettingsSchema` from `@drikon/shared-types` (Task 2); `PATCH /api/v1/settings` (existing endpoint, generic `SettingsModel.upsert` already persists any field on the DTO — no service-layer change needed, only the DTO's accepted-fields list).
- Produces: nothing consumed by later tasks — this is the last task.

- [ ] **Step 1: Add the 4 fields to the API-local `UpdateSettingsSchema`**

In `apps/api/src/modules/settings/dto/settings.dto.ts`, right after `socialInstagram: z.string().url().optional().or(z.literal('')),`, insert:

```ts
  socialInstagram: z.string().url().optional().or(z.literal('')),
  bkashNumber: text(30),
  bkashInstructions: text(300),
  bkashEnabled: z.boolean().optional(),
  codEnabled: z.boolean().optional(),
```

- [ ] **Step 2: Add the fields to the admin settings form's `reset()` defaults**

In `apps/web/src/app/(admin)/admin/settings/page.tsx`, in the `useEffect` that calls `reset({...})`, add the new fields right after `socialInstagram: s.socialInstagram ?? '',`:

```tsx
          socialInstagram: s.socialInstagram ?? '',
          bkashNumber: s.bkashNumber ?? '',
          bkashInstructions: s.bkashInstructions ?? '',
          bkashEnabled: s.bkashEnabled ?? true,
          codEnabled: s.codEnabled ?? true,
```

- [ ] **Step 3: Add the "Payments" section to the form**

Insert this new `<section>` right after the existing "Contact & social" `<section>` and before the "Homepage hero" `<section>`:

```tsx
        {/* Payments */}
        <section className="card space-y-5">
          <h2 className="font-semibold">Payments</h2>
          <p className="text-xs text-[color:var(--fg-muted)] -mt-3">
            Manual payment methods — no gateway integration yet. Toggle a method off to hide it at checkout.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="bKash number" error={errors.bkashNumber?.message}>
              <input className="input" {...register('bkashNumber')} placeholder="01XXXXXXXXX" />
            </Field>
            <Field label="bKash instructions (optional override)" error={errors.bkashInstructions?.message}>
              <input
                className="input"
                {...register('bkashInstructions')}
                placeholder="Leave blank to use the default instructions"
              />
            </Field>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" {...register('bkashEnabled')} />
              Accept bKash
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" {...register('codEnabled')} />
              Accept cash on delivery
            </label>
          </div>
        </section>
```

- [ ] **Step 4: Build**

Run: `pnpm --filter api build`
Expected: succeeds.

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: succeeds.

- [ ] **Step 5: Manual smoke check**

With both apps running (or per the same fallback noted in Task 6's Step 4 if the API can't boot), open the admin settings page, set a bKash number, toggle COD off, save, then reload the checkout page and confirm only bKash shows as an option.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/settings/dto/settings.dto.ts "apps/web/src/app/(admin)/admin/settings/page.tsx"
git commit -m "feat: admin can configure bKash number/instructions and toggle payment methods"
```

---

## Definition of Done

- All 9 tasks committed, in order, each with a green `pnpm --filter api build && pnpm --filter api test` (where `apps/api` was touched) and/or `pnpm --filter web typecheck && pnpm --filter web build` (where `apps/web` was touched).
- `pnpm --filter @drikon/shared-types typecheck` passes.
- Checkout requires a completed payment method before an order can be placed; the footer no longer says "Demo checkout — no payment is taken."
- Placing two bKash orders with the same Transaction ID is rejected with a clear error on the second one.
- An admin can see each order's payment method/status, verify a bKash payment as paid or failed, and see COD orders auto-marked paid when delivered.
- An admin can configure the bKash number/instructions and toggle either method off from the settings page, and checkout reflects that immediately.
- Next: the real gateway integration (SSLCommerz or similar) is a separate, future project — this plan's `Payment.method` enum and verification pattern are designed to extend to it without reworking existing orders (see the spec's "Extensibility" section).
