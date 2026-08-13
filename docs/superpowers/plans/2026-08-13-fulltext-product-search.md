# Full-Text Product Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ranked, Postgres full-text search endpoint for products (`GET /api/v1/products/search?q=`), backed by a generated `tsvector` column.

**Architecture:** A Postgres `GENERATED ALWAYS AS ... STORED` column on `Product` computes a weighted `tsvector` (name weighted higher than description) whenever a row changes — no application-level sync code needed. A GIN index makes `@@` lookups fast. `ProductsService.search()` runs two raw, parameterized queries (ranked IDs + count) via `$queryRaw`, then re-fetches those products through the normal Prisma Client (with the same `include` shape as `findAll`) so the response matches the existing product list shape exactly, and re-orders them to match the rank.

**Tech Stack:** NestJS 11, Prisma 5 (raw SQL via `$queryRaw`, tagged templates only), PostgreSQL 16 `tsvector`/`GIN`, `nestjs-zod` for DTOs, Jest for unit tests.

**Spec:** `docs/superpowers/specs/2026-08-13-web-skills-expansion-design.md` (section 4, "Full-text product search")

## Global Constraints

- All new DTOs use `nestjs-zod` (`z.object(...)` + `createZodDto`), matching `apps/api/src/modules/products/dto/product.dto.ts`.
- Public read endpoints are marked `@Public()`, matching the existing controller.
- Raw SQL must use Prisma's tagged-template `$queryRaw` (never string concatenation) — user input (`q`) is interpolated only through the tagged template, which parameterizes it.
- Literal-path routes (e.g. `search`) must be declared in the controller **before** the `:id` dynamic route, or Nest will match `/products/search` as `id="search"`.
- Unit tests live next to their source file as `*.spec.ts` (Jest `testRegex` in `apps/api/package.json` picks these up automatically) and mock `PrismaService` — no live DB required for this plan's tests.
- Money/Decimal fields are untouched by this feature; don't reformat them.

---

### Task 1: Migration — generated `tsvector` column + GIN index

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (add field to `Product` model, after the `metaDescription` field)
- Create: `apps/api/prisma/migrations/20260813120000_add_product_search_vector/migration.sql`

**Interfaces:**
- Produces: a `"searchVector"` `tsvector` column on the `Product` table, GIN-indexed, auto-maintained by Postgres. Consumed by Task 3's raw SQL as `"searchVector"`.

- [ ] **Step 1: Add the field to the Prisma schema**

In `apps/api/prisma/schema.prisma`, inside the `Product` model, add this field directly after `metaDescription String?`:

```prisma
  // Full-text search — Postgres-generated column, see migration SQL.
  // Unsupported so Prisma Client never tries to read/write it directly;
  // it's queried only via $queryRaw in ProductsService.search().
  searchVector    Unsupported("tsvector")?
```

- [ ] **Step 2: Write the migration SQL**

Create `apps/api/prisma/migrations/20260813120000_add_product_search_vector/migration.sql`:

```sql
-- Weighted, auto-maintained full-text search column.
-- Name matches rank higher (weight A) than description matches (weight B).
ALTER TABLE "Product"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B')
  ) STORED;

CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");
```

- [ ] **Step 3: Regenerate the Prisma Client**

Run: `pnpm --filter @drikon/api db:generate`
Expected: completes with no errors, prints "Generated Prisma Client".

- [ ] **Step 4: Apply the migration against local Postgres**

