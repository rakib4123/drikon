# Manual Payment Methods (bKash Send Money + Cash on Delivery) — Design Spec

**Date:** 2026-08-18
**Status:** Approved for planning
**Driver:** Checkout currently takes no payment at all ("Demo checkout — no payment is taken"). The business is Bangladesh-based and needs real payment collection now; a full payment-gateway integration (Stripe/SSLCommerz/bKash Merchant API) is a separate, larger effort for later. For now: accept payment via a personal bKash "Send Money" number (manually verified by an admin) and Cash on Delivery.

## Goal

Let customers place real orders they actually pay for, using two methods that need no merchant/gateway approval:
1. **bKash (Send Money)** — customer sends the order total to a published personal bKash number via the bKash app's "Send Money" flow, then submits the sender number + Transaction ID (TrxID) at checkout. An admin manually verifies the transaction against their bKash app statement and marks the payment Paid or Failed.
2. **Cash on Delivery (COD)** — no payment collected at checkout; cash is collected when the order is delivered.

## Non-goals

- No real payment-gateway API integration (no Stripe, no SSLCommerz, no bKash Merchant/Payment API). That's a future, separate project once merchant approval exists — this design must not block it.
- No automatic payment verification. Matching a TrxID to bKash's actual transaction record requires bKash API access we don't have; verification is a manual admin action.
- No refund automation. Refunds (if ever needed) are handled outside the system for now; `PaymentStatus.REFUNDED` exists in the schema for record-keeping but nothing in this design triggers it automatically.
- No changes to `OrderStatus` semantics or values — the existing `PENDING → PROCESSING → SHIPPED → DELIVERED` (or `CANCELLED`) flow is untouched. Payment state is tracked independently on the `Payment` row.
- No stock-reservation redesign. Stock is decremented at order creation exactly as it is today (inside `OrderModel.createOrderTransaction`); an order awaiting bKash verification still holds its stock, same as today's "demo" orders do. Revisiting this (e.g. releasing stock if a bKash order is never verified) is out of scope.

## Data model changes

`apps/api/prisma/schema.prisma`:

**`Payment` model** — currently shaped for a gateway integration (`provider: String @default("stripe")`, `providerPaymentId`, `providerCustomerId`, `cardLast4`, `cardBrand`). Change:

- Rename/retype `provider: String` → `method: PaymentMethod` (new enum: `BKASH_MANUAL`, `COD`). Matches the existing convention in this schema, where `OrderStatus` and `PaymentStatus` are already real enums rather than strings. The `Payment` table has no real rows yet (nothing has ever created one — order creation today doesn't touch `Payment` at all), so this is a free rename with no migration-data concern.
- Keep `providerPaymentId` (already `@unique`) — reused to hold the customer-submitted bKash TrxID for `BKASH_MANUAL` payments (`null` for `COD`). The existing uniqueness constraint is a free fraud guard: two orders can't both claim the same TrxID.
- Add `payerReference String?` — the bKash sender's phone number, for `BKASH_MANUAL` only.
- Add `adminNote String?` — free-text note an admin can attach when verifying (e.g. "confirmed against bKash statement, ref #1234"; or a failure reason beyond the existing `failureReason` field, which stays as-is).
- Drop `providerCustomerId`, `cardLast4`, `cardBrand` — meaningless for either manual method, and easy to re-add if a real gateway is integrated later (that integration will define its own shape anyway).
- `PaymentStatus` enum is unchanged (`PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED`) — fits both methods: a `BKASH_MANUAL` payment starts `PENDING` until an admin verifies it; a `COD` payment starts `PENDING` and is set `SUCCEEDED` when the order is marked `DELIVERED` (cash and delivery happen together).
- `amount`/`currency` are copied from the order's `total`/`currency` at creation time, as already shaped.

**`SiteSettings` model** (singleton, already admin-editable) — add:
- `bkashNumber String?` — the published Send Money number.
- `bkashInstructions String?` — optional override text shown at checkout (falls back to a sensible default if unset).
- `bkashEnabled Boolean @default(true)`
- `codEnabled Boolean @default(true)`

Toggling either flag off hides that method from checkout without a deploy — useful if, say, the bKash number needs to change or COD needs to pause in a delivery area.

## Shared types package

`packages/shared-types/src/index.ts` mirrors the API's zod schemas and response shapes for the frontend (`CreateOrderSchema`, `OrderSummary`, `SiteSettings`, etc. all live there today, separate from — and slightly drifted from — the API-local copies in `apps/api/src/modules/*/dto/*.dto.ts`; e.g. the shared-types `CreateOrderSchema` is already missing the API's `couponCode` field). This design touches it too:
- Add the `payment` field to `CreateOrderSchema`/`CreateOrderInput`.
- Add `method`/`status`/`payerReference`/`trxId` (or equivalent) to `OrderSummary` so the order-confirmation and admin-orders pages can render payment state.
- Add `bkashNumber`/`bkashInstructions`/`bkashEnabled`/`codEnabled` to the `SiteSettings` interface.

