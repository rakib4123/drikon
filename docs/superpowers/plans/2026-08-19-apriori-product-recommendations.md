# Apriori Product Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mine "customers who bought X also bought Y" association rules from completed orders using the Apriori algorithm, and surface them on the product page, in the cart, and on the homepage.

**Architecture:** A new `RecommendationsModule` in the API follows this codebase's existing Model → Service → Controller layering. A pure, dependency-free `AprioriService` mines frequent itemsets (capped at size 3) and rules from basket data; `RecommendationsService` orchestrates loading baskets from Postgres, persisting rules, and looking them up via Prisma's array `hasSome` filter plus an in-memory subset check. Three new public/authenticated endpoints feed the three frontend placements; two admin-only endpoints trigger and inspect recomputation. The frontend adds one new section to the PDP, one new component on the cart page, one new client-only section on the homepage, and one new admin page.

**Tech Stack:** NestJS 11 + Prisma 5 + PostgreSQL (apps/api), Next.js 15 App Router + React 19 + Tailwind v4 + Zustand (apps/web), Jest for API unit tests.

**Spec:** [docs/superpowers/specs/2026-08-19-apriori-product-recommendations-design.md](../specs/2026-08-19-apriori-product-recommendations-design.md)

## Global Constraints

- No Redis or any caching layer — it was removed from this project as an unused dependency. Rule lookups are plain indexed Postgres queries.
- No cron/scheduler infrastructure — recomputation is triggered exclusively by an admin action, never automatically.
- Algorithm constants are fixed in code for v1, not admin-configurable: `MIN_SUPPORT = 2` (absolute order count), `MIN_CONFIDENCE = 0.3`, `MAX_ITEMSET_SIZE = 3`.
- Follow the existing Model → Service → Controller layering: thin Prisma-delegate-wrapping classes in `apps/api/src/models/`, registered in the `@Global()` `ModelsModule`; business logic in per-feature services; thin controllers.
- Auth/role gating uses the existing global guards via decorators only — `@Public()` to skip auth, `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` to require admin. Never add `@UseGuards(...)` per-controller; `JwtAuthGuard`/`RolesGuard` are already registered globally.
- DTOs are Zod schemas via `createZodDto` from `nestjs-zod`, validated by the global `ZodValidationPipe` already installed in `main.ts` — no per-route pipe needed.
- Frontend: Tailwind v4 tokens only (no new colors outside `@theme`/`:root`), Server Components by default, `'use client'` only on leaf components that need state/effects/Motion, pnpm only.
- Reuse `ProductGrid`/`ProductCard` for every recommendation surface — no new product-card UI.

---

## File Structure

**API (`apps/api/src`):**
- `models/product-association-rule.model.ts` (new) — Prisma delegate wrapper for `ProductAssociationRule`.
- `models/recommendation-run.model.ts` (new) — Prisma delegate wrapper for `RecommendationRun`.
- `models/models.module.ts` (modify) — register the two new models.
- `modules/recommendations/apriori.constants.ts` (new) — `MIN_SUPPORT`, `MIN_CONFIDENCE`, `MAX_ITEMSET_SIZE`.
- `modules/recommendations/apriori.service.ts` (new) — pure Apriori algorithm: `computeRules(baskets) -> AssociationRule[]`.
- `modules/recommendations/apriori.service.spec.ts` (new) — unit tests with hand-computed baskets.
- `modules/recommendations/recommendations.service.ts` (new) — basket loading, rule persistence, lookup, status.
- `modules/recommendations/recommendations.service.spec.ts` (new) — unit tests mocking the models.
- `modules/recommendations/dto/cart-recommendations.dto.ts` (new) — Zod DTO for `POST /recommendations/cart`.
- `modules/recommendations/recommendations.controller.ts` (new) — 5 routes (3 public/authenticated, 2 admin).
- `modules/recommendations/recommendations.module.ts` (new) — wires the above.
- `app.module.ts` (modify) — register `RecommendationsModule`.
- `prisma/schema.prisma` (modify) — add `ProductAssociationRule`, `RecommendationRun`, and `Product`'s reverse relation.
- `prisma/seed.ts` (modify) — add demo orders with deliberate co-purchase patterns.

**Web (`apps/web/src`):**
- `app/(shop)/products/[slug]/page.tsx` (modify) — add `getFrequentlyBoughtTogether`, render before/instead of the category fallback.
- `components/shop/cart-recommendations.tsx` (new) — client component, POSTs cart contents, renders results.
- `app/(shop)/cart/page.tsx` (modify) — render `<CartRecommendations />`.
- `components/shop/recommended-for-you.tsx` (new) — client component, authenticated-only homepage section.
- `app/page.tsx` (modify) — render `<RecommendedForYou />`.
- `app/(admin)/admin/recommendations/page.tsx` (new) — status card + recompute button + rules preview table.
- `components/admin/admin-sidebar.tsx` (modify) — add the "Recommendations" nav entry.

---

### Task 1: Prisma schema — association rule and run models

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Produces: `ProductAssociationRule` model (`id`, `antecedentIds: string[]`, `antecedentSize: number`, `consequentId: string`, `support/confidence/lift: number`, `computedAt: Date`), `RecommendationRun` model (`id`, `ordersAnalyzed: number`, `rulesGenerated: number`, `computedAt: Date`).

- [ ] **Step 1: Add the reverse relation to `Product`**

Open `apps/api/prisma/schema.prisma`, find the `Product` model's relation block (currently ends with `flashSales FlashSaleProduct[]` around line 250). Add one line directly after it:

```prisma
  flashSales      FlashSaleProduct[]
  associationRulesAsConsequent ProductAssociationRule[]
```

- [ ] **Step 2: Add the two new models**

Add this directly after the closing `}` of the `Product` model:

```prisma
model ProductAssociationRule {
  id             String   @id @default(cuid())
  antecedentIds  String[]
  antecedentSize Int
  consequentId   String
  consequent     Product  @relation(fields: [consequentId], references: [id], onDelete: Cascade)
  support        Float
  confidence     Float
  lift           Float
  computedAt     DateTime @default(now())

  @@index([antecedentIds], type: Gin)
  @@index([consequentId])
}

model RecommendationRun {
  id             String   @id @default(cuid())
  ordersAnalyzed Int
  rulesGenerated Int
  computedAt     DateTime @default(now())
}
```

- [ ] **Step 3: Generate and run the migration**

Run: `cd apps/api && pnpm exec prisma migrate dev --name add_product_recommendations`
Expected: migration created and applied without error; Prisma Client regenerated.

- [ ] **Step 4: Verify the client compiles**