Make sure local Postgres is running (`docker-compose up -d postgres` from the repo root if it isn't), then run:

`pnpm --filter @drikon/api exec prisma migrate dev`

Expected: Prisma detects the new migration folder, applies it, and reports the database is now in sync — no new migration is auto-generated (the folder you created in Step 2 already satisfies it).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260813120000_add_product_search_vector
git commit -m "feat(api): add generated tsvector column for product search"
```

---

### Task 2: Search query DTO

**Files:**
- Modify: `apps/api/src/modules/products/dto/product.dto.ts`

**Interfaces:**
- Produces: `ProductSearchQueryDto` with fields `{ q: string; page: number; limit: number }`. Consumed by Task 3 (`ProductsService.search`) and Task 4 (controller).

- [ ] **Step 1: Add the schema and DTO class**

At the end of `apps/api/src/modules/products/dto/product.dto.ts`, add:

```ts
export const ProductSearchQuerySchema = z.object({
  q: z.string().min(1).max(120),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(60).default(20),
});
export class ProductSearchQueryDto extends createZodDto(ProductSearchQuerySchema) {}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @drikon/api typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/products/dto/product.dto.ts
git commit -m "feat(api): add ProductSearchQueryDto"
```

---

### Task 3: `ProductsService.search()`

**Files:**
- Modify: `apps/api/src/modules/products/products.service.ts`
- Test: `apps/api/src/modules/products/products.service.spec.ts` (new file)

**Interfaces:**
- Consumes: `ProductSearchQueryDto` (Task 2); `PrismaService.$queryRaw` and `PrismaService.product.findMany` (existing).
- Produces: `ProductsService.search(query: ProductSearchQueryDto): Promise<{ items: Product[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } }>` — same pagination shape as `findAll`. Consumed by Task 4 (controller).

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/modules/products/products.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService.search', () => {
  let service: ProductsService;
  let prisma: {
    $queryRaw: jest.Mock;
    product: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      product: { findMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  it('returns products ordered by rank, with pagination', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        { id: 'p2', rank: 0.9 },
        { id: 'p1', rank: 0.4 },
      ])
      .mockResolvedValueOnce([{ count: 2n }]);
    prisma.product.findMany.mockResolvedValueOnce([
      { id: 'p1', name: 'First' },
      { id: 'p2', name: 'Second' },
    ]);

    const result = await service.search({ q: 'phone', page: 1, limit: 20 });

    expect(result.items.map((p) => p.id)).toEqual(['p2', 'p1']);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['p2', 'p1'] } },
      }),
    );
  });

  it('returns an empty list without querying findMany when nothing matches', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0n }]);

    const result = await service.search({ q: 'zzzznomatch', page: 1, limit: 20 });

    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @drikon/api test -- products.service.spec.ts`
Expected: FAIL — `service.search is not a function`.

- [ ] **Step 3: Implement `search()`**

In `apps/api/src/modules/products/products.service.ts`, add this method to `ProductsService` (place it after `findById`, before `create`):

```ts
  // ─────────────────────────────────────────────────────────────────
  // SEARCH — full-text, ranked via generated tsvector column
  // ─────────────────────────────────────────────────────────────────
  async search(query: ProductSearchQueryDto) {
    const { q, page, limit } = query;
    const skip = (page - 1) * limit;

    const ranked = await this.prisma.$queryRaw<{ id: string; rank: number }[]>`
      SELECT id, ts_rank("searchVector", plainto_tsquery('english', ${q})) AS rank
      FROM "Product"
      WHERE "isActive" = true
        AND "searchVector" @@ plainto_tsquery('english', ${q})
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const [{ count }] = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM "Product"
      WHERE "isActive" = true
        AND "searchVector" @@ plainto_tsquery('english', ${q})
    `;

    const ids = ranked.map((r) => r.id);
    const products = ids.length
      ? await this.prisma.product.findMany({
          where: { id: { in: ids } },
          include: {
            images: { orderBy: { position: 'asc' }, take: 1 },
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
          },
        })
      : [];

    // findMany with `id: { in }` doesn't preserve order — re-sort to match rank.
    const byId = new Map(products.map((p) => [p.id, p]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((p): p is (typeof products)[number] => Boolean(p));

    const total = Number(count);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + items.length < total,
        hasPrev: page > 1,
      },
    };
  }
```

Add `ProductSearchQueryDto` to the existing type-only import at the top of the file:

```ts
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductSearchQueryDto,
} from './dto/product.dto';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @drikon/api test -- products.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/products/products.service.ts apps/api/src/modules/products/products.service.spec.ts
git commit -m "feat(api): add ProductsService.search with ranked full-text query"
```

---

### Task 4: `GET /api/v1/products/search` endpoint

**Files:**
- Modify: `apps/api/src/modules/products/products.controller.ts`
- Test: `apps/api/src/modules/products/products.controller.spec.ts` (new file)

**Interfaces:**
- Consumes: `ProductsService.search()` (Task 3), `ProductSearchQueryDto` (Task 2).
- Produces: public HTTP endpoint `GET /api/v1/products/search?q=&page=&limit=`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/modules/products/products.controller.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController.search', () => {
  it('delegates to ProductsService.search with the query', async () => {
    const products = { search: jest.fn().mockResolvedValue({ items: [], pagination: {} }) };

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: products }],
    }).compile();

    const controller = moduleRef.get(ProductsController);
    const query = { q: 'phone', page: 1, limit: 20 };

    const result = await controller.search(query as any);

    expect(products.search).toHaveBeenCalledWith(query);
    expect(result).toEqual({ items: [], pagination: {} });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @drikon/api test -- products.controller.spec.ts`
Expected: FAIL — `controller.search is not a function`.

- [ ] **Step 3: Add the route**

In `apps/api/src/modules/products/products.controller.ts`, add the `search` endpoint **directly after** `findBySlug` and **before** `findById` (so the literal `/search` path is matched before the `:id` dynamic route):

```ts
  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Full-text search products, ranked by relevance' })
  search(@Query() query: ProductSearchQueryDto) {
    return this.products.search(query);
  }
```

Add `ProductSearchQueryDto` to the existing DTO import at the top of the file:

```ts
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductSearchQueryDto,
} from './dto/product.dto';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @drikon/api test -- products.controller.spec.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Run the full API test suite**

Run: `pnpm --filter @drikon/api test`
Expected: all tests pass, including the two new spec files.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/products/products.controller.ts apps/api/src/modules/products/products.controller.spec.ts
git commit -m "feat(api): expose GET /products/search endpoint"
```

---

### Task 5: Manual verification against a real database

**Files:** none (verification only)

**Interfaces:** none — exercises Tasks 1–4 end-to-end.

- [ ] **Step 1: Start the local stack**

Run: `docker-compose up -d postgres` (from repo root), then confirm the migration from Task 1 is applied: `pnpm --filter @drikon/api exec prisma migrate status` should report "Database schema is up to date".

- [ ] **Step 2: Seed data (if not already seeded)**

Run: `pnpm --filter @drikon/api db:seed`

- [ ] **Step 3: Start the API**

Run: `pnpm --filter @drikon/api dev`

- [ ] **Step 4: Exercise the endpoint**

Run: `curl "http://localhost:4000/api/v1/products/search?q=<a word from a seeded product name>"`
Expected: JSON body with `items` (containing the matching product(s), highest-relevance first) and a `pagination` object. A query for a nonsense word (e.g. `q=zzzqqqxx`) returns `items: []`.

- [ ] **Step 5: Confirm no regression on the existing list endpoint**

Run: `curl "http://localhost:4000/api/v1/products?search=<same word>"`
Expected: still works as before (the existing `ILIKE`-based `search` filter on `findAll` is untouched by this plan).

No commit for this task — it's verification only.