## Order creation flow

Every order gets exactly one `Payment` row, created in the same transaction as the order (extends `OrderModel.createOrderTransaction`, which already creates the address + order + items + stock decrement + coupon redemption atomically).

**`POST /api/v1/orders`** (`CreateOrderDto`, both API-local and the mirrored `@drikon/shared-types` schema) gains a required `payment` field:

```ts
payment:
  | { method: 'BKASH_MANUAL'; payerReference: string; trxId: string }
  | { method: 'COD' }
```

Validation (zod, matching this codebase's existing DTO style):
- `trxId`: required, trimmed, reasonable length bound (bKash TrxIDs are short alphanumeric strings — validate format loosely, e.g. `min(4).max(30)`, rather than hardcoding bKash's exact format which could change).
- `payerReference`: required, same phone-format validation already used for `ShippingAddressSchema.phone`.
- Server-side: reject `BKASH_MANUAL` if `SiteSettings.bkashEnabled` is false, reject `COD` if `codEnabled` is false — defense in depth beyond just hiding the option in the UI.
- Server-side: reject a `trxId` that already exists on another `Payment` row (the `@unique` constraint enforces this at the DB level; the service layer should catch that constraint violation and return a clear "This transaction ID has already been used" error rather than a raw 500).

`OrdersService.create` builds the `Payment` sub-args alongside the existing order args and passes them into the (now-extended) `createOrderTransaction`, which creates both rows in one transaction. `Order.status` still starts `PENDING` regardless of method — no change there.

## Checkout page (`apps/web/.../checkout/page.tsx`)

Currently: shipping-address form + order summary + a single "Place order" submit, with the footer note "Demo checkout — no payment is taken." Add a **payment method** section between the shipping form and the submit button:

- Fetches `bkashEnabled`/`codEnabled`/`bkashNumber`/`bkashInstructions` from the existing public `GET /api/v1/settings` endpoint. This page is a client component (`'use client'`), so fetch it the same way it already fetches auth state — a plain `apiGet('/api/v1/settings')` call in a `useEffect` alongside the existing `fetchMe()` call — rather than the server-only cached `getSettings()` helper in `lib/settings.ts` (that helper's `react cache()` wrapper only dedupes within a server render and isn't meaningful called from client code). No new endpoint needed.
- Two selectable options, radio-style, styled consistently with the existing `.card` sections on this page. If only one method is enabled, skip the picker and pre-select it. If neither is enabled (misconfiguration), show a clear "Checkout is temporarily unavailable" state rather than letting the customer submit with no payment method.
- **bKash selected:** show the configured number, the order total, and instructions ("Open bKash → Send Money → send ৳{total} to {number} → copy the Transaction ID here"), then two required inputs (sender bKash number, Transaction ID) using the same `react-hook-form` + `zodResolver` pattern already used for the shipping form.
- **COD selected:** just a short confirmation line ("Pay ৳{total} in cash when your order arrives"), no extra inputs.
- Replace the "Demo checkout" footer note with method-appropriate copy (e.g. "Payment is verified manually — you'll see an update once it's confirmed" for bKash, or nothing extra for COD since there's nothing to verify upfront).
- On submit, include the `payment` object in the existing `apiPost('/api/v1/orders', ...)` call.
- Order confirmation (the existing `/orders/[orderNumber]` page) should reflect the payment state: "Payment pending verification" for an unverified `BKASH_MANUAL` payment, "Pay on delivery" for `COD`, "Paid" once verified/collected. This page already renders order status; it needs to also render `payment.status`/`payment.method` (already available since `Payment?` is now populated).

## Admin verification workflow

**Orders admin page** (`apps/web/.../admin/orders/page.tsx`, backed by `AdminService.listOrders`): add a payment column showing method + status (e.g. "bKash · Pending", "COD · Pending", "bKash · Paid"). `AdminService.listOrders`'s existing `include` needs `payment: true` added (the query already runs through `OrderModel.findManyAndCount`; no transactional-guarantee change, just a wider `include`).

**Per-order action**, for `BKASH_MANUAL` payments only, while `Payment.status === 'PENDING'`: a "Verify Payment" control showing the submitted `payerReference` and `trxId` (so the admin can cross-check their bKash app statement) with two actions:
- **Mark Paid** → `Payment.status = SUCCEEDED`, `paidAt = now()`. Does not force-change `Order.status` (an admin may still want to review the order before moving it to `PROCESSING`) — but bump `Order.status` from `PENDING` to `PROCESSING` automatically if it's still `PENDING`, since "payment confirmed" is the normal trigger to start fulfillment, matching how this admin already treats status transitions elsewhere.
- **Mark Failed** → `Payment.status = FAILED`, optional `adminNote`/`failureReason`. Order stays as-is; the admin separately cancels the order through the existing cancel/status-update action if appropriate — this design doesn't add a new "cancel because payment failed" special case.

For `COD` payments: no separate verification action. When an admin marks an order `DELIVERED` (existing action), also set that order's `Payment.status = SUCCEEDED` and `paidAt = now()` if it isn't already — one small addition to `AdminService.updateOrderStatus`, not a new endpoint.

**Admin settings page** (`apps/web/.../admin/settings/page.tsx`, backed by the existing `SiteSettings` singleton form): add the four new fields (`bkashNumber`, `bkashInstructions`, `bkashEnabled`, `codEnabled`) to the existing form and `UpdateSettingsSchema`, following the same field patterns already there (text inputs + a `text(max)` zod helper for the string fields, plain booleans for the toggles).

## Extensibility

`Payment.method` is a real enum but the shape (a `Payment` row per order, `PaymentStatus` lifecycle, admin verification pattern) generalizes: adding a real gateway later means a new enum value, a new integration module that creates/updates `Payment` rows programmatically instead of from user-submitted form fields, and — for gateways with webhooks — a webhook endpoint that does the same `Mark Paid`/`Mark Failed` transition the admin action does manually today. No rework of existing orders or the `Payment` table shape is needed to add that later.

## Testing

Follows this codebase's existing pattern (no e2e/integration tests exist yet anywhere in `apps/api`; per-Model unit tests mock `PrismaService` and assert delegation — see `apps/api/src/models/*.model.spec.ts`):
- `OrderModel.createOrderTransaction`'s extension (creating the `Payment` row) gets covered in `order.model.spec.ts` the same way its existing transaction steps are.
- `AdminService`'s new verify/mark-paid logic and the `updateOrderStatus` COD-auto-succeed addition get covered wherever `admin.service.ts`'s other logic is tested today (currently: nowhere — `admin.service.ts` has no dedicated spec file, consistent with the rest of this plan's non-goals around adding a first service-test suite). No new test-infrastructure decision needed here; follow whatever the implementation plan decides for `admin.service.ts` broadly, if anything.
