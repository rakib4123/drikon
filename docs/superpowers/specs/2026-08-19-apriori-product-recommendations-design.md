# Product Recommendations via Apriori Association Rule Mining — Design Spec

**Date:** 2026-08-19
**Status:** Approved for planning
**Driver:** The storefront has no purchase-history-driven recommendations today — the PDP's "You might also like" section is pure category matching, and cart/homepage have no suggestion surface at all. The goal is a genuine "customers who bought X also bought Y" system, built on the Apriori algorithm over real order data, surfaced on the product page, in the cart, and on the homepage for logged-in customers.

## Goal

Mine association rules from completed orders' line items using the Apriori algorithm (frequent-itemset mining with the downward-closure/apriori pruning property, not a shortcut pairwise count), store them, and use them to recommend products in three places:
1. **Product detail page** — "Frequently bought together" based on the single product being viewed.
2. **Cart** — "Add these too" based on everything currently in the cart (multi-item context).
3. **Homepage** — "Recommended for you" based on a logged-in customer's own purchase history.

## Non-goals

- No real-time/streaming rule updates. Rules are recomputed as a discrete admin-triggered action, not on every order.
- No scheduled/cron recomputation. The project has no job-scheduling infrastructure (removed as dead weight in an earlier cleanup pass); adding one is out of scope for this feature.
- No admin-tunable algorithm parameters (min support / min confidence / max itemset size) in v1. These are fixed constants in code. Can be exposed later if needed.
- No collaborative filtering, embeddings, or any ML beyond Apriori. This is explicitly an association-rule-mining feature per the request.
- No changes to `OrderStatus` or `PaymentStatus` semantics — recommendations only *read* order data, filtered by existing status values.
- No caching layer (Redis was already removed as an unused dependency). Rule lookups run as plain indexed Postgres queries, which is cheap enough at this data scale — this design must not reintroduce Redis or any other cache dependency.

## Data model changes

`apps/api/prisma/schema.prisma`:

**New model `ProductAssociationRule`:**
```prisma
model ProductAssociationRule {
  id             String   @id @default(cuid())
  antecedentIds  String[] // sorted product IDs, size 1-3 ("if bought these")
  antecedentSize Int      // = antecedentIds.length, denormalized for filtering
  consequentId   String
  consequent     Product  @relation(fields: [consequentId], references: [id], onDelete: Cascade)
  support        Float    // fraction of qualifying orders containing antecedent ∪ {consequent}
  confidence     Float    // support(antecedent ∪ consequent) / support(antecedent)
  lift           Float    // confidence / support({consequent})
  computedAt     DateTime @default(now())

  @@index([antecedentIds], type: Gin)
  @@index([consequentId])
}
```
`antecedentIds` uses a GIN index so lookups can use Postgres's array containment operator (`antecedentIds <@ $contextIds`) — "is this rule's antecedent a subset of what the customer currently has" — directly in SQL rather than pulling every rule into application code.

**New model `RecommendationRun`** — a small audit log for the admin UI, not consumed by the recommendation logic itself:
```prisma
model RecommendationRun {
  id             String   @id @default(cuid())
  ordersAnalyzed Int
  rulesGenerated Int
  computedAt     DateTime @default(now())
}
```

**Basket definition:** one basket = one `Order`'s distinct `productId`s, restricted to orders with `status IN (PAID, PROCESSING, SHIPPED, DELIVERED)` — real completed purchase intent, excluding `PENDING`/`CANCELLED`/`REFUNDED`.

## Algorithm

New module `apps/api/src/modules/recommendations/`, with `apriori.service.ts` as the core:

```
computeRules(baskets: Set<string>[]): AssociationRule[]
```