Run: `pnpm --filter @drikon/api exec tsc --noEmit`
Expected: no errors (this only exercises generated-client types at this point, since nothing consumes the new models yet).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): add ProductAssociationRule and RecommendationRun models"
```

---

### Task 2: New Prisma-delegate models

**Files:**
- Create: `apps/api/src/models/product-association-rule.model.ts`
- Create: `apps/api/src/models/product-association-rule.model.spec.ts`
- Create: `apps/api/src/models/recommendation-run.model.ts`
- Create: `apps/api/src/models/recommendation-run.model.spec.ts`
- Modify: `apps/api/src/models/models.module.ts`

**Interfaces:**
- Consumes: Prisma Client types generated in Task 1 (`Prisma.ProductAssociationRuleFindManyArgs`, `Prisma.ProductAssociationRuleCreateManyInput`, `Prisma.RecommendationRunCreateArgs`).
- Produces: `ProductAssociationRuleModel.findMany(args)`, `ProductAssociationRuleModel.replaceAll(rules)`, `RecommendationRunModel.create(args)`, `RecommendationRunModel.findLatest()` — all consumed by `RecommendationsService` in Task 4.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/models/product-association-rule.model.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { ProductAssociationRuleModel } from './product-association-rule.model';

describe('ProductAssociationRuleModel', () => {
  let model: ProductAssociationRuleModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      productAssociationRule: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductAssociationRuleModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(ProductAssociationRuleModel);
  });

  it('findMany delegates to prisma.productAssociationRule.findMany', async () => {
    prisma.productAssociationRule.findMany.mockResolvedValue([{ id: 'r1' }]);
    const args = { where: { consequentId: 'p1' } };
    await expect(model.findMany(args as any)).resolves.toEqual([{ id: 'r1' }]);
    expect(prisma.productAssociationRule.findMany).toHaveBeenCalledWith(args);
  });

  it('replaceAll deletes all rows then bulk-inserts the new set, in one transaction', async () => {
    prisma.productAssociationRule.deleteMany.mockResolvedValue({ count: 5 });
    prisma.productAssociationRule.createMany.mockResolvedValue({ count: 2 });
    const rules = [
      { antecedentIds: ['a'], antecedentSize: 1, consequentId: 'b', support: 0.5, confidence: 0.5, lift: 1, computedAt: new Date() },
    ];
    await model.replaceAll(rules as any);
    expect(prisma.productAssociationRule.deleteMany).toHaveBeenCalledWith({});
    expect(prisma.productAssociationRule.createMany).toHaveBeenCalledWith({ data: rules });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
```

Create `apps/api/src/models/recommendation-run.model.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RecommendationRunModel } from './recommendation-run.model';

describe('RecommendationRunModel', () => {
  let model: RecommendationRunModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      recommendationRun: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationRunModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(RecommendationRunModel);
  });

  it('create delegates to prisma.recommendationRun.create', async () => {
    prisma.recommendationRun.create.mockResolvedValue({ id: 'run1' });
    const args = { data: { ordersAnalyzed: 10, rulesGenerated: 20 } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'run1' });
    expect(prisma.recommendationRun.create).toHaveBeenCalledWith(args);
  });

  it('findLatest orders by computedAt desc and takes the first', async () => {
    prisma.recommendationRun.findFirst.mockResolvedValue({ id: 'run1' });
    await expect(model.findLatest()).resolves.toEqual({ id: 'run1' });
    expect(prisma.recommendationRun.findFirst).toHaveBeenCalledWith({ orderBy: { computedAt: 'desc' } });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @drikon/api test -- product-association-rule.model.spec.ts recommendation-run.model.spec.ts`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement the models**

Create `apps/api/src/models/product-association-rule.model.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class ProductAssociationRuleModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.ProductAssociationRuleFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductAssociationRuleFindManyArgs>,
  ) {
    return this.prisma.productAssociationRule.findMany(args);
  }

  /** Atomically replaces the entire rule set with a freshly computed one. */
  async replaceAll(rules: Prisma.ProductAssociationRuleCreateManyInput[]) {
    return this.prisma.$transaction([
      this.prisma.productAssociationRule.deleteMany({}),
      this.prisma.productAssociationRule.createMany({ data: rules }),
    ]);
  }
}
```

Create `apps/api/src/models/recommendation-run.model.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class RecommendationRunModel {
  constructor(private readonly prisma: PrismaService) {}

  create<T extends Prisma.RecommendationRunCreateArgs>(args: Prisma.SelectSubset<T, Prisma.RecommendationRunCreateArgs>) {
    return this.prisma.recommendationRun.create(args);
  }

  findLatest() {
    return this.prisma.recommendationRun.findFirst({ orderBy: { computedAt: 'desc' } });
  }
}
```

- [ ] **Step 4: Register both in `ModelsModule`**

Modify `apps/api/src/models/models.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';
import { BrandModel } from './brand.model';
import { CategoryModel } from './category.model';
import { BannerModel } from './banner.model';
import { FlashSaleModel } from './flash-sale.model';
import { WishlistModel } from './wishlist.model';
import { SettingsModel } from './settings.model';
import { UserModel } from './user.model';
import { ProductAssociationRuleModel } from './product-association-rule.model';
import { RecommendationRunModel } from './recommendation-run.model';

const models = [
  ProductModel,
  OrderModel,
  ReviewModel,
  CouponModel,
  BrandModel,
  CategoryModel,
  BannerModel,
  FlashSaleModel,
  WishlistModel,
  SettingsModel,
  UserModel,
  ProductAssociationRuleModel,
  RecommendationRunModel,
];

@Global()
@Module({
  providers: models,
  exports: models,
})
export class ModelsModule {}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @drikon/api test -- product-association-rule.model.spec.ts recommendation-run.model.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models
git commit -m "feat(api): add ProductAssociationRule/RecommendationRun models"
```

---

### Task 3: Apriori algorithm (pure, no I/O)

**Files:**
- Create: `apps/api/src/modules/recommendations/apriori.constants.ts`
- Create: `apps/api/src/modules/recommendations/apriori.service.ts`
- Create: `apps/api/src/modules/recommendations/apriori.service.spec.ts`

**Interfaces:**
- Produces: `AssociationRule` type (`antecedentIds: string[]`, `antecedentSize: number`, `consequentId: string`, `support: number`, `confidence: number`, `lift: number`) and `AprioriService.computeRules(baskets: Set<string>[]): AssociationRule[]` — consumed by `RecommendationsService` in Task 4.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/recommendations/apriori.service.spec.ts`. This basket set is hand-computed: 5 orders over items A, B, C — `{A,B}` co-occurs 3×, `{A,C}` and `{B,C}` each 2×, the full triple `{A,B,C}` only 1× (below `MIN_SUPPORT`, so it must never appear), and a fourth item `D` appears exactly once (also below threshold, must never appear in any rule).

```ts
import { AprioriService } from './apriori.service';