1. **Frequent itemset mining, level by level:**
   - `L1`: count each product's occurrence across baskets; keep items with support count `≥ MIN_SUPPORT`.
   - `Lk` (k = 2, 3): generate candidates by joining `Lk-1` itemsets that share `k-2` items, then prune any candidate that has an infrequent (k-1)-subset (the actual Apriori downward-closure property — not every pair/triple is even tried, only those whose sub-itemsets already survived). Count support for surviving candidates over the baskets; keep those `≥ MIN_SUPPORT`.
   - Stop after `L3` (`MAX_ITEMSET_SIZE = 3`).
2. **Rule generation:** for every frequent itemset of size ≥ 2, for every way to split it into a non-empty antecedent and a single-item consequent, compute `confidence = support(itemset) / support(antecedent)`. Keep rules with `confidence ≥ MIN_CONFIDENCE`. Compute `lift = confidence / support({consequent})`.
3. **Persist:** in a transaction, delete all existing `ProductAssociationRule` rows, bulk-insert the new set, and write one `RecommendationRun` row.

Constants (`apps/api/src/modules/recommendations/apriori.constants.ts`):
- `MIN_SUPPORT = 2` (absolute order count — more predictable than a percentage on a small/growing catalog)
- `MIN_CONFIDENCE = 0.3`
- `MAX_ITEMSET_SIZE = 3`

This is a pure function of `Set<string>[]` → rules, with no I/O inside it, which makes it directly unit-testable: `apriori.service.spec.ts` feeds hand-built synthetic baskets and asserts exact support/confidence/lift numbers on the output, the same way `apps/api/src/models/*.model.spec.ts` tests are structured today.

## API surface

New `RecommendationsModule` (`apps/api/src/modules/recommendations/`):

**Shared lookup**, `RecommendationsService.getRecommendations(contextProductIds: string[], excludeIds: string[], limit: number)`:
```sql
SELECT * FROM "ProductAssociationRule"
WHERE "antecedentIds" <@ $1::text[]
  AND "consequentId" != ALL($2::text[])
ORDER BY "antecedentSize" DESC, confidence DESC, lift DESC
```
Dedupe by `consequentId` (keep the highest-ranked rule per product), take the top `limit`, hydrate with `Product` rows (reusing the existing `ProductSummary` shape), return.

**Endpoints:**
- `GET /api/v1/recommendations/product/:productId` — public. Context = `[productId]`. Powers the PDP section.
- `POST /api/v1/recommendations/cart` — public, body `{ productIds: string[] }`. Context = cart contents. Powers the cart suggestion strip.
- `GET /api/v1/recommendations/me` — authenticated (existing JWT cookie guard). Context = the current user's distinct historically-purchased product IDs (queried from their own `Order`/`OrderItem` rows, same status filter as basket construction). Powers the homepage row. Returns an empty array for a user with no qualifying order history — the frontend simply doesn't render the section, no special-cased response shape.
- `POST /api/v1/admin/recommendations/recompute` — admin-only (same `RolesGuard` pattern as coupons/flash-sales/banners). Runs `AprioriService.computeRules` end-to-end, returns `{ ordersAnalyzed, rulesGenerated, computedAt }`.
- `GET /api/v1/admin/recommendations/status` — admin-only. Returns the latest `RecommendationRun` plus a preview list of the current top rules (product names via join, confidence, lift) for the admin status card.

All four public/authenticated endpoints go through the same `RecommendationsService.getRecommendations` helper with different context-building logic in the controller — no duplicated query logic.

## Frontend

**PDP** (`apps/web/src/app/(shop)/products/[slug]/page.tsx`): add `getFrequentlyBoughtTogether(productId)` alongside the existing `getRelated()`. Render order: try the recommendations result first; if it's empty, fall back to today's category-based `getRelated()` result — so a product with no purchase history yet still shows *something*, with zero visible regression from the current behavior. Both render through the existing `ProductGrid`/`ProductCard` components — no new UI primitives needed.

**Cart** (wherever the cart page/drawer lives today): a new small client component that debounced-POSTs the current cart's product IDs to `/recommendations/cart` whenever cart contents change, rendering results in a compact strip via `ProductGrid`. If the response is empty, the component renders nothing (no placeholder, no "no suggestions" message) — this is a new section with no prior behavior to preserve, so an empty state is simply invisible.

**Homepage:** a new server component section, gated on `isAuthenticated` (checked the same way other authenticated server-rendered content in this app already forwards the session cookie), fetching `/recommendations/me`. Renders only when the result is non-empty. Guests and no-history users never see this section at all — no fallback content stands in for it.

## Admin UI

New admin nav item, "Recommendations" (`apps/web/.../admin/recommendations/page.tsx`):
- Status card: last computed timestamp, orders analyzed, rules generated (from `GET .../status`).
- "Recompute now" button → `POST .../recompute`, then refetches status.
- A preview table below: antecedent product name(s) → consequent product name, confidence, lift — sorted by confidence, capped to a reasonable count (e.g. top 50) so the admin can sanity-check what the algorithm actually produced rather than trusting it blind.

## Seed data

Extend `apps/api/prisma/seed.ts` to create ~30–60 demo `Order` + `OrderItem` rows across several seeded customers, with deliberate co-purchase patterns (e.g. a phone consistently ordered alongside a case and a charger from the seed catalog), `status: PAID` or `DELIVERED` so they qualify as baskets for Apriori. The seed script does **not** call `AprioriService` itself — rule computation stays exclusively behind the admin "Recompute now" action, so there's one consistent path for "when do rules get (re)built," not two. The seed script's console output gets a line noting this (e.g. "Seeded N demo orders — click Recompute in the admin Recommendations page to generate rules").

## Extensibility

The rule table's shape (antecedent set → consequent, with support/confidence/lift) doesn't assume anything about *how* it was computed — a future move to a smarter algorithm or a scheduled recompute job would replace `AprioriService` internals or add a cron trigger without touching the schema, the lookup query, or any of the three frontend consumers. `MAX_ITEMSET_SIZE` is a constant, not hardcoded into the query shape, so raising it later (if the catalog grows enough for 4-item combinations to matter) is a one-line change.

## Testing

- `apriori.service.spec.ts` (new): synthetic basket sets with hand-computed expected frequent itemsets and rules — the core algorithm's correctness, in isolation, no database.
- `recommendations.service.spec.ts` (new, following the existing `PrismaService`-mocking pattern used in `apps/api/src/models/*.model.spec.ts`): asserts the containment-query call shape and dedupe/ranking logic.
- Live verification before merge (this codebase's established pattern — no e2e framework exists yet): boot the API and web apps, seed demo orders, trigger recompute via the admin endpoint, and confirm all three placements (PDP, cart, homepage) render real recommended products, plus confirm the PDP fallback still works for a product with no rules.

## Known limitations (post-implementation)

1. **Recompute scaling.** The Apriori recompute (`POST /recommendations/recompute`) runs synchronously within the HTTP request and its candidate-generation/support-counting is superlinear in catalog size (an absolute `MIN_SUPPORT = 2` means L1 grows with the catalog, and candidate generation + basket rescanning is roughly O(n²) per level). This is fine at the catalog sizes this project targets, but will need a relative support threshold and a backgrounded job (not a synchronous HTTP handler) before it scales to a catalog of, say, several thousand products. Inherited from this design's explicit non-goals (no admin-tunable parameters, no cron/scheduled infrastructure) — a deliberate v1 scope decision, not an oversight, but worth writing down before it's forgotten.
2. **Lookup query shape.** The lookup uses Prisma's `hasSome` (array overlap) as a pre-filter plus an in-memory full-subset check in application code, rather than a literal SQL `<@` (containment) query as originally sketched in this doc's API surface section. This is correct — overlap is a strict superset of containment, so there are no false negatives, and `hasSome` still uses the GIN index — and matches what the implementation plan actually specified. Recorded here because it's a real deviation from this design doc's illustrative SQL, and because it's the reason the candidate query needed a defensive `take` bound (see the recommendations.service.ts fix in the same commit that added this note).