describe('AprioriService', () => {
  let service: AprioriService;

  beforeEach(() => {
    service = new AprioriService();
  });

  it('returns no rules for zero baskets', () => {
    expect(service.computeRules([])).toEqual([]);
  });

  it('mines correct frequent-pair rules with exact support/confidence/lift', () => {
    const baskets: Set<string>[] = [
      new Set(['A', 'B']),
      new Set(['A', 'B']),
      new Set(['A', 'C']),
      new Set(['B', 'C']),
      new Set(['A', 'B', 'C']),
    ];

    const rules = service.computeRules(baskets);

    // {A,B,C} occurs once (< MIN_SUPPORT=2) so it must never be frequent —
    // no rule should have a 2-item antecedent.
    expect(rules.every((r) => r.antecedentSize === 1)).toBe(true);
    expect(rules).toHaveLength(6);

    const aToB = rules.find((r) => r.antecedentIds[0] === 'A' && r.consequentId === 'B')!;
    expect(aToB.support).toBeCloseTo(3 / 5, 5);
    expect(aToB.confidence).toBeCloseTo(3 / 4, 5);
    expect(aToB.lift).toBeCloseTo(0.75 / 0.8, 5);

    const cToA = rules.find((r) => r.antecedentIds[0] === 'C' && r.consequentId === 'A')!;
    expect(cToA.confidence).toBeCloseTo(2 / 3, 5);
  });

  it('excludes items below MIN_SUPPORT from every rule', () => {
    const baskets: Set<string>[] = [
      new Set(['A', 'B']),
      new Set(['A', 'B']),
      new Set(['A', 'D']), // D appears only once — must never be frequent
    ];

    const rules = service.computeRules(baskets);

    expect(rules.some((r) => r.antecedentIds.includes('D') || r.consequentId === 'D')).toBe(false);
  });

  it('mines a frequent 3-itemset into three 2-antecedent rules when support allows', () => {
    // {A,B,C} now occurs twice — clears MIN_SUPPORT=2.
    const baskets: Set<string>[] = [
      new Set(['A', 'B', 'C']),
      new Set(['A', 'B', 'C']),
      new Set(['A', 'B']),
    ];

    const rules = service.computeRules(baskets);
    const tripleRules = rules.filter((r) => r.antecedentSize === 2);
    expect(tripleRules).toHaveLength(3);

    const abToC = tripleRules.find(
      (r) => r.consequentId === 'C' && r.antecedentIds.sort().join() === ['A', 'B'].sort().join(),
    )!;
    // support({A,B,C})=2/3, support({A,B})=3/3=1 -> confidence = (2/3)/1 = 2/3
    expect(abToC.confidence).toBeCloseTo(2 / 3, 5);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @drikon/api test -- apriori.service.spec.ts`
Expected: FAIL — `./apriori.service` doesn't exist yet.

- [ ] **Step 3: Implement the constants**

Create `apps/api/src/modules/recommendations/apriori.constants.ts`:

```ts
/** Minimum number of qualifying orders an itemset must appear in to be "frequent". */
export const MIN_SUPPORT = 2;

/** Minimum confidence (support(antecedent ∪ consequent) / support(antecedent)) for a rule to be kept. */
export const MIN_CONFIDENCE = 0.3;

/** Largest itemset size mined — level-wise Apriori stops after this. */
export const MAX_ITEMSET_SIZE = 3;
```

- [ ] **Step 4: Implement the algorithm**

Create `apps/api/src/modules/recommendations/apriori.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { MIN_SUPPORT, MIN_CONFIDENCE, MAX_ITEMSET_SIZE } from './apriori.constants';

export interface AssociationRule {
  antecedentIds: string[];
  antecedentSize: number;
  consequentId: string;
  support: number;
  confidence: number;
  lift: number;
}

/** Canonical, order-independent key for an itemset. */
function key(ids: string[]): string {
  return [...ids].sort().join(' ');
}

function unkey(k: string): string[] {
  return k.split(' ');
}

function countSupport(ids: string[], baskets: Set<string>[]): number {
  let count = 0;
  for (const basket of baskets) {
    if (ids.every((id) => basket.has(id))) count += 1;
  }
  return count;
}

@Injectable()
export class AprioriService {
  /**
   * Level-wise Apriori: mine frequent itemsets up to MAX_ITEMSET_SIZE using the
   * downward-closure property (a candidate's every subset must already be
   * frequent), then generate single-consequent association rules from them.
   */
  computeRules(baskets: Set<string>[]): AssociationRule[] {
    const totalBaskets = baskets.length;
    if (totalBaskets === 0) return [];

    const itemCounts = new Map<string, number>();
    for (const basket of baskets) {
      for (const item of basket) {
        itemCounts.set(item, (itemCounts.get(item) ?? 0) + 1);
      }
    }

    let currentLevel = new Map<string, number>();
    for (const [item, count] of itemCounts) {
      if (count >= MIN_SUPPORT) currentLevel.set(key([item]), count);
    }

    const allFrequent = new Map<string, number>(currentLevel);

    let size = 1;
    while (currentLevel.size > 0 && size < MAX_ITEMSET_SIZE) {
      const candidates = this.generateCandidates(currentLevel, size);
      const nextLevel = new Map<string, number>();
      for (const candidateKey of candidates) {
        const support = countSupport(unkey(candidateKey), baskets);
        if (support >= MIN_SUPPORT) nextLevel.set(candidateKey, support);
      }
      for (const [k, v] of nextLevel) allFrequent.set(k, v);
      currentLevel = nextLevel;
      size += 1;
    }

    return this.generateRules(allFrequent, totalBaskets);
  }

  /** Joins same-size frequent itemsets and prunes any candidate with an infrequent subset. */
  private generateCandidates(prevLevel: Map<string, number>, size: number): Set<string> {
    const prevItemsets = [...prevLevel.keys()].map(unkey);
    const candidates = new Set<string>();

    for (let i = 0; i < prevItemsets.length; i++) {
      for (let j = i + 1; j < prevItemsets.length; j++) {
        const union = new Set([...prevItemsets[i], ...prevItemsets[j]]);
        if (union.size !== size + 1) continue;

        const candidateIds = [...union].sort();
        const allSubsetsFrequent = candidateIds.every((_, idx) => {
          const subset = candidateIds.filter((_, i2) => i2 !== idx);
          return prevLevel.has(key(subset));
        });
        if (allSubsetsFrequent) candidates.add(key(candidateIds));
      }
    }
    return candidates;
  }

  /** For every frequent itemset of size >= 2, one rule per choice of single-item consequent. */
  private generateRules(allFrequent: Map<string, number>, totalBaskets: number): AssociationRule[] {
    const rules: AssociationRule[] = [];

    for (const [itemsetKey, itemsetSupport] of allFrequent) {
      const ids = unkey(itemsetKey);
      if (ids.length < 2) continue;

      for (const consequentId of ids) {
        const antecedentIds = ids.filter((id) => id !== consequentId).sort();
        // Downward closure guarantees this subset was already found frequent.
        const antecedentSupport = allFrequent.get(key(antecedentIds))!;
        const confidence = itemsetSupport / antecedentSupport;
        if (confidence < MIN_CONFIDENCE) continue;

        const consequentSupport = allFrequent.get(key([consequentId]))!;
        const lift = confidence / (consequentSupport / totalBaskets);

        rules.push({
          antecedentIds,
          antecedentSize: antecedentIds.length,
          consequentId,
          support: itemsetSupport / totalBaskets,
          confidence,
          lift,
        });
      }
    }
    return rules;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @drikon/api test -- apriori.service.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/recommendations/apriori.constants.ts apps/api/src/modules/recommendations/apriori.service.ts apps/api/src/modules/recommendations/apriori.service.spec.ts
git commit -m "feat(api): implement Apriori association-rule mining"
```

---

### Task 4: RecommendationsService

**Files:**
- Create: `apps/api/src/modules/recommendations/recommendations.service.ts`
- Create: `apps/api/src/modules/recommendations/recommendations.service.spec.ts`

**Interfaces:**
- Consumes: `OrderModel.findMany` (Task 0/existing), `ProductModel.findMany` (existing), `ProductAssociationRuleModel.findMany`/`replaceAll` (Task 2), `RecommendationRunModel.create`/`findLatest` (Task 2), `AprioriService.computeRules` (Task 3).
- Produces: `RecommendationsService.loadBaskets(): Promise<Set<string>[]>`, `.getUserPurchaseHistory(userId: string): Promise<string[]>`, `.recompute(): Promise<{ordersAnalyzed, rulesGenerated, computedAt}>`, `.getRecommendations(contextIds: string[], excludeIds: string[], limit?: number): Promise<ProductRow[]>`, `.getStatus(): Promise<{lastRun, rules}>` — all consumed by `RecommendationsController` in Task 5.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/recommendations/recommendations.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { OrderModel } from '../../models/order.model';
import { ProductModel } from '../../models/product.model';
import { ProductAssociationRuleModel } from '../../models/product-association-rule.model';
import { RecommendationRunModel } from '../../models/recommendation-run.model';
import { AprioriService } from './apriori.service';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let orders: jest.Mocked<Pick<OrderModel, 'findMany'>>;
  let products: jest.Mocked<Pick<ProductModel, 'findMany'>>;
  let rules: jest.Mocked<Pick<ProductAssociationRuleModel, 'findMany' | 'replaceAll'>>;
  let runs: jest.Mocked<Pick<RecommendationRunModel, 'create' | 'findLatest'>>;
  let apriori: jest.Mocked<Pick<AprioriService, 'computeRules'>>;

  beforeEach(async () => {
    orders = { findMany: jest.fn() };
    products = { findMany: jest.fn() };
    rules = { findMany: jest.fn(), replaceAll: jest.fn() };
    runs = { create: jest.fn(), findLatest: jest.fn() };
    apriori = { computeRules: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: OrderModel, useValue: orders },
        { provide: ProductModel, useValue: products },
        { provide: ProductAssociationRuleModel, useValue: rules },
        { provide: RecommendationRunModel, useValue: runs },
        { provide: AprioriService, useValue: apriori },
      ],
    }).compile();

    service = module.get(RecommendationsService);
  });

  describe('loadBaskets', () => {
    it('queries only qualifying order statuses and returns one product-id Set per order', async () => {
      orders.findMany.mockResolvedValue([
        { items: [{ productId: 'a' }, { productId: 'b' }] },
        { items: [{ productId: 'a' }] },
      ] as any);

      const baskets = await service.loadBaskets();

      expect(orders.findMany).toHaveBeenCalledWith({
        where: { status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } },
        select: { items: { select: { productId: true } } },
      });
      expect(baskets).toEqual([new Set(['a', 'b']), new Set(['a'])]);
    });
  });

  describe('getUserPurchaseHistory', () => {
    it('returns distinct product ids across the user\'s qualifying orders', async () => {
      orders.findMany.mockResolvedValue([
        { items: [{ productId: 'a' }, { productId: 'b' }] },
        { items: [{ productId: 'a' }] },
      ] as any);

      const history = await service.getUserPurchaseHistory('user1');

      expect(orders.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1', status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } },
        select: { items: { select: { productId: true } } },
      });
      expect(history.sort()).toEqual(['a', 'b']);
    });
  });

  describe('recompute', () => {
    it('loads baskets, mines rules, replaces the rule table, and logs a run', async () => {
      orders.findMany.mockResolvedValue([{ items: [{ productId: 'a' }, { productId: 'b' }] }] as any);
      apriori.computeRules.mockReturnValue([
        { antecedentIds: ['a'], antecedentSize: 1, consequentId: 'b', support: 1, confidence: 1, lift: 1 },
      ]);
      runs.create.mockResolvedValue({ id: 'run1', ordersAnalyzed: 1, rulesGenerated: 1, computedAt: new Date() } as any);

      const result = await service.recompute();

      expect(rules.replaceAll).toHaveBeenCalledWith([
        expect.objectContaining({ antecedentIds: ['a'], consequentId: 'b', support: 1, confidence: 1, lift: 1 }),
      ]);
      expect(runs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ ordersAnalyzed: 1, rulesGenerated: 1 }),
      });
      expect(result.rulesGenerated).toBe(1);
    });
  });

  describe('getRecommendations', () => {
    it('returns [] without querying when contextIds is empty', async () => {
      const result = await service.getRecommendations([], [], 6);
      expect(result).toEqual([]);
      expect(rules.findMany).not.toHaveBeenCalled();
    });

    it('filters to rules whose full antecedent is contained in context, excludes given ids, dedupes by consequent, and hydrates products in ranked order', async () => {
      rules.findMany.mockResolvedValue([
        { antecedentIds: ['a', 'x'], consequentId: 'c1', confidence: 0.9 }, // 'x' not in context -> must be dropped
        { antecedentIds: ['a'], consequentId: 'c2', confidence: 0.5 },
        { antecedentIds: ['a'], consequentId: 'c2', confidence: 0.3 }, // lower-ranked duplicate for c2, must be ignored
        { antecedentIds: ['a'], consequentId: 'excluded', confidence: 0.99 },
      ] as any);
      products.findMany.mockResolvedValue([
        { id: 'c2', name: 'Product C2' },
      ] as any);

      const result = await service.getRecommendations(['a'], ['excluded'], 6);

      expect(rules.findMany).toHaveBeenCalledWith({
        where: { antecedentIds: { hasSome: ['a'] } },
        orderBy: [{ antecedentSize: 'desc' }, { confidence: 'desc' }, { lift: 'desc' }],
      });
      expect(products.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['c2'] }, isActive: true },
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
      });
      expect(result).toEqual([{ id: 'c2', name: 'Product C2' }]);
    });
  });

  describe('getStatus', () => {
    it('combines the latest run with a named preview of the top rules', async () => {
      runs.findLatest.mockResolvedValue({ ordersAnalyzed: 10, rulesGenerated: 3, computedAt: new Date('2026-01-01') } as any);
      rules.findMany.mockResolvedValue([
        { antecedentIds: ['a'], consequentId: 'b', confidence: 0.8, lift: 1.5 },
      ] as any);
      products.findMany.mockResolvedValue([
        { id: 'a', name: 'Product A' },
        { id: 'b', name: 'Product B' },
      ] as any);

      const status = await service.getStatus();

      expect(status.lastRun).toEqual(expect.objectContaining({ ordersAnalyzed: 10, rulesGenerated: 3 }));
      expect(status.rules).toEqual([
        { antecedentNames: ['Product A'], consequentName: 'Product B', confidence: 0.8, lift: 1.5 },
      ]);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @drikon/api test -- recommendations.service.spec.ts`
Expected: FAIL — `./recommendations.service` doesn't exist yet.

- [ ] **Step 3: Implement the service**

Create `apps/api/src/modules/recommendations/recommendations.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrderModel } from '../../models/order.model';
import { ProductModel } from '../../models/product.model';
import { ProductAssociationRuleModel } from '../../models/product-association-rule.model';
import { RecommendationRunModel } from '../../models/recommendation-run.model';
import { AprioriService } from './apriori.service';

const QUALIFYING_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];
const DEFAULT_LIMIT = 6;

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly orders: OrderModel,
    private readonly products: ProductModel,
    private readonly rules: ProductAssociationRuleModel,
    private readonly runs: RecommendationRunModel,
    private readonly apriori: AprioriService,
  ) {}

  async loadBaskets(): Promise<Set<string>[]> {
    const orders = await this.orders.findMany({
      where: { status: { in: QUALIFYING_STATUSES } },
      select: { items: { select: { productId: true } } },
    });
    return orders.map((o) => new Set(o.items.map((i) => i.productId)));
  }

  async getUserPurchaseHistory(userId: string): Promise<string[]> {
    const orders = await this.orders.findMany({
      where: { userId, status: { in: QUALIFYING_STATUSES } },
      select: { items: { select: { productId: true } } },
    });
    const ids = new Set<string>();
    for (const o of orders) for (const i of o.items) ids.add(i.productId);
    return [...ids];
  }

  async recompute() {
    const baskets = await this.loadBaskets();
    const computed = this.apriori.computeRules(baskets);
    const computedAt = new Date();

    await this.rules.replaceAll(
      computed.map((r) => ({
        antecedentIds: r.antecedentIds,
        antecedentSize: r.antecedentSize,
        consequentId: r.consequentId,
        support: r.support,
        confidence: r.confidence,
        lift: r.lift,
        computedAt,
      })),
    );

    const run = await this.runs.create({
      data: { ordersAnalyzed: baskets.length, rulesGenerated: computed.length, computedAt },
    });
    return { ordersAnalyzed: run.ordersAnalyzed, rulesGenerated: run.rulesGenerated, computedAt: run.computedAt };
  }

  /** Top recommended products whose triggering rule's antecedent is fully covered by `contextIds`. */
  async getRecommendations(contextIds: string[], excludeIds: string[], limit: number = DEFAULT_LIMIT) {
    if (contextIds.length === 0) return [];

    const candidates = await this.rules.findMany({
      where: { antecedentIds: { hasSome: contextIds } },
      orderBy: [{ antecedentSize: 'desc' }, { confidence: 'desc' }, { lift: 'desc' }],
    });

    const exclude = new Set(excludeIds);
    const bestByConsequent = new Map<string, (typeof candidates)[number]>();
    for (const rule of candidates) {
      if (exclude.has(rule.consequentId)) continue;
      if (bestByConsequent.has(rule.consequentId)) continue;
      if (!rule.antecedentIds.every((id) => contextIds.includes(id))) continue;
      bestByConsequent.set(rule.consequentId, rule);
    }

    const rankedIds = [...bestByConsequent.keys()].slice(0, limit);
    if (rankedIds.length === 0) return [];

    const productRows = await this.products.findMany({
      where: { id: { in: rankedIds }, isActive: true },
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });
    const byId = new Map(productRows.map((p) => [p.id, p]));
    return rankedIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  }

  async getStatus() {
    const lastRun = await this.runs.findLatest();
    const topRules = await this.rules.findMany({
      orderBy: [{ confidence: 'desc' }, { lift: 'desc' }],
      take: 50,
    });

    const involvedIds = new Set<string>();
    for (const r of topRules) {
      for (const a of r.antecedentIds) involvedIds.add(a);
      involvedIds.add(r.consequentId);
    }
    const products = await this.products.findMany({
      where: { id: { in: [...involvedIds] } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    return {
      lastRun: lastRun
        ? { computedAt: lastRun.computedAt, ordersAnalyzed: lastRun.ordersAnalyzed, rulesGenerated: lastRun.rulesGenerated }
        : null,
      rules: topRules.map((r) => ({
        antecedentNames: r.antecedentIds.map((id) => nameById.get(id) ?? 'Unknown product'),
        consequentName: nameById.get(r.consequentId) ?? 'Unknown product',
        confidence: r.confidence,
        lift: r.lift,
      })),
    };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @drikon/api test -- recommendations.service.spec.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/recommendations/recommendations.service.ts apps/api/src/modules/recommendations/recommendations.service.spec.ts
git commit -m "feat(api): add RecommendationsService (lookup, recompute, status)"
```

---

### Task 5: DTO, controller, module wiring

**Files:**
- Create: `apps/api/src/modules/recommendations/dto/cart-recommendations.dto.ts`
- Create: `apps/api/src/modules/recommendations/recommendations.controller.ts`
- Create: `apps/api/src/modules/recommendations/recommendations.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `RecommendationsService` (Task 4), `CurrentUser`/`Public`/`Roles` decorators (existing, `apps/api/src/common/decorators`).
- Produces: `GET /api/v1/recommendations/product/:productId`, `POST /api/v1/recommendations/cart`, `GET /api/v1/recommendations/me`, `POST /api/v1/recommendations/recompute`, `GET /api/v1/recommendations/status` — consumed by the frontend in Tasks 8–11.

- [ ] **Step 1: Create the DTO**

Create `apps/api/src/modules/recommendations/dto/cart-recommendations.dto.ts`:

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CartRecommendationsSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(50),
});
export class CartRecommendationsDto extends createZodDto(CartRecommendationsSchema) {}
```

- [ ] **Step 2: Create the controller**

Create `apps/api/src/modules/recommendations/recommendations.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RecommendationsService } from './recommendations.service';
import { CartRecommendationsDto } from './dto/cart-recommendations.dto';
import { CurrentUser, Public, Roles } from '../../common/decorators';

const DEFAULT_LIMIT = 6;

@ApiTags('recommendations')
@Controller({ path: 'recommendations', version: '1' })
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Frequently-bought-together recommendations for one product' })
  forProduct(@Param('productId') productId: string) {
    return this.recommendations.getRecommendations([productId], [productId], DEFAULT_LIMIT);
  }

  @Public()
  @Post('cart')
  @ApiOperation({ summary: 'Recommendations based on current cart contents' })
  forCart(@Body() dto: CartRecommendationsDto) {
    return this.recommendations.getRecommendations(dto.productIds, dto.productIds, DEFAULT_LIMIT);
  }

  @Get('me')
  @ApiOperation({ summary: "Recommendations based on the current user's purchase history" })
  async forMe(@CurrentUser('id') userId: string) {
    const history = await this.recommendations.getUserPurchaseHistory(userId);
    if (history.length === 0) return [];
    return this.recommendations.getRecommendations(history, history, DEFAULT_LIMIT);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('recompute')
  @ApiOperation({ summary: '(Admin) Recompute association rules from current order history' })
  recompute() {
    return this.recommendations.recompute();
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('status')
  @ApiOperation({ summary: '(Admin) Latest recompute status and a preview of top rules' })
  status() {
    return this.recommendations.getStatus();
  }
}
```

- [ ] **Step 3: Create the module**

Create `apps/api/src/modules/recommendations/recommendations.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { AprioriService } from './apriori.service';

@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationsService, AprioriService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
```

- [ ] **Step 4: Register the module in `AppModule`**

Modify `apps/api/src/app.module.ts` — add the import alongside the other feature modules and to the `imports` array (after `BannersModule`, before `AdminModule`):

```ts
import { BannersModule } from './modules/banners/banners.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { AdminModule } from './modules/admin/admin.module';
```

```ts
    BannersModule,
    RecommendationsModule,
    AdminModule,
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @drikon/api exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Live-verify the endpoints**

Ensure `apps/api/.env` is set (copy from an existing local setup if needed), then:

Run: `pnpm --filter @drikon/api exec prisma generate && lsof -ti :4000 | xargs -r kill -9; pnpm --filter @drikon/api dev &`

Wait for "Nest application successfully started" in the output, then:

```bash
curl -s -X POST http://localhost:4000/api/v1/recommendations/recompute \
  -H "Content-Type: application/json" -b /tmp/admin-cookies.txt -c /tmp/admin-cookies.txt
```
Expected: `401` (no admin session yet) — confirms the route is guarded, not open. This is sufficient proof at this stage; full authenticated verification (admin login → recompute → see rules) happens in Task 12 once seed data and the frontend both exist.

```bash
curl -s http://localhost:4000/api/v1/recommendations/product/nonexistent-id
```
Expected: `200` with `{"success":true,"data":[]}` — confirms the public route works and returns an empty array for a product with no rules yet.

Stop the dev server: `lsof -ti :4000 | xargs -r kill -9`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/recommendations/dto apps/api/src/modules/recommendations/recommendations.controller.ts apps/api/src/modules/recommendations/recommendations.module.ts apps/api/src/app.module.ts
git commit -m "feat(api): wire recommendations controller and module"
```

---

### Task 6: Seed demo orders

**Files:**
- Modify: `apps/api/prisma/seed.ts`

**Interfaces:**
- Consumes: the four existing seeded products (`iphone-15-pro-titanium`, `samsung-galaxy-s24-ultra`, `spigen-core-armor-iphone-15-pro`, `anker-maggo-power-bank-10k`), the existing `demo@drikon.com` customer.
- Produces: ~31 `DELIVERED` orders in the database with deliberate co-purchase patterns, each with a `Payment` row — consumed by `RecommendationsService.loadBaskets()` once an admin clicks "Recompute".

- [ ] **Step 1: Add the seed logic**

Modify `apps/api/prisma/seed.ts`. First, update the import line to pull in the additional enums:

```ts
import { PrismaClient, Role, Prisma, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
```

Then, insert this block directly after the existing `console.log(`  ✓ products (${products.length})`);` line (before the final "Seed complete" logging):

```ts
  // ─── Demo orders (for the Apriori-based recommendations feature) ───
  // Deliberate co-purchase patterns so Apriori has real signal to mine:
  //   iPhone + Case + Power bank bundle together often (strong 3-way rule),
  //   iPhone + Case pair even more often (case is iPhone-specific),
  //   Galaxy + Power bank pair independently, plus some solo purchases as noise.
  const iphone = await prisma.product.findUniqueOrThrow({ where: { slug: 'iphone-15-pro-titanium' } });
  const galaxy = await prisma.product.findUniqueOrThrow({ where: { slug: 'samsung-galaxy-s24-ultra' } });
  const spigenCase = await prisma.product.findUniqueOrThrow({ where: { slug: 'spigen-core-armor-iphone-15-pro' } });
  const powerBank = await prisma.product.findUniqueOrThrow({ where: { slug: 'anker-maggo-power-bank-10k' } });

  let demoAddress = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!demoAddress) {
    demoAddress = await prisma.address.create({
      data: {
        userId: customer.id,
        fullName: 'Demo Customer',
        phone: '+8801711000000',
        line1: 'House 12, Road 5, Banani',
        city: 'Dhaka',
        postalCode: '1213',
        country: 'Bangladesh',
      },
    });
  }

  const basketPatterns: { products: typeof iphone[]; count: number }[] = [
    { products: [iphone, spigenCase, powerBank], count: 8 },
    { products: [iphone, spigenCase], count: 5 },
    { products: [galaxy, powerBank], count: 6 },
    { products: [iphone], count: 4 },
    { products: [galaxy], count: 3 },
    { products: [powerBank], count: 3 },
    { products: [spigenCase], count: 2 },
  ];

  let orderSeq = 1;
  let ordersCreated = 0;
  for (const pattern of basketPatterns) {
    for (let i = 0; i < pattern.count; i++) {
      const orderNumber = `DEMO-${String(orderSeq).padStart(4, '0')}`;
      orderSeq += 1;

      const existing = await prisma.order.findUnique({ where: { orderNumber } });
      if (existing) continue;

      const lines = pattern.products.map((p) => ({
        productId: p.id,
        productName: p.name,
        productImage: null,
        unitPrice: p.price,
        quantity: 1,
        lineTotal: p.price,
      }));
      const total = lines.reduce((sum, l) => sum.add(l.lineTotal), new Prisma.Decimal(0));

      await prisma.order.create({
        data: {
          orderNumber,
          userId: customer.id,
          status: OrderStatus.DELIVERED,
          subtotal: total,
          shipping: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(0),
          discount: new Prisma.Decimal(0),
          total,
          currency: 'BDT',
          shippingAddressId: demoAddress.id,
          items: { create: lines },
          payment: {
            create: {
              method: PaymentMethod.COD,
              status: PaymentStatus.SUCCEEDED,
              amount: total,
              currency: 'BDT',
              paidAt: new Date(),
            },
          },
        },
      });
      ordersCreated += 1;
    }
  }

  console.log(`  ✓ demo orders (${ordersCreated}) — click "Recompute" on the admin Recommendations page to generate rules`);
```

- [ ] **Step 2: Run the seed**

Run: `pnpm --filter @drikon/api db:seed`
Expected: output includes `✓ demo orders (31) — click "Recompute" ...` (or fewer if some `DEMO-XXXX` order numbers already existed from a prior partial run — the `findUnique` guard makes this idempotent).

- [ ] **Step 3: Verify basket data directly**

Run: `pnpm --filter @drikon/api exec prisma studio` (or a one-off script) is optional; a lighter check:

```bash
pnpm --filter @drikon/api exec node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.order.count({ where: { orderNumber: { startsWith: 'DEMO-' } } }).then((n) => { console.log('demo orders:', n); p.\$disconnect(); });
"
```
Expected: `demo orders: 31`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): seed demo orders with co-purchase patterns for recommendations"
```

---

### Task 7: PDP — frequently bought together

**Files:**
- Modify: `apps/web/src/app/(shop)/products/[slug]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/recommendations/product/:productId` (Task 5), existing `getRelated` function, existing `ProductGrid` component.

- [ ] **Step 1: Add the fetch function and use it before the fallback**

Modify `apps/web/src/app/(shop)/products/[slug]/page.tsx`. Add this function directly after the existing `getRelated` function (around line 86):

```ts
async function getFrequentlyBoughtTogether(productId: string): Promise<ProductSummary[]> {
  try {
    return await apiGet<ProductSummary[]>(`/api/v1/recommendations/product/${productId}`);
  } catch {
    return [];
  }
}
```

Then, in `ProductDetailPage`, replace the single `const related = await getRelated(...)` line with both fetches and a merged result:

```ts
  const frequentlyBoughtTogether = await getFrequentlyBoughtTogether(product.id);
  const related =
    frequentlyBoughtTogether.length > 0
      ? frequentlyBoughtTogether
      : await getRelated(product.category.slug, product.id);
```

Finally, update the section heading to reflect which source is actually showing (find the existing `{related.length > 0 && (...)}` block near the end of the file):

```tsx
      {related.length > 0 && (
        <section>
          <h2 className="display text-2xl mb-6">
            {frequentlyBoughtTogether.length > 0 ? 'Frequently bought together' : 'You might also like'}
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(shop)/products/[slug]/page.tsx"
git commit -m "feat(web): show frequently-bought-together on the product page"
```

---

### Task 8: Cart — "add these too"

**Files:**
- Create: `apps/web/src/components/shop/cart-recommendations.tsx`
- Modify: `apps/web/src/app/(shop)/cart/page.tsx`

**Interfaces:**
- Consumes: `POST /api/v1/recommendations/cart` (Task 5), `useCartStore` (existing, `@/store/cart-store`), `ProductGrid` (existing).

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/shop/cart-recommendations.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { ProductSummary } from '@drikon/shared-types';
import { apiPost } from '@/lib/api-client';
import { useCartStore } from '@/store/cart-store';
import { ProductGrid } from './product-grid';

export function CartRecommendations() {
  const productIds = useCartStore((s) => s.items.map((i) => i.productId));
  const [recommendations, setRecommendations] = useState<ProductSummary[]>([]);
  const key = productIds.slice().sort().join(',');

  useEffect(() => {
    if (productIds.length === 0) {
      setRecommendations([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = await apiPost<ProductSummary[]>('/api/v1/recommendations/cart', { productIds });
        if (!cancelled) setRecommendations(data);
      } catch {
        if (!cancelled) setRecommendations([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (recommendations.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="display text-2xl mb-6">Add these too</h2>
      <ProductGrid products={recommendations} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" />
    </section>
  );
}
```

- [ ] **Step 2: Render it on the cart page**

Modify `apps/web/src/app/(shop)/cart/page.tsx` — add the import:

```tsx
import { CartRecommendations } from '@/components/shop/cart-recommendations';
```

And render it after the closing `</div>` of the `grid lg:grid-cols-[1fr_360px]` block, still inside the page's outer `<div className="max-w-5xl ...">`:

```tsx
      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        {/* ...existing items + summary... */}
      </div>

      <CartRecommendations />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/shop/cart-recommendations.tsx "apps/web/src/app/(shop)/cart/page.tsx"
git commit -m "feat(web): add cart recommendations strip"
```

---

### Task 9: Homepage — "Recommended for you"

**Files:**
- Create: `apps/web/src/components/shop/recommended-for-you.tsx`
- Modify: `apps/web/src/app/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/recommendations/me` (Task 5), `useAuthStore` (existing, `@/store/auth-store`), `ProductGrid` (existing).

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/shop/recommended-for-you.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProductSummary } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { ProductGrid } from './product-grid';

export function RecommendedForYou() {
  const { user, initialized, fetchMe } = useAuthStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<ProductSummary[]>('/api/v1/recommendations/me');
        if (!cancelled) setProducts(data);
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="flex items-end justify-between mb-10 gap-6">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
            For you
          </div>
          <h2 className="display text-3xl md:text-4xl">Recommended for you</h2>
        </div>
        <Link href="/products" className="text-sm font-medium hover:text-[color:var(--accent)] transition-colors inline-flex items-center gap-1">
          Shop all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
```

- [ ] **Step 2: Render it on the homepage**

Modify `apps/web/src/app/page.tsx` — add the import:

```tsx
import { RecommendedForYou } from '@/components/shop/recommended-for-you';
```

Render it directly after the "FEATURED PRODUCTS" `</section>` and before the "TRUSTED BRANDS" comment:

```tsx
      </section>

      {/* ─── RECOMMENDED FOR YOU (logged-in customers with order history only) ─── */}
      <RecommendedForYou />

      {/* ─── TRUSTED BRANDS ─── */}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/shop/recommended-for-you.tsx apps/web/src/app/page.tsx
git commit -m "feat(web): add homepage recommended-for-you section"
```

---

### Task 10: Admin recommendations page

**Files:**
- Create: `apps/web/src/app/(admin)/admin/recommendations/page.tsx`
- Modify: `apps/web/src/components/admin/admin-sidebar.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/recommendations/status`, `POST /api/v1/recommendations/recompute` (Task 5).

- [ ] **Step 1: Add the nav entry**

Modify `apps/web/src/components/admin/admin-sidebar.tsx` — add `Sparkles` to the `lucide-react` import list and one new `NAV` entry directly after `Flash sales`:

```tsx
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Tag,
  Star,
  Users,
  Ticket,
  Zap,
  Sparkles,
  GalleryHorizontalEnd,
  Settings as SettingsIcon,
} from 'lucide-react';
```

```tsx
  { href: '/admin/flash-sales', label: 'Flash sales', icon: Zap },
  { href: '/admin/recommendations', label: 'Recommendations', icon: Sparkles },
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
```

- [ ] **Step 2: Create the page**

Create `apps/web/src/app/(admin)/admin/recommendations/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';

interface RuleSummary {
  antecedentNames: string[];
  consequentName: string;
  confidence: number;
  lift: number;
}
interface RecommendationStatus {
  lastRun: { computedAt: string; ordersAnalyzed: number; rulesGenerated: number } | null;
  rules: RuleSummary[];
}

export default function AdminRecommendationsPage() {
  const [status, setStatus] = useState<RecommendationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const load = async () => {
    try {
      setStatus(await apiGet<RecommendationStatus>('/api/v1/recommendations/status'));
    } catch {
      toast.error('Failed to load recommendation status');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const recompute = async () => {
    setRecomputing(true);
    try {
      await apiPost('/api/v1/recommendations/recompute');
      toast.success('Recommendations recomputed');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Recompute failed');
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-5xl">
      <h1 className="display text-3xl mb-1">Recommendations</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">
        Association rules mined from completed orders — powers &quot;frequently bought together&quot;, cart suggestions, and the homepage recommendations.
      </p>

      <div className="card mb-8 flex items-center justify-between gap-6 flex-wrap">
        <div className="text-sm">
          {loading ? (
            <span className="text-[color:var(--fg-muted)]">Loading…</span>
          ) : status?.lastRun ? (
            <>
              <div className="font-medium">
                Last computed {new Date(status.lastRun.computedAt).toLocaleString()}
              </div>
              <div className="text-[color:var(--fg-muted)]">
                {status.lastRun.ordersAnalyzed} orders analyzed · {status.lastRun.rulesGenerated} rules generated
              </div>
            </>
          ) : (
            <span className="text-[color:var(--fg-muted)]">Never computed yet.</span>
          )}
        </div>
        <button onClick={recompute} disabled={recomputing} className="btn-primary">
          {recomputing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4" /> Recompute now</>}
        </button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" /></div>
        ) : !status || status.rules.length === 0 ? (
          <div className="py-16 text-center text-sm text-[color:var(--fg-muted)]">
            No rules yet — click &quot;Recompute now&quot; once there&apos;s completed order history.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-xs text-[color:var(--fg-muted)]">
                <th className="px-5 py-3 font-medium">If bought</th>
                <th className="px-5 py-3 font-medium">Then recommend</th>
                <th className="px-5 py-3 font-medium">Confidence</th>
                <th className="px-5 py-3 font-medium">Lift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {status.rules.map((r, i) => (
                <tr key={i}>
                  <td className="px-5 py-2.5">{r.antecedentNames.join(' + ')}</td>
                  <td className="px-5 py-2.5 font-medium">{r.consequentName}</td>
                  <td className="px-5 py-2.5">{(r.confidence * 100).toFixed(0)}%</td>
                  <td className="px-5 py-2.5">{r.lift.toFixed(2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(admin\)/admin/recommendations apps/web/src/components/admin/admin-sidebar.tsx
git commit -m "feat(web): add admin recommendations page"
```

---

### Task 11: End-to-end live verification

**Files:** none (verification only; fix forward in the relevant file from Tasks 1–10 if something's broken).

- [ ] **Step 1: Fresh boot**

```bash
lsof -ti :3000,:4000 | xargs -r kill -9
pnpm --filter @drikon/api exec prisma generate
pnpm --filter @drikon/api dev &
pnpm --filter web dev &
```
Wait for both "Nest application successfully started" and "Ready in ...ms".

- [ ] **Step 2: Confirm demo orders and rules**

Log in as the seeded admin (`admin@drikon.com` / the `SEED_ADMIN_PASSWORD` env value or `Admin@drikon2026` default) through the web UI at `http://localhost:3000/admin`, navigate to **Recommendations**, and click **Recompute now**.
Expected: status card shows "31 orders analyzed" and a non-zero rule count; the table below lists rows including `iPhone 15 Pro Titanium + Spigen Core Armor Case → Anker MagGo Power Bank (10K)` with confidence and lift values.

- [ ] **Step 3: Verify the PDP**

Visit `http://localhost:3000/products/iphone-15-pro-titanium`.
Expected: a "Frequently bought together" section (not "You might also like") showing the Spigen case and/or Anker power bank.

- [ ] **Step 4: Verify the PDP fallback**

The current seed catalog has only 4 products, and all 4 participate in the seeded co-purchase patterns (Task 6), so every one of them will have at least one rule after recompute — none will hit the fallback branch live in this environment. Verify the fallback by code review instead: re-read the ternary added in Task 7 Step 1 and confirm `related` falls back to `getRelated(...)` whenever `frequentlyBoughtTogether` is empty — e.g. by temporarily commenting out the demo-order seeding or checking behavior before the first "Recompute" is ever clicked, where every product legitimately has zero rules and the existing "You might also like" heading/content must still render exactly as it did before this feature.
Expected: before any recompute has ever run, every PDP shows "You might also like" (unchanged from pre-feature behavior); after recompute, the 4 seeded products switch to "Frequently bought together".

- [ ] **Step 5: Verify the cart**

Add the iPhone to the cart at `http://localhost:3000/cart`.
Expected: an "Add these too" section appears below the order summary showing the Spigen case and/or power bank.

- [ ] **Step 6: Verify the homepage**

While logged in as `demo@drikon.com` (the account the seeded orders belong to), visit `http://localhost:3000/`.
Expected: a "Recommended for you" section appears between "Trending devices" and "Trusted brands", showing products from the demo customer's purchase history's associated rules. Log out (or open an incognito window) and revisit — the section must not render at all for a guest.

- [ ] **Step 7: Run the full API test suite**

Run: `pnpm --filter @drikon/api test`
Expected: all suites pass, including the new `apriori.service.spec.ts`, `recommendations.service.spec.ts`, `product-association-rule.model.spec.ts`, `recommendation-run.model.spec.ts`.

- [ ] **Step 8: Typecheck both apps**

Run: `pnpm --filter @drikon/api exec tsc --noEmit && pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 9: Stop dev servers**

```bash
lsof -ti :3000,:4000 | xargs -r kill -9
```

- [ ] **Step 10: Fix forward or commit**

If any expectation above failed, fix it in the relevant file from Tasks 1–10 and re-run the affected verification step before proceeding. Once everything passes, this task needs no separate commit (nothing changes unless a fix was needed, in which case commit the fix with a message describing what broke and why).
