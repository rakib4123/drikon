# MVC Conversion — apps/api Model Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a `models/` data-access layer in `apps/api` so every service delegates Prisma queries to an injectable Model class instead of calling `PrismaService` directly, making the Model/Controller separation real and documented.

**Architecture:** One `@Injectable()` class per Prisma entity in `apps/api/src/models/`, provided by a `@Global()` `ModelsModule` (mirroring the existing `@Global() PrismaModule` pattern) so every feature module can inject any Model without changing its own `*.module.ts` imports. Models expose typed Prisma-args pass-through methods for simple CRUD, plus dedicated methods encapsulating any `$transaction` that is pure data-consistency work (no business decision). Services keep 100% of their business logic (validation, DTO→Prisma mapping, throwing `NotFoundException`/`ConflictException`/etc., cross-entity orchestration) — they just call Model methods instead of `this.prisma.X`.

**Tech Stack:** NestJS 11, Prisma 5, Jest + `@nestjs/testing`, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-08-17-mvc-conversion-design.md`

## Global Constraints

- No behavior change. Every endpoint must return byte-identical data and throw the same exceptions as before this refactor.
- No new features, no schema changes, no DTO changes, no controller changes.
- Models never import DTO types — they only know Prisma types (`Prisma.XArgs`) or small local interfaces. This keeps them reusable and independent of any one caller's input shape.
- Business decisions (what to throw, when, which persistence op to run) stay in Services. Models only execute persistence operations.
- Every pass-through Model method MUST be written as `methodName<T extends Prisma.XWhateverArgs>(args: Prisma.SelectSubset<T, Prisma.XWhateverArgs>)`, mirroring Prisma Client's own generic signature — never a plain `methodName(args: Prisma.XWhateverArgs)`. A non-generic wrapper collapses the return type to the base model shape and drops any `include`/`select`-conditional fields (e.g. `user.twoFactorSecret` from `findUnique({ include: { twoFactorSecret: true } })`), which breaks the build wherever a service reads an included relation. Every task below follows this pattern; do not simplify it.
- `ModelsModule` is `@Global()`, following the existing `PrismaModule` convention in `apps/api/src/modules/prisma/prisma.module.ts` — feature modules do NOT need their `providers`/`imports` touched to use a Model; only the Service's constructor changes.
- This codebase has zero pre-existing `*.spec.ts` files (confirmed: `find apps/api/src -iname "*.spec.ts"` returns nothing) — there is no existing test suite or pattern to preserve. Each new Model file gets a companion `*.spec.ts` unit test that mocks `PrismaService` and asserts correct delegation. Service-level tests are out of scope for this plan — the business logic inside services is moved verbatim, not changed, and adding a first service test suite for 11 services is a separate concern from the MVC layer split.
- After every task: `pnpm --filter api build` must pass with zero TypeScript errors, and `pnpm --filter api test` must pass.
- Every task is a single git commit. Commit only after build + tests are green.

---

### Task 1: `ModelsModule` bootstrap + `ProductModel` + `OrderModel`

Product and Order are extracted together because they're mutually referenced: `ProductsService.remove()` needs `OrderModel.countItemsForProducts()`, and `OrdersService.create()` needs `ProductModel.findMany()`/`findFirst()`. Splitting them into separate tasks would leave an intermediate commit that doesn't build.

**Files:**
- Create: `apps/api/src/models/models.module.ts`
- Create: `apps/api/src/models/product.model.ts`
- Create: `apps/api/src/models/product.model.spec.ts`
- Create: `apps/api/src/models/order.model.ts`
- Create: `apps/api/src/models/order.model.spec.ts`
- Modify: `apps/api/src/app.module.ts` — add `ModelsModule` to `imports`
- Modify: `apps/api/src/modules/products/products.service.ts`
- Modify: `apps/api/src/modules/orders/orders.service.ts`

**Interfaces:**
- Produces: `ProductModel` with methods `findMany(args)`, `findFirst(args)`, `findManyAndCount(args, countArgs)`, `findUnique(args)`, `create(args)`, `count(args)`, `updateWithImages(id, data, images)`, `update(args)`, `delete(args)`, `deleteMany(args)`, `decrementStock(productId, qty): Promise<boolean>` — all Prisma-args pass-throughs (generic, preserving `include`/`select` inference) except `updateWithImages` and `decrementStock`.
- Produces: `OrderModel` with methods `createOrderTransaction(args)`, `findManyAndCount(args, countArgs)`, `findFirst(args)`, `findUnique(args)`, `findMany(args)`, `update(args)`, `count(args)`, `aggregate(args)`, `countCreatedBetween(start, end)`, `countItemsForProducts(productIds)`, `findDeliveredItem(userId, productId)`.
- Consumes: nothing from other tasks (this is the first task).

- [ ] **Step 1: Write `ProductModel` (implementation first — this is a mechanical extraction, not new behavior, so writing the test first would just be re-deriving Prisma's own signatures)**

```typescript
// apps/api/src/models/product.model.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class ProductModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.ProductFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.ProductFindManyArgs>) {
    return this.prisma.product.findMany(args);
  }

  findFirst<T extends Prisma.ProductFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.ProductFindFirstArgs>) {
    return this.prisma.product.findFirst(args);
  }

  findManyAndCount<T extends Prisma.ProductFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductFindManyArgs>,
    countArgs: Prisma.ProductCountArgs,
  ) {
    return this.prisma.$transaction([
      this.prisma.product.findMany(args),
      this.prisma.product.count(countArgs),
    ]);
  }

  findUnique<T extends Prisma.ProductFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.ProductFindUniqueArgs>) {
    return this.prisma.product.findUnique(args);
  }

  create<T extends Prisma.ProductCreateArgs>(args: Prisma.SelectSubset<T, Prisma.ProductCreateArgs>) {
    return this.prisma.product.create(args);
  }

  count(args: Prisma.ProductCountArgs = {}) {
    return this.prisma.product.count(args);
  }

  /** Atomically replaces the product's image set (if `images` is given) and updates its fields. */
  async updateWithImages(
    id: string,
    data: Prisma.ProductUpdateInput,
    images: Prisma.ProductImageCreateManyProductInput[] | undefined,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((img) => ({ ...img, productId: id })),
        });
      }
      return tx.product.update({
        where: { id },
        data,
        include: { images: true, category: true, brand: true },
      });
    });
  }

  update<T extends Prisma.ProductUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.ProductUpdateArgs>) {
    return this.prisma.product.update(args);
  }

  delete<T extends Prisma.ProductDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.ProductDeleteArgs>) {
    return this.prisma.product.delete(args);
  }

  deleteMany(args: Prisma.ProductDeleteManyArgs) {
    return this.prisma.product.deleteMany(args);
  }

  /** Returns false (instead of throwing) when there isn't enough stock — the caller decides what that means. */
  async decrementStock(productId: string, qty: number): Promise<boolean> {
    const result = await this.prisma.product.updateMany({
      where: { id: productId, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    return result.count > 0;
  }
}
```

- [ ] **Step 2: Write `ProductModel`'s test**

```typescript
// apps/api/src/models/product.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { ProductModel } from './product.model';

describe('ProductModel', () => {
  let model: ProductModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      productImage: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(ProductModel);
  });

  it('findMany delegates to prisma.product.findMany with the given args', async () => {
    const args = { where: { isActive: true } };
    prisma.product.findMany.mockResolvedValue(['p1']);
    await expect(model.findMany(args as any)).resolves.toEqual(['p1']);
    expect(prisma.product.findMany).toHaveBeenCalledWith(args);
  });

  it('findFirst delegates to prisma.product.findFirst', async () => {
    const args = { where: { id: 'p1', isActive: true } };
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    await expect(model.findFirst(args as any)).resolves.toEqual({ id: 'p1' });
    expect(prisma.product.findFirst).toHaveBeenCalledWith(args);
  });

  it('findManyAndCount runs findMany + count inside one $transaction call', async () => {
    prisma.$transaction.mockResolvedValue([['p1'], 1]);
    const args = { where: {} };
    const countArgs = { where: {} };
    await expect(model.findManyAndCount(args as any, countArgs as any)).resolves.toEqual([['p1'], 1]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith(args);
    expect(prisma.product.count).toHaveBeenCalledWith(countArgs);
  });

  it('findUnique delegates to prisma.product.findUnique', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
    await expect(model.findUnique({ where: { id: 'p1' } } as any)).resolves.toEqual({ id: 'p1' });
  });

  it('create delegates to prisma.product.create', async () => {
    prisma.product.create.mockResolvedValue({ id: 'p1' });
    const args = { data: { name: 'x' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'p1' });
    expect(prisma.product.create).toHaveBeenCalledWith(args);
  });

  it('updateWithImages replaces images and updates the product inside one transaction when images is given', async () => {
    const tx = {
      productImage: { deleteMany: jest.fn(), createMany: jest.fn() },
      product: { update: jest.fn().mockResolvedValue({ id: 'p1' }) },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const images = [{ url: 'a.jpg', position: 0 }] as any;
    const result = await model.updateWithImages('p1', { name: 'x' } as any, images);

    expect(tx.productImage.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    expect(tx.productImage.createMany).toHaveBeenCalledWith({
      data: [{ url: 'a.jpg', position: 0, productId: 'p1' }],
    });
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { name: 'x' },
      include: { images: true, category: true, brand: true },
    });
    expect(result).toEqual({ id: 'p1' });
  });

  it('updateWithImages skips the image swap when images is undefined', async () => {
    const tx = {
      productImage: { deleteMany: jest.fn(), createMany: jest.fn() },
      product: { update: jest.fn().mockResolvedValue({ id: 'p1' }) },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await model.updateWithImages('p1', { name: 'x' } as any, undefined);

    expect(tx.productImage.deleteMany).not.toHaveBeenCalled();
    expect(tx.productImage.createMany).not.toHaveBeenCalled();
  });

  it('update delegates to prisma.product.update', async () => {
    prisma.product.update.mockResolvedValue({ id: 'p1', isActive: false });
    const args = { where: { id: 'p1' }, data: { isActive: false } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'p1', isActive: false });
  });

  it('delete delegates to prisma.product.delete', async () => {
    prisma.product.delete.mockResolvedValue({ id: 'p1' });
    await expect(model.delete({ where: { id: 'p1' } } as any)).resolves.toEqual({ id: 'p1' });
  });

  it('deleteMany delegates to prisma.product.deleteMany', async () => {
    prisma.product.deleteMany.mockResolvedValue({ count: 2 });
    const args = { where: { id: { in: ['a', 'b'] } } };
    await expect(model.deleteMany(args as any)).resolves.toEqual({ count: 2 });
  });

  it('decrementStock returns true when enough rows were updated', async () => {
    prisma.product.updateMany.mockResolvedValue({ count: 1 });
    await expect(model.decrementStock('p1', 2)).resolves.toBe(true);
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
  });

  it('decrementStock returns false when stock was insufficient', async () => {
    prisma.product.updateMany.mockResolvedValue({ count: 0 });
    await expect(model.decrementStock('p1', 99)).resolves.toBe(false);
  });
});
```

- [ ] **Step 3: Run the ProductModel test to verify it fails to compile/run before `ModelsModule` exists (sanity check for a clean baseline)**

Run: `pnpm --filter api test -- product.model.spec.ts`
Expected: PASS (this file has no external module dependency yet — it should already pass standalone). If it fails, fix `product.model.ts` before continuing.

- [ ] **Step 4: Write `OrderModel`**

```typescript
// apps/api/src/models/order.model.ts
import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
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
}

@Injectable()
export class OrderModel {
  constructor(private readonly prisma: PrismaService) {}

  /** One transaction: shipping address + order + items + stock decrement + sales bump + coupon redemption. */
  async createOrderTransaction(args: CreateOrderPersistArgs) {
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: { userId: args.userId, ...args.shippingAddress },
      });

      const created = await tx.order.create({
        data: {
          orderNumber: args.orderNumber,
          userId: args.userId,
          status: OrderStatus.PENDING,
          subtotal: args.subtotal,
          shipping: args.shipping,
          tax: args.tax,
          discount: args.discount,
          total: args.total,
          currency: args.currency,
          couponId: args.couponId,
          shippingAddressId: address.id,
          notes: args.notes,
          items: {
            create: args.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              productName: l.productName,
              productImage: l.productImage,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      for (const l of args.lines) {
        await tx.product.update({
          where: { id: l.productId },
          data: { stock: { decrement: l.quantity }, salesCount: { increment: l.quantity } },
        });
        if (l.variantId) {
          await tx.productVariant.update({
            where: { id: l.variantId },
            data: { stock: { decrement: l.quantity } },
          });
        }
      }

      if (args.couponId) {
        await tx.coupon.update({
          where: { id: args.couponId },
          data: { redemptionCount: { increment: 1 } },
        });
      }

      return created;
    });
  }

  findManyAndCount<T extends Prisma.OrderFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.OrderFindManyArgs>,
    countArgs: Prisma.OrderCountArgs,
  ) {
    return this.prisma.$transaction([
      this.prisma.order.findMany(args),
      this.prisma.order.count(countArgs),
    ]);
  }

  findMany<T extends Prisma.OrderFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.OrderFindManyArgs>) {
    return this.prisma.order.findMany(args);
  }

  findFirst<T extends Prisma.OrderFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.OrderFindFirstArgs>) {
    return this.prisma.order.findFirst(args);
  }

  findUnique<T extends Prisma.OrderFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.OrderFindUniqueArgs>) {
    return this.prisma.order.findUnique(args);
  }

  update<T extends Prisma.OrderUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.OrderUpdateArgs>) {
    return this.prisma.order.update(args);
  }

  count(args: Prisma.OrderCountArgs = {}) {
    return this.prisma.order.count(args);
  }

  aggregate<T extends Prisma.OrderAggregateArgs>(args: Prisma.SelectSubset<T, Prisma.OrderAggregateArgs>) {
    return this.prisma.order.aggregate(args);
  }

  countCreatedBetween(start: Date, end: Date) {
    return this.prisma.order.count({ where: { createdAt: { gte: start, lt: end } } });
  }

  countItemsForProducts(productIds: string[]) {
    return this.prisma.orderItem.count({ where: { productId: { in: productIds } } });
  }

  findDeliveredItem(userId: string, productId: string) {
    return this.prisma.orderItem.findFirst({
      where: { productId, order: { userId, status: OrderStatus.DELIVERED } },
      select: { id: true },
    });
  }
}
```

- [ ] **Step 5: Write `OrderModel`'s test**

```typescript
// apps/api/src/models/order.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { OrderModel, CreateOrderPersistArgs } from './order.model';

describe('OrderModel', () => {
  let model: OrderModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      order: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      orderItem: { count: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(OrderModel);
  });

  it('createOrderTransaction creates the address, order, decrements stock, bumps sales and coupon redemption', async () => {
    const tx = {
      address: { create: jest.fn().mockResolvedValue({ id: 'addr1' }) },
      order: { create: jest.fn().mockResolvedValue({ id: 'order1', items: [] }) },
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
    };

    const result = await model.createOrderTransaction(args);

    expect(tx.address.create).toHaveBeenCalledWith({ data: { userId: 'u1', ...args.shippingAddress } });
    expect(tx.order.create).toHaveBeenCalled();
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

  it('createOrderTransaction skips the coupon update when couponId is null', async () => {
    const tx = {
      address: { create: jest.fn().mockResolvedValue({ id: 'addr1' }) },
      order: { create: jest.fn().mockResolvedValue({ id: 'order1', items: [] }) },
      product: { update: jest.fn() },
      productVariant: { update: jest.fn() },
      coupon: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await model.createOrderTransaction({
      userId: 'u1',
      shippingAddress: { fullName: 'A', phone: '1', line1: 'L1', city: 'C', postalCode: '000', country: 'BD' },
      orderNumber: 'DRK-2026-000001',
      subtotal: new Prisma.Decimal(0), shipping: new Prisma.Decimal(0), tax: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(0), total: new Prisma.Decimal(0), currency: 'BDT', couponId: null,
      lines: [],
    });

    expect(tx.coupon.update).not.toHaveBeenCalled();
  });

  it('findManyAndCount runs findMany + count inside one $transaction call', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);
    await model.findManyAndCount({ where: {} } as any, { where: {} } as any);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.findMany).toHaveBeenCalled();
    expect(prisma.order.count).toHaveBeenCalled();
  });

  it('findFirst delegates to prisma.order.findFirst', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 'o1' });
    await expect(model.findFirst({ where: { id: 'o1' } } as any)).resolves.toEqual({ id: 'o1' });
  });

  it('findUnique delegates to prisma.order.findUnique', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o1' });
    await expect(model.findUnique({ where: { id: 'o1' } } as any)).resolves.toEqual({ id: 'o1' });
  });

  it('update delegates to prisma.order.update', async () => {
    prisma.order.update.mockResolvedValue({ id: 'o1' });
    await expect(model.update({ where: { id: 'o1' }, data: {} } as any)).resolves.toEqual({ id: 'o1' });
  });

  it('countCreatedBetween counts orders in the given range', async () => {
    prisma.order.count.mockResolvedValue(5);
    const start = new Date('2026-01-01');
    const end = new Date('2027-01-01');
    await expect(model.countCreatedBetween(start, end)).resolves.toBe(5);
    expect(prisma.order.count).toHaveBeenCalledWith({ where: { createdAt: { gte: start, lt: end } } });
  });

  it('countItemsForProducts counts order items for the given product ids', async () => {
    prisma.orderItem.count.mockResolvedValue(3);
    await expect(model.countItemsForProducts(['p1', 'p2'])).resolves.toBe(3);
    expect(prisma.orderItem.count).toHaveBeenCalledWith({ where: { productId: { in: ['p1', 'p2'] } } });
  });

  it('findDeliveredItem looks up a delivered order item for the user/product pair', async () => {
    prisma.orderItem.findFirst.mockResolvedValue({ id: 'oi1' });
    await expect(model.findDeliveredItem('u1', 'p1')).resolves.toEqual({ id: 'oi1' });
    expect(prisma.orderItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ productId: 'p1' }),
    }));
  });
});
```

- [ ] **Step 6: Create `ModelsModule` and register it in `AppModule`**

```typescript
// apps/api/src/models/models.module.ts
import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel],
  exports: [ProductModel, OrderModel],
})
export class ModelsModule {}
```

In `apps/api/src/app.module.ts`, add the import and register it in the `imports` array right after `PrismaModule`:

```typescript
import { ModelsModule } from './models/models.module';
// ...
    PrismaModule,
    ModelsModule,
    MailModule,
```

- [ ] **Step 7: Refactor `ProductsService` to use `ProductModel` and `OrderModel`**

Replace the whole file:

```typescript
// apps/api/src/modules/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly products: ProductModel,
    private readonly orders: OrderModel,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // LIST — filtering, sorting, pagination
  // ─────────────────────────────────────────────────────────────────
  async findAll(query: ProductQueryDto, opts: { admin?: boolean } = {}) {
    const { page, limit, search, category, brand, minPrice, maxPrice, minRating, inStock, featured, sort } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(opts.admin ? {} : { isActive: true }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category: { slug: category } }),
      ...(brand && { brand: { slug: brand } }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined && { gte: new Prisma.Decimal(minPrice) }),
              ...(maxPrice !== undefined && { lte: new Prisma.Decimal(maxPrice) }),
            },
          }
        : {}),
      ...(minRating !== undefined && { averageRating: { gte: minRating } }),
      ...(inStock && { stock: { gt: 0 } }),
      ...(featured !== undefined && { isFeatured: featured }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (sort) {
        case 'oldest':     return { createdAt: 'asc' };
        case 'price_asc':  return { price: 'asc' };
        case 'price_desc': return { price: 'desc' };
        case 'popular':    return { salesCount: 'desc' };
        case 'rating':     return { averageRating: 'desc' };
        case 'newest':
        default:           return { createdAt: 'desc' };
      }
    })();

    const [items, total] = await this.products.findManyAndCount(
      {
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
      },
      { where },
    );

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

  // ─────────────────────────────────────────────────────────────────
  // DETAIL
  // ─────────────────────────────────────────────────────────────────
  async findBySlug(slug: string) {
    const product = await this.products.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { position: 'asc' } },
        category: true,
        brand: true,
        variants: true,
        reviews: {
          where: { isHidden: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  // ─────────────────────────────────────────────────────────────────
  // GET ONE BY ID (admin edit form)
  // ─────────────────────────────────────────────────────────────────
  async findById(id: string) {
    const product = await this.products.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ─────────────────────────────────────────────────────────────────
  // CREATE (admin)
  // ─────────────────────────────────────────────────────────────────
  async create(dto: CreateProductDto) {
    const slug = dto.slug ?? this.slugify(dto.name);
    try {
      return await this.products.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          shortDescription: dto.shortDescription,
          sku: dto.sku,
          price: new Prisma.Decimal(dto.price),
          compareAtPrice: dto.compareAtPrice ? new Prisma.Decimal(dto.compareAtPrice) : null,
          currency: dto.currency,
          stock: dto.stock,
          lowStockThreshold: dto.lowStockThreshold,
          isActive: dto.isActive,
          isFeatured: dto.isFeatured,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          attributes: dto.attributes as any,
          videoUrl: dto.videoUrl || null,
          metaTitle: dto.metaTitle,
          metaDescription: dto.metaDescription,
          images: { create: dto.images ?? [] },
        },
        include: { images: true, category: true, brand: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('A product with this slug or SKU already exists');
      }
      throw e;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // UPDATE (admin)
  // ─────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id); // 404 if missing

    const { images, price, compareAtPrice, videoUrl, ...rest } = dto;

    return this.products.updateWithImages(
      id,
      {
        ...rest,
        ...(videoUrl !== undefined && { videoUrl: videoUrl || null }),
        ...(price !== undefined && { price: new Prisma.Decimal(price) }),
        ...(compareAtPrice !== undefined && {
          compareAtPrice: compareAtPrice === null ? null : new Prisma.Decimal(compareAtPrice),
        }),
      },
      images,
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // DELETE (admin)
  // Never-ordered products are removed completely (images, variants, cart,
  // wishlist, reviews, flash-sale entries all cascade). Products with order
  // history are archived (isActive = false) instead, so past orders stay intact.
  // ─────────────────────────────────────────────────────────────────
  async remove(id: string) {
    await this.findById(id);
    const orderCount = await this.orders.countItemsForProducts([id]);
    if (orderCount > 0) {
      return this.products.update({
        where: { id },
        data: { isActive: false },
      });
    }
    await this.products.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─────────────────────────────────────────────────────────────────
  // STOCK MUTATION — atomic, used by checkout
  // ─────────────────────────────────────────────────────────────────
  async decrementStock(productId: string, qty: number): Promise<void> {
    const ok = await this.products.decrementStock(productId, qty);
    if (!ok) {
      throw new ConflictException('Insufficient stock');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  private slugify(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }
}
```

- [ ] **Step 8: Refactor `OrdersService` to use `OrderModel` and `ProductModel`**

Replace the whole file:

```typescript
// apps/api/src/modules/orders/orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderModel } from '../../models/order.model';
import { ProductModel } from '../../models/product.model';
import { CouponsService } from '../coupons/coupons.service';
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
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // CREATE — turn a cart payload into a real Order (no payment yet)
  // ─────────────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateOrderDto) {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.products.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: true,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = dto.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} is unavailable`);
      }

      const variant = item.variantId
        ? product.variants.find((v) => v.id === item.variantId)
        : undefined;
      if (item.variantId && !variant) {
        throw new BadRequestException(`Variant ${item.variantId} is unavailable`);
      }

      const availableStock = variant ? variant.stock : product.stock;
      if (availableStock < item.quantity) {
        throw new BadRequestException(
          `Not enough stock for "${product.name}" (${availableStock} left)`,
        );
      }

      const unitPrice = variant?.price ?? product.price;
      const lineTotal = unitPrice.mul(item.quantity);

      return {
        productId: product.id,
        variantId: variant?.id ?? null,
        productName: product.name,
        productImage: product.images[0]?.url ?? null,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
        currency: product.currency,
      };
    });

    const subtotal = lines.reduce(
      (acc, l) => acc.add(l.lineTotal),
      new Prisma.Decimal(0),
    );
    let shipping = subtotal.greaterThanOrEqualTo(FREE_SHIPPING_THRESHOLD)
      ? new Prisma.Decimal(0)
      : FLAT_SHIPPING_FEE;
    const tax = new Prisma.Decimal(0);

    let discount = new Prisma.Decimal(0);
    let couponId: string | null = null;
    if (dto.couponCode) {
      const resolved = await this.coupons.resolveForOrder(
        dto.couponCode,
        subtotal.toNumber(),
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice.toNumber() })),
      );
      discount = resolved.discount;
      couponId = resolved.couponId;
      if (resolved.freeShipping) shipping = new Prisma.Decimal(0);
    }

    const total = subtotal.add(shipping).add(tax).sub(discount);
    const currency = lines[0]?.currency ?? 'BDT';

    const orderNumber = await this.nextOrderNumber();

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
    });

    return this.attachSlugs(order);
  }

  // ─────────────────────────────────────────────────────────────────
  // LIST — the signed-in user's order history
  // ─────────────────────────────────────────────────────────────────
  async listForUser(userId: string, query: OrderQueryDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [orders, total] = await this.orders.findManyAndCount(
      { where: { userId }, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { items: true } },
      { where: { userId } },
    );

    const items = await Promise.all(orders.map((o) => this.attachSlugs(o)));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + orders.length < total,
        hasPrev: page > 1,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // DETAIL — one order by its human-readable number (must be the owner)
  // ─────────────────────────────────────────────────────────────────
  async getByNumber(userId: string, orderNumber: string) {
    const order = await this.orders.findFirst({
      where: { orderNumber, userId },
      include: { items: true, shippingAddress: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.attachSlugs(order);
  }

  // ─────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────

  private async nextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const countThisYear = await this.orders.countCreatedBetween(start, end);
    const seq = String(countThisYear + 1).padStart(6, '0');
    return `DRK-${year}-${seq}`;
  }

  private async attachSlugs<T extends { items: { productId: string }[] }>(
    order: T,
  ): Promise<T & { items: (T['items'][number] & { slug: string | null })[] }> {
    const ids = [...new Set(order.items.map((i) => i.productId))];
    const products = await this.products.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true },
    });
    const slugById = new Map(products.map((p) => [p.id, p.slug]));
    return {
      ...order,
      items: order.items.map((i) => ({ ...i, slug: slugById.get(i.productId) ?? null })),
    };
  }
}
```

- [ ] **Step 9: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds with zero TypeScript errors; all tests (including the two new spec files) PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/models/models.module.ts apps/api/src/models/product.model.ts apps/api/src/models/product.model.spec.ts apps/api/src/models/order.model.ts apps/api/src/models/order.model.spec.ts apps/api/src/app.module.ts apps/api/src/modules/products/products.service.ts apps/api/src/modules/orders/orders.service.ts
git commit -m "refactor(api): extract ProductModel and OrderModel data-access layer"
```

---

### Task 2: `ReviewModel`

**Files:**
- Create: `apps/api/src/models/review.model.ts`
- Create: `apps/api/src/models/review.model.spec.ts`
- Modify: `apps/api/src/models/models.module.ts` — add `ReviewModel` to `providers`/`exports`
- Modify: `apps/api/src/modules/reviews/reviews.service.ts`

**Interfaces:**
- Consumes: `ProductModel.findFirst(args)` (Task 1), `OrderModel.findDeliveredItem(userId, productId)` (Task 1).
- Produces: `ReviewModel` with `listVisibleForProduct(productId)`, `upsert(args)`, `findUnique(args)`, `delete(args)`, `findManyAndCount(args, countArgs)`, `update(args)`, `count(args)`, `recomputeProductAggregates(productId)`.

- [ ] **Step 1: Write `ReviewModel`**

```typescript
// apps/api/src/models/review.model.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class ReviewModel {
  constructor(private readonly prisma: PrismaService) {}

  /** Visible reviews (paginated to 50) + every visible rating, for aggregate computation. */
  listVisibleForProduct(productId: string) {
    return this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { productId, isHidden: false },
        orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
        take: 50,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      this.prisma.review.findMany({
        where: { productId, isHidden: false },
        select: { rating: true },
      }),
    ]);
  }

  upsert<T extends Prisma.ReviewUpsertArgs>(args: Prisma.SelectSubset<T, Prisma.ReviewUpsertArgs>) {
    return this.prisma.review.upsert(args);
  }

  findUnique<T extends Prisma.ReviewFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.ReviewFindUniqueArgs>) {
    return this.prisma.review.findUnique(args);
  }

  delete<T extends Prisma.ReviewDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.ReviewDeleteArgs>) {
    return this.prisma.review.delete(args);
  }

  findManyAndCount<T extends Prisma.ReviewFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ReviewFindManyArgs>,
    countArgs: Prisma.ReviewCountArgs,
  ) {
    return this.prisma.$transaction([
      this.prisma.review.findMany(args),
      this.prisma.review.count(countArgs),
    ]);
  }

  update<T extends Prisma.ReviewUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.ReviewUpdateArgs>) {
    return this.prisma.review.update(args);
  }

  count(args: Prisma.ReviewCountArgs = {}) {
    return this.prisma.review.count(args);
  }

  /** Keeps the denormalized Product.averageRating / reviewCount in sync with visible reviews. */
  async recomputeProductAggregates(productId: string): Promise<void> {
    const agg = await this.prisma.review.aggregate({
      where: { productId, isHidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const count = agg._count.rating;
    const avg = agg._avg.rating ?? 0;
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        reviewCount: count,
        averageRating: Math.round(avg * 10) / 10,
      },
    });
  }
}
```

- [ ] **Step 2: Write `ReviewModel`'s test**

```typescript
// apps/api/src/models/review.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { ReviewModel } from './review.model';

describe('ReviewModel', () => {
  let model: ReviewModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      review: {
        findMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      product: { update: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(ReviewModel);
  });

  it('listVisibleForProduct runs both findMany queries inside one $transaction call', async () => {
    prisma.$transaction.mockResolvedValue([[{ id: 'r1' }], [{ rating: 5 }]]);
    await expect(model.listVisibleForProduct('p1')).resolves.toEqual([[{ id: 'r1' }], [{ rating: 5 }]]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.review.findMany).toHaveBeenCalledTimes(2);
  });

  it('upsert delegates to prisma.review.upsert', async () => {
    prisma.review.upsert.mockResolvedValue({ id: 'r1' });
    const args = { where: { userId_productId: { userId: 'u1', productId: 'p1' } }, create: {}, update: {} };
    await expect(model.upsert(args as any)).resolves.toEqual({ id: 'r1' });
    expect(prisma.review.upsert).toHaveBeenCalledWith(args);
  });

  it('findUnique delegates to prisma.review.findUnique', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 'r1' });
    await expect(model.findUnique({ where: { id: 'r1' } } as any)).resolves.toEqual({ id: 'r1' });
  });

  it('delete delegates to prisma.review.delete', async () => {
    prisma.review.delete.mockResolvedValue({ id: 'r1' });
    await expect(model.delete({ where: { id: 'r1' } } as any)).resolves.toEqual({ id: 'r1' });
  });

  it('findManyAndCount runs findMany + count inside one $transaction call', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);
    await model.findManyAndCount({} as any, {} as any);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('update delegates to prisma.review.update', async () => {
    prisma.review.update.mockResolvedValue({ id: 'r1', isHidden: true });
    await expect(model.update({ where: { id: 'r1' }, data: { isHidden: true } } as any))
      .resolves.toEqual({ id: 'r1', isHidden: true });
  });

  it('recomputeProductAggregates writes the rounded average and count onto the product', async () => {
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.666 }, _count: { rating: 3 } });
    await model.recomputeProductAggregates('p1');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { reviewCount: 3, averageRating: 4.7 },
    });
  });

  it('recomputeProductAggregates writes 0 when there are no ratings', async () => {
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { rating: 0 } });
    await model.recomputeProductAggregates('p1');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { reviewCount: 0, averageRating: 0 },
    });
  });
});
```

- [ ] **Step 3: Register `ReviewModel` in `ModelsModule`**

```typescript
// apps/api/src/models/models.module.ts
import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel],
  exports: [ProductModel, OrderModel, ReviewModel],
})
export class ModelsModule {}
```

- [ ] **Step 4: Refactor `ReviewsService`**

Replace the whole file:

```typescript
// apps/api/src/modules/reviews/reviews.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ReviewModel } from '../../models/review.model';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import type { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly reviews: ReviewModel,
    private readonly products: ProductModel,
    private readonly orders: OrderModel,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // LIST — visible reviews for a product + aggregate stats
  // ─────────────────────────────────────────────────────────────────
  async listForProduct(productId: string) {
    const [items, allRatings] = await this.reviews.listVisibleForProduct(productId);

    const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const r of allRatings) {
      distribution[r.rating - 1] += 1;
      sum += r.rating;
    }
    const count = allRatings.length;

    return {
      items,
      reviewCount: count,
      averageRating: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
      distribution,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // CREATE / UPDATE — one review per user per product
  // ─────────────────────────────────────────────────────────────────
  async upsertForProduct(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.products.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const delivered = await this.orders.findDeliveredItem(userId, productId);
    const isVerified = Boolean(delivered);

    const review = await this.reviews.upsert({
      where: { userId_productId: { userId, productId } },
      create: {
        userId,
        productId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        isVerified,
      },
      update: {
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        isVerified,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await this.reviews.recomputeProductAggregates(productId);
    return review;
  }

  async remove(userId: string, reviewId: string) {
    const review = await this.reviews.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, productId: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own review');
    }
    await this.reviews.delete({ where: { id: reviewId } });
    await this.reviews.recomputeProductAggregates(review.productId);
    return { id: reviewId, deleted: true };
  }

  // ─────────────────────────────────────────────────────────────────
  // ADMIN — moderation
  // ─────────────────────────────────────────────────────────────────
  async listAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.reviews.findManyAndCount(
      {
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      },
      {},
    );
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

  async setHidden(id: string, isHidden: boolean) {
    const review = await this.reviews.findUnique({
      where: { id },
      select: { id: true, productId: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    const updated = await this.reviews.update({
      where: { id },
      data: { isHidden },
    });
    await this.reviews.recomputeProductAggregates(review.productId);
    return updated;
  }
}
```

- [ ] **Step 5: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models/review.model.ts apps/api/src/models/review.model.spec.ts apps/api/src/models/models.module.ts apps/api/src/modules/reviews/reviews.service.ts
git commit -m "refactor(api): extract ReviewModel data-access layer"
```

---

### Task 3: `CouponModel`

**Files:**
- Create: `apps/api/src/models/coupon.model.ts`
- Create: `apps/api/src/models/coupon.model.spec.ts`
- Modify: `apps/api/src/models/models.module.ts` — add `CouponModel`
- Modify: `apps/api/src/modules/coupons/coupons.service.ts`

**Interfaces:**
- Consumes: `ProductModel.findMany(args)` (Task 1).
- Produces: `CouponModel` with `findMany(args)`, `findUnique(args)`, `create(args)`, `update(args)`, `delete(args)`.

- [ ] **Step 1: Write `CouponModel`**

```typescript
// apps/api/src/models/coupon.model.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class CouponModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.CouponFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.CouponFindManyArgs>) {
    return this.prisma.coupon.findMany(args);
  }

  findUnique<T extends Prisma.CouponFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.CouponFindUniqueArgs>) {
    return this.prisma.coupon.findUnique(args);
  }

  create<T extends Prisma.CouponCreateArgs>(args: Prisma.SelectSubset<T, Prisma.CouponCreateArgs>) {
    return this.prisma.coupon.create(args);
  }

  update<T extends Prisma.CouponUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.CouponUpdateArgs>) {
    return this.prisma.coupon.update(args);
  }

  delete<T extends Prisma.CouponDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.CouponDeleteArgs>) {
    return this.prisma.coupon.delete(args);
  }
}
```

- [ ] **Step 2: Write `CouponModel`'s test**

```typescript
// apps/api/src/models/coupon.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { CouponModel } from './coupon.model';

describe('CouponModel', () => {
  let model: CouponModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      coupon: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CouponModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(CouponModel);
  });

  it('findMany delegates to prisma.coupon.findMany', async () => {
    prisma.coupon.findMany.mockResolvedValue([{ id: 'c1' }]);
    await expect(model.findMany({})).resolves.toEqual([{ id: 'c1' }]);
    expect(prisma.coupon.findMany).toHaveBeenCalledWith({});
    expect(prisma.coupon.findMany).toHaveBeenCalledWith({});
  });

  it('findUnique delegates to prisma.coupon.findUnique', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ id: 'c1', code: 'SAVE10' });
    const args = { where: { code: 'SAVE10' } };
    await expect(model.findUnique(args as any)).resolves.toEqual({ id: 'c1', code: 'SAVE10' });
    expect(prisma.coupon.findUnique).toHaveBeenCalledWith(args);
  });

  it('create delegates to prisma.coupon.create', async () => {
    prisma.coupon.create.mockResolvedValue({ id: 'c1' });
    const args = { data: { code: 'SAVE10' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.coupon.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.coupon.update', async () => {
    prisma.coupon.update.mockResolvedValue({ id: 'c1' });
    const args = { where: { id: 'c1' }, data: { isActive: false } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.coupon.update).toHaveBeenCalledWith(args);
  });

  it('delete delegates to prisma.coupon.delete', async () => {
    prisma.coupon.delete.mockResolvedValue({ id: 'c1' });
    const args = { where: { id: 'c1' } };
    await expect(model.delete(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.coupon.delete).toHaveBeenCalledWith(args);
  });
});
```

- [ ] **Step 3: Register `CouponModel` in `ModelsModule`**

```typescript
// apps/api/src/models/models.module.ts
import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel],
})
export class ModelsModule {}
```

- [ ] **Step 4: Refactor `CouponsService`**

Replace the whole file — only the data-access lines change (`this.prisma.coupon.*` → `this.coupons.*`, `this.prisma.product.findMany` → `this.products.findMany`); every business rule, message, and calculation stays identical:

```typescript
// apps/api/src/modules/coupons/coupons.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CouponModel } from '../../models/coupon.model';
import { ProductModel } from '../../models/product.model';
import type { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

const SHIPPING_FEE = new Prisma.Decimal(60);

export interface CartLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CouponValidation {
  valid: boolean;
  message: string;
  discount: Prisma.Decimal;
  freeShipping: boolean;
  couponId?: string;
  code?: string;
}

@Injectable()
export class CouponsService {
  constructor(
    private readonly coupons: CouponModel,
    private readonly products: ProductModel,
  ) {}

  list() {
    return this.coupons.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  /** Public, advertisable offers that are currently valid. */
  async offers() {
    const now = new Date();
    const rows = await this.coupons.findMany({
      where: {
        isActive: true,
        isPublic: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      orderBy: { value: 'desc' },
      select: {
        code: true,
        description: true,
        isPercentage: true,
        value: true,
        minOrderAmount: true,
        freeShipping: true,
        expiresAt: true,
        maxRedemptions: true,
        redemptionCount: true,
        category: { select: { name: true, slug: true } },
      },
    });
    return rows.filter((c) => !c.maxRedemptions || c.redemptionCount < c.maxRedemptions);
  }

  async create(dto: CreateCouponDto) {
    const exists = await this.coupons.findUnique({ where: { code: dto.code }, select: { id: true } });
    if (exists) throw new ConflictException(`Coupon "${dto.code}" already exists`);
    return this.coupons.create({ data: this.toData(dto) as Prisma.CouponCreateInput });
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.getOrThrow(id);
    return this.coupons.update({ where: { id }, data: this.toData(dto) as Prisma.CouponUpdateInput });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.coupons.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Public-facing validation used by cart + checkout. Never throws. */
  async validate(code: string, subtotal: number, items?: CartLine[]): Promise<CouponValidation> {
    const zero = new Prisma.Decimal(0);
    const invalid = (message: string): CouponValidation => ({ valid: false, message, discount: zero, freeShipping: false });

    const coupon = await this.coupons.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (!coupon || !coupon.isActive) return invalid('Invalid or inactive coupon');

    const now = new Date();
    if (coupon.startsAt > now) return invalid('This coupon is not active yet');
    if (coupon.expiresAt && coupon.expiresAt < now) return invalid('This coupon has expired');
    if (coupon.maxRedemptions && coupon.redemptionCount >= coupon.maxRedemptions) {
      return invalid('This coupon has been fully redeemed');
    }
    const sub = new Prisma.Decimal(subtotal);
    if (coupon.minOrderAmount && sub.lessThan(coupon.minOrderAmount)) {
      return invalid(`Minimum order of ${coupon.minOrderAmount} required`);
    }

    let base = sub;
    if (coupon.categoryId) {
      if (!items || items.length === 0) {
        return invalid('Add eligible items to use this code');
      }
      const products = await this.products.findMany({
        where: { id: { in: items.map((i) => i.productId) } },
        select: { id: true, categoryId: true },
      });
      const catOf = new Map(products.map((p) => [p.id, p.categoryId]));
      base = items
        .filter((i) => catOf.get(i.productId) === coupon.categoryId)
        .reduce((acc, i) => acc.add(new Prisma.Decimal(i.unitPrice).mul(i.quantity)), zero);
      if (base.lessThanOrEqualTo(0)) {
        return invalid('This code only applies to specific products not in your cart');
      }
    }

    const raw = coupon.isPercentage ? base.mul(coupon.value).div(100) : coupon.value;
    const discount = raw.greaterThan(base) ? base : raw;

    if (discount.lessThanOrEqualTo(0) && !coupon.freeShipping) {
      return invalid('This coupon has no value for your cart');
    }

    return {
      valid: true,
      message: coupon.freeShipping && discount.greaterThan(0)
        ? 'Coupon applied — discount + free shipping'
        : coupon.freeShipping
          ? 'Free shipping applied'
          : 'Coupon applied',
      discount,
      freeShipping: coupon.freeShipping,
      couponId: coupon.id,
      code: coupon.code,
    };
  }

  /** Best eligible active coupon for the given cart, or null. */
  async best(subtotal: number, items?: CartLine[]) {
    const now = new Date();
    const candidates = await this.coupons.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
    });

    let best: { code: string; discount: Prisma.Decimal; freeShipping: boolean; message: string; effective: Prisma.Decimal } | null = null;
    for (const c of candidates) {
      const r = await this.validate(c.code, subtotal, items);
      if (!r.valid) continue;
      const effective = r.discount.add(r.freeShipping ? SHIPPING_FEE : new Prisma.Decimal(0));
      if (!best || effective.greaterThan(best.effective)) {
        best = { code: r.code!, discount: r.discount, freeShipping: r.freeShipping, message: r.message, effective };
      }
    }
    if (!best) return null;
    return { code: best.code, discount: best.discount, freeShipping: best.freeShipping, message: best.message };
  }

  /** Used inside order creation — throws if the code can't be applied. */
  async resolveForOrder(code: string, subtotal: number, items?: CartLine[]) {
    const result = await this.validate(code, subtotal, items);
    if (!result.valid || !result.couponId) throw new BadRequestException(result.message);
    return { couponId: result.couponId, discount: result.discount, freeShipping: result.freeShipping };
  }

  private toData(dto: CreateCouponDto | UpdateCouponDto) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      if (k === 'value' || k === 'minOrderAmount') out[k] = new Prisma.Decimal(v as number);
      else if (k === 'categoryId') out[k] = v === '' ? null : v;
      else out[k] = v;
    }
    return out;
  }

  private async getOrThrow(id: string) {
    const c = await this.coupons.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Coupon not found');
    return c;
  }
}
```

- [ ] **Step 5: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models/coupon.model.ts apps/api/src/models/coupon.model.spec.ts apps/api/src/models/models.module.ts apps/api/src/modules/coupons/coupons.service.ts
git commit -m "refactor(api): extract CouponModel data-access layer"
```

---

### Task 4: `BrandModel`

**Files:**
- Create: `apps/api/src/models/brand.model.ts`
- Create: `apps/api/src/models/brand.model.spec.ts`
- Modify: `apps/api/src/models/models.module.ts` — add `BrandModel`
- Modify: `apps/api/src/modules/brands/brands.service.ts`

**Interfaces:**
- Consumes: nothing from other tasks — self-contained.
- Produces: `BrandModel` with `findMany(args)`, `findFirst(args)`, `findUnique(args)`, `create(args)`, `update(args)`, `delete(args)`.

- [ ] **Step 1: Write `BrandModel`**

```typescript
// apps/api/src/models/brand.model.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class BrandModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.BrandFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.BrandFindManyArgs>) {
    return this.prisma.brand.findMany(args);
  }

  findFirst<T extends Prisma.BrandFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.BrandFindFirstArgs>) {
    return this.prisma.brand.findFirst(args);
  }

  findUnique<T extends Prisma.BrandFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.BrandFindUniqueArgs>) {
    return this.prisma.brand.findUnique(args);
  }

  create<T extends Prisma.BrandCreateArgs>(args: Prisma.SelectSubset<T, Prisma.BrandCreateArgs>) {
    return this.prisma.brand.create(args);
  }

  update<T extends Prisma.BrandUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.BrandUpdateArgs>) {
    return this.prisma.brand.update(args);
  }

  delete<T extends Prisma.BrandDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.BrandDeleteArgs>) {
    return this.prisma.brand.delete(args);
  }
}
```

- [ ] **Step 2: Write `BrandModel`'s test**

```typescript
// apps/api/src/models/brand.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { BrandModel } from './brand.model';

describe('BrandModel', () => {
  let model: BrandModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      brand: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BrandModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(BrandModel);
  });

  it('findMany delegates to prisma.brand.findMany', async () => {
    prisma.brand.findMany.mockResolvedValue([{ id: 'b1' }]);
    await expect(model.findMany({})).resolves.toEqual([{ id: 'b1' }]);
    expect(prisma.brand.findMany).toHaveBeenCalledWith({});
  });

  it('findFirst delegates to prisma.brand.findFirst', async () => {
    prisma.brand.findFirst.mockResolvedValue({ id: 'b1' });
    const args = { where: { slug: 'acme' } };
    await expect(model.findFirst(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.brand.findFirst).toHaveBeenCalledWith(args);
  });

  it('findUnique delegates to prisma.brand.findUnique', async () => {
    prisma.brand.findUnique.mockResolvedValue({ id: 'b1' });
    await expect(model.findUnique({ where: { id: 'b1' } } as any)).resolves.toEqual({ id: 'b1' });
  });

  it('create delegates to prisma.brand.create', async () => {
    prisma.brand.create.mockResolvedValue({ id: 'b1' });
    const args = { data: { name: 'Acme', slug: 'acme' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.brand.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.brand.update', async () => {
    prisma.brand.update.mockResolvedValue({ id: 'b1' });
    const args = { where: { id: 'b1' }, data: { name: 'New' } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.brand.update).toHaveBeenCalledWith(args);
  });

  it('delete delegates to prisma.brand.delete', async () => {
    prisma.brand.delete.mockResolvedValue({ id: 'b1' });
    const args = { where: { id: 'b1' } };
    await expect(model.delete(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.brand.delete).toHaveBeenCalledWith(args);
  });
});
```

- [ ] **Step 3: Register `BrandModel` in `ModelsModule`**

```typescript
// apps/api/src/models/models.module.ts
import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';
import { BrandModel } from './brand.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel],
})
export class ModelsModule {}
```

- [ ] **Step 4: Refactor `BrandsService`**

Replace the whole file:

```typescript
// apps/api/src/modules/brands/brands.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BrandModel } from '../../models/brand.model';
import { slugify } from '../../common/utils/slugify';
import type { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly brands: BrandModel) {}

  list() {
    return this.brands.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        _count: { select: { products: true } },
      },
    });
  }

  async create(dto: CreateBrandDto) {
    const slug = dto.slug || slugify(dto.name);
    await this.assertFree(slug, dto.name);
    return this.brands.create({
      data: { name: dto.name, slug, logoUrl: dto.logoUrl || null },
    });
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.getOrThrow(id);
    const slug = dto.slug || (dto.name ? slugify(dto.name) : undefined);
    if (slug) await this.assertFree(slug, dto.name, id);
    return this.brands.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug && { slug }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl || null }),
      },
    });
  }

  async remove(id: string) {
    const brand = await this.brands.findUnique({
      where: { id },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand._count.products > 0) {
      throw new BadRequestException('This brand still has products. Reassign them first.');
    }
    await this.brands.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async getOrThrow(id: string) {
    const b = await this.brands.findUnique({ where: { id }, select: { id: true } });
    if (!b) throw new NotFoundException('Brand not found');
    return b;
  }

  private async assertFree(slug: string, name?: string, exceptId?: string) {
    const clash = await this.brands.findFirst({
      where: {
        OR: [{ slug }, ...(name ? [{ name }] : [])],
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`A brand with that name/slug already exists`);
  }
}
```

- [ ] **Step 5: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models/brand.model.ts apps/api/src/models/brand.model.spec.ts apps/api/src/models/models.module.ts apps/api/src/modules/brands/brands.service.ts
git commit -m "refactor(api): extract BrandModel data-access layer"
```

---

### Task 5: `CategoryModel` (+ `ProductModel.deleteMany`)

**Files:**
- Create: `apps/api/src/models/category.model.ts`
- Create: `apps/api/src/models/category.model.spec.ts`
- Modify: `apps/api/src/models/models.module.ts` — add `CategoryModel`
- Modify: `apps/api/src/modules/categories/categories.service.ts`

**Interfaces:**
- Consumes: `ProductModel.findMany(args)`, `ProductModel.deleteMany(args)` (both already on `ProductModel` from Task 1), `OrderModel.countItemsForProducts(productIds)` (Task 1).
- Produces: `CategoryModel` with `findMany(args)`, `findUnique(args)`, `create(args)`, `update(args)`, `delete(args)`.

- [ ] **Step 1: Write `CategoryModel`**

```typescript
// apps/api/src/models/category.model.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class CategoryModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.CategoryFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.CategoryFindManyArgs>) {
    return this.prisma.category.findMany(args);
  }

  findUnique<T extends Prisma.CategoryFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.CategoryFindUniqueArgs>) {
    return this.prisma.category.findUnique(args);
  }

  create<T extends Prisma.CategoryCreateArgs>(args: Prisma.SelectSubset<T, Prisma.CategoryCreateArgs>) {
    return this.prisma.category.create(args);
  }

  update<T extends Prisma.CategoryUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.CategoryUpdateArgs>) {
    return this.prisma.category.update(args);
  }

  delete<T extends Prisma.CategoryDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.CategoryDeleteArgs>) {
    return this.prisma.category.delete(args);
  }
}
```

- [ ] **Step 2: Write `CategoryModel`'s test**

```typescript
// apps/api/src/models/category.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { CategoryModel } from './category.model';

describe('CategoryModel', () => {
  let model: CategoryModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(CategoryModel);
  });

  it('findMany delegates to prisma.category.findMany', async () => {
    prisma.category.findMany.mockResolvedValue([{ id: 'c1' }]);
    await expect(model.findMany({})).resolves.toEqual([{ id: 'c1' }]);
    expect(prisma.category.findMany).toHaveBeenCalledWith({});
  });

  it('findUnique delegates to prisma.category.findUnique', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
    await expect(model.findUnique({ where: { id: 'c1' } } as any)).resolves.toEqual({ id: 'c1' });
  });

  it('create delegates to prisma.category.create', async () => {
    prisma.category.create.mockResolvedValue({ id: 'c1' });
    const args = { data: { name: 'Phones', slug: 'phones' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.category.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.category.update', async () => {
    prisma.category.update.mockResolvedValue({ id: 'c1' });
    const args = { where: { id: 'c1' }, data: { name: 'New' } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.category.update).toHaveBeenCalledWith(args);
  });

  it('delete delegates to prisma.category.delete', async () => {
    prisma.category.delete.mockResolvedValue({ id: 'c1' });
    const args = { where: { id: 'c1' } };
    await expect(model.delete(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.category.delete).toHaveBeenCalledWith(args);
  });
});
```

- [ ] **Step 3: Register `CategoryModel` in `ModelsModule`**

`ProductModel.deleteMany` already exists from Task 1 — no change needed there.

```typescript
// apps/api/src/models/models.module.ts
import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';
import { BrandModel } from './brand.model';
import { CategoryModel } from './category.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel],
})
export class ModelsModule {}
```

- [ ] **Step 4: Refactor `CategoriesService`**

Replace the whole file:

```typescript
// apps/api/src/modules/categories/categories.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryModel } from '../../models/category.model';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import { slugify } from '../../common/utils/slugify';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categories: CategoryModel,
    private readonly products: ProductModel,
    private readonly orders: OrderModel,
  ) {}

  /** Public list, enriched with product counts for nav + admin. */
  list() {
    return this.categories.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        parentId: true,
        _count: { select: { products: true } },
      },
    });
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || slugify(dto.name);
    await this.assertSlugFree(slug);
    return this.categories.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description || null,
        imageUrl: dto.imageUrl || null,
        parentId: dto.parentId || null,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.getOrThrow(id);
    const slug = dto.slug || (dto.name ? slugify(dto.name) : undefined);
    if (slug) await this.assertSlugFree(slug, id);
    return this.categories.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug && { slug }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId || null }),
      },
    });
  }

  async remove(id: string) {
    const category = await this.categories.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found');

    const products = await this.products.findMany({
      where: { categoryId: id },
      select: { id: true, isActive: true },
    });

    if (products.length > 0) {
      if (products.some((p) => p.isActive)) {
        throw new BadRequestException(
          'This category still has active products. Remove or reassign them first.',
        );
      }
      const ids = products.map((p) => p.id);
      const withOrders = await this.orders.countItemsForProducts(ids);
      if (withOrders > 0) {
        throw new BadRequestException(
          'This category has archived products linked to past orders, so it can’t be deleted.',
        );
      }
      await this.products.deleteMany({ where: { id: { in: ids } } });
    }

    await this.categories.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async getOrThrow(id: string) {
    const c = await this.categories.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  private async assertSlugFree(slug: string, exceptId?: string) {
    const existing = await this.categories.findUnique({ where: { slug }, select: { id: true } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`A category with slug "${slug}" already exists`);
    }
  }
}
```

- [ ] **Step 5: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models/category.model.ts apps/api/src/models/category.model.spec.ts apps/api/src/models/models.module.ts apps/api/src/modules/categories/categories.service.ts
git commit -m "refactor(api): extract CategoryModel data-access layer"
```

---

### Task 6: `BannerModel`

**Files:**
- Create: `apps/api/src/models/banner.model.ts`
- Create: `apps/api/src/models/banner.model.spec.ts`
- Modify: `apps/api/src/models/models.module.ts` — add `BannerModel`
- Modify: `apps/api/src/modules/banners/banners.service.ts`

**Interfaces:**
- Consumes: nothing from other tasks — self-contained.
- Produces: `BannerModel` with `findMany(args)`, `create(args)`, `update(args)`, `delete(args)`, `findUnique(args)`.

- [ ] **Step 1: Write `BannerModel`**

```typescript
// apps/api/src/models/banner.model.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class BannerModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.BannerFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.BannerFindManyArgs>) {
    return this.prisma.banner.findMany(args);
  }

  findUnique<T extends Prisma.BannerFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.BannerFindUniqueArgs>) {
    return this.prisma.banner.findUnique(args);
  }

  create<T extends Prisma.BannerCreateArgs>(args: Prisma.SelectSubset<T, Prisma.BannerCreateArgs>) {
    return this.prisma.banner.create(args);
  }

  update<T extends Prisma.BannerUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.BannerUpdateArgs>) {
    return this.prisma.banner.update(args);
  }

  delete<T extends Prisma.BannerDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.BannerDeleteArgs>) {
    return this.prisma.banner.delete(args);
  }
}
```

- [ ] **Step 2: Write `BannerModel`'s test**

```typescript
// apps/api/src/models/banner.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { BannerModel } from './banner.model';

describe('BannerModel', () => {
  let model: BannerModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      banner: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BannerModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(BannerModel);
  });

  it('findMany delegates to prisma.banner.findMany', async () => {
    prisma.banner.findMany.mockResolvedValue([{ id: 'b1' }]);
    await expect(model.findMany({})).resolves.toEqual([{ id: 'b1' }]);
    expect(prisma.banner.findMany).toHaveBeenCalledWith({});
  });

  it('findUnique delegates to prisma.banner.findUnique', async () => {
    prisma.banner.findUnique.mockResolvedValue({ id: 'b1' });
    await expect(model.findUnique({ where: { id: 'b1' } } as any)).resolves.toEqual({ id: 'b1' });
  });

  it('create delegates to prisma.banner.create', async () => {
    prisma.banner.create.mockResolvedValue({ id: 'b1' });
    const args = { data: { title: 'Sale' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.banner.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.banner.update', async () => {
    prisma.banner.update.mockResolvedValue({ id: 'b1' });
    const args = { where: { id: 'b1' }, data: { title: 'New' } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.banner.update).toHaveBeenCalledWith(args);
  });

  it('delete delegates to prisma.banner.delete', async () => {
    prisma.banner.delete.mockResolvedValue({ id: 'b1' });
    const args = { where: { id: 'b1' } };
    await expect(model.delete(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.banner.delete).toHaveBeenCalledWith(args);
  });
});
```

- [ ] **Step 3: Register `BannerModel` in `ModelsModule`**

```typescript
// apps/api/src/models/models.module.ts
import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';
import { BrandModel } from './brand.model';
import { CategoryModel } from './category.model';
import { BannerModel } from './banner.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel, BannerModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel, BannerModel],
})
export class ModelsModule {}
```

- [ ] **Step 4: Refactor `BannersService`**

Replace the whole file:

```typescript
// apps/api/src/modules/banners/banners.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BannerModel } from '../../models/banner.model';
import type { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';

@Injectable()
export class BannersService {
  constructor(private readonly banners: BannerModel) {}

  /** Storefront: active slides in display order. */
  activeBanners() {
    return this.banners.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Admin: every banner. */
  list() {
    return this.banners.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(dto: CreateBannerDto) {
    return this.banners.create({
      data: this.clean(dto) as Prisma.BannerCreateInput,
    });
  }

  async update(id: string, dto: UpdateBannerDto) {
    await this.getOrThrow(id);
    return this.banners.update({
      where: { id },
      data: this.clean(dto) as Prisma.BannerUpdateInput,
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.banners.delete({ where: { id } });
    return { id, deleted: true };
  }

  private clean(dto: CreateBannerDto | UpdateBannerDto) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) {
      out[k] = v === '' ? null : v;
    }
    return out;
  }

  private async getOrThrow(id: string) {
    const b = await this.banners.findUnique({ where: { id }, select: { id: true } });
    if (!b) throw new NotFoundException('Banner not found');
    return b;
  }
}
```

- [ ] **Step 5: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models/banner.model.ts apps/api/src/models/banner.model.spec.ts apps/api/src/models/models.module.ts apps/api/src/modules/banners/banners.service.ts
git commit -m "refactor(api): extract BannerModel data-access layer"
```

---

### Task 7: `FlashSaleModel`

**Files:**
- Create: `apps/api/src/models/flash-sale.model.ts`
- Create: `apps/api/src/models/flash-sale.model.spec.ts`
- Modify: `apps/api/src/models/models.module.ts` — add `FlashSaleModel`
- Modify: `apps/api/src/modules/flash-sales/flash-sales.service.ts`

**Interfaces:**
- Consumes: `ProductModel.findUnique(args)` (Task 1).
- Produces: `FlashSaleModel` with `findMany(args)`, `findFirst(args)`, `findUnique(args)`, `create(args)`, `update(args)`, `delete(args)`, `upsertProduct(args)`, `deleteManyProducts(args)`.

- [ ] **Step 1: Write `FlashSaleModel`**

```typescript
// apps/api/src/models/flash-sale.model.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class FlashSaleModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.FlashSaleFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleFindManyArgs>) {
    return this.prisma.flashSale.findMany(args);
  }

  findFirst<T extends Prisma.FlashSaleFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleFindFirstArgs>) {
    return this.prisma.flashSale.findFirst(args);
  }

  findUnique<T extends Prisma.FlashSaleFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleFindUniqueArgs>) {
    return this.prisma.flashSale.findUnique(args);
  }

  create<T extends Prisma.FlashSaleCreateArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleCreateArgs>) {
    return this.prisma.flashSale.create(args);
  }

  update<T extends Prisma.FlashSaleUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleUpdateArgs>) {
    return this.prisma.flashSale.update(args);
  }

  delete<T extends Prisma.FlashSaleDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleDeleteArgs>) {
    return this.prisma.flashSale.delete(args);
  }

  upsertProduct<T extends Prisma.FlashSaleProductUpsertArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleProductUpsertArgs>) {
    return this.prisma.flashSaleProduct.upsert(args);
  }

  deleteManyProducts(args: Prisma.FlashSaleProductDeleteManyArgs) {
    return this.prisma.flashSaleProduct.deleteMany(args);
  }
}
```

- [ ] **Step 2: Write `FlashSaleModel`'s test**

```typescript
// apps/api/src/models/flash-sale.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { FlashSaleModel } from './flash-sale.model';

describe('FlashSaleModel', () => {
  let model: FlashSaleModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      flashSale: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      flashSaleProduct: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FlashSaleModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(FlashSaleModel);
  });

  it('findMany delegates to prisma.flashSale.findMany', async () => {
    prisma.flashSale.findMany.mockResolvedValue([{ id: 'fs1' }]);
    await expect(model.findMany({})).resolves.toEqual([{ id: 'fs1' }]);
    expect(prisma.flashSale.findMany).toHaveBeenCalledWith({});
  });

  it('findFirst delegates to prisma.flashSale.findFirst', async () => {
    prisma.flashSale.findFirst.mockResolvedValue({ id: 'fs1' });
    const args = { where: { isActive: true } };
    await expect(model.findFirst(args as any)).resolves.toEqual({ id: 'fs1' });
    expect(prisma.flashSale.findFirst).toHaveBeenCalledWith(args);
  });

  it('findUnique delegates to prisma.flashSale.findUnique', async () => {
    prisma.flashSale.findUnique.mockResolvedValue({ id: 'fs1' });
    await expect(model.findUnique({ where: { id: 'fs1' } } as any)).resolves.toEqual({ id: 'fs1' });
  });

  it('create delegates to prisma.flashSale.create', async () => {
    prisma.flashSale.create.mockResolvedValue({ id: 'fs1' });
    const args = { data: { name: 'Sale', slug: 'sale' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'fs1' });
    expect(prisma.flashSale.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.flashSale.update', async () => {
    prisma.flashSale.update.mockResolvedValue({ id: 'fs1' });
    const args = { where: { id: 'fs1' }, data: { isActive: false } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'fs1' });
    expect(prisma.flashSale.update).toHaveBeenCalledWith(args);
  });

  it('delete delegates to prisma.flashSale.delete', async () => {
    prisma.flashSale.delete.mockResolvedValue({ id: 'fs1' });
    const args = { where: { id: 'fs1' } };
    await expect(model.delete(args as any)).resolves.toEqual({ id: 'fs1' });
    expect(prisma.flashSale.delete).toHaveBeenCalledWith(args);
  });

  it('upsertProduct delegates to prisma.flashSaleProduct.upsert', async () => {
    prisma.flashSaleProduct.upsert.mockResolvedValue({ flashSaleId: 'fs1', productId: 'p1' });
    const args = { where: { flashSaleId_productId: { flashSaleId: 'fs1', productId: 'p1' } }, create: {}, update: {} };
    await expect(model.upsertProduct(args as any)).resolves.toEqual({ flashSaleId: 'fs1', productId: 'p1' });
    expect(prisma.flashSaleProduct.upsert).toHaveBeenCalledWith(args);
  });

  it('deleteManyProducts delegates to prisma.flashSaleProduct.deleteMany', async () => {
    prisma.flashSaleProduct.deleteMany.mockResolvedValue({ count: 1 });
    const args = { where: { flashSaleId: 'fs1', productId: 'p1' } };
    await expect(model.deleteManyProducts(args as any)).resolves.toEqual({ count: 1 });
    expect(prisma.flashSaleProduct.deleteMany).toHaveBeenCalledWith(args);
  });
});
```

- [ ] **Step 3: Register `FlashSaleModel` in `ModelsModule`**

```typescript
// apps/api/src/models/models.module.ts
import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';
import { BrandModel } from './brand.model';
import { CategoryModel } from './category.model';
import { BannerModel } from './banner.model';
import { FlashSaleModel } from './flash-sale.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel, BannerModel, FlashSaleModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel, BannerModel, FlashSaleModel],
})
export class ModelsModule {}
```

- [ ] **Step 4: Refactor `FlashSalesService`**

Replace the whole file:

```typescript
// apps/api/src/modules/flash-sales/flash-sales.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FlashSaleModel } from '../../models/flash-sale.model';
import { ProductModel } from '../../models/product.model';
import { slugify } from '../../common/utils/slugify';
import type {
  CreateFlashSaleDto,
  UpdateFlashSaleDto,
  AddFlashSaleProductDto,
} from './dto/flash-sale.dto';

const productCard = {
  select: {
    id: true,
    name: true,
    slug: true,
    price: true,
    currency: true,
    stock: true,
    images: { orderBy: { position: 'asc' as const }, take: 1, select: { url: true, alt: true } },
  },
} satisfies Prisma.ProductDefaultArgs;

@Injectable()
export class FlashSalesService {
  constructor(
    private readonly flashSales: FlashSaleModel,
    private readonly products: ProductModel,
  ) {}

  list() {
    return this.flashSales.findMany({
      orderBy: { createdAt: 'desc' },
      include: { products: { include: { product: productCard } } },
    });
  }

  /** Storefront: products in the currently-running sale (flat, with sale price). */
  async active() {
    const now = new Date();
    const sale = await this.flashSales.findFirst({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: 'asc' },
      include: { products: { include: { product: productCard } } },
    });
    if (!sale) return null;
    return {
      id: sale.id,
      name: sale.name,
      slug: sale.slug,
      endsAt: sale.endsAt,
      items: sale.products
        .filter((p) => p.product.stock > 0)
        .map((p) => ({ salePrice: p.salePrice, soldCount: p.soldCount, product: p.product })),
    };
  }

  async create(dto: CreateFlashSaleDto) {
    const slug = dto.slug || slugify(dto.name);
    const exists = await this.flashSales.findUnique({ where: { slug }, select: { id: true } });
    if (exists) throw new ConflictException(`A flash sale with slug "${slug}" already exists`);
    return this.flashSales.create({
      data: { name: dto.name, slug, startsAt: dto.startsAt, endsAt: dto.endsAt, isActive: dto.isActive },
      include: { products: { include: { product: productCard } } },
    });
  }

  async update(id: string, dto: UpdateFlashSaleDto) {
    await this.getOrThrow(id);
    if (dto.startsAt && dto.endsAt && dto.endsAt <= dto.startsAt) {
      throw new BadRequestException('End must be after start');
    }
    const slug = dto.slug || (dto.name ? slugify(dto.name) : undefined);
    return this.flashSales.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug && { slug }),
        ...(dto.startsAt !== undefined && { startsAt: dto.startsAt }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { products: { include: { product: productCard } } },
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.flashSales.delete({ where: { id } });
    return { id, deleted: true };
  }

  async addProduct(id: string, dto: AddFlashSaleProductDto) {
    await this.getOrThrow(id);
    const product = await this.products.findUnique({ where: { id: dto.productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    return this.flashSales.upsertProduct({
      where: { flashSaleId_productId: { flashSaleId: id, productId: dto.productId } },
      create: {
        flashSaleId: id,
        productId: dto.productId,
        salePrice: new Prisma.Decimal(dto.salePrice),
        inventoryCap: dto.inventoryCap ?? null,
      },
      update: {
        salePrice: new Prisma.Decimal(dto.salePrice),
        inventoryCap: dto.inventoryCap ?? null,
      },
      include: { product: productCard },
    });
  }

  async removeProduct(id: string, productId: string) {
    await this.flashSales.deleteManyProducts({ where: { flashSaleId: id, productId } });
    return { flashSaleId: id, productId, removed: true };
  }

  private async getOrThrow(id: string) {
    const s = await this.flashSales.findUnique({ where: { id }, select: { id: true } });
    if (!s) throw new NotFoundException('Flash sale not found');
    return s;
  }
}
```

- [ ] **Step 5: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models/flash-sale.model.ts apps/api/src/models/flash-sale.model.spec.ts apps/api/src/models/models.module.ts apps/api/src/modules/flash-sales/flash-sales.service.ts
git commit -m "refactor(api): extract FlashSaleModel data-access layer"
```

---

### Task 8: `WishlistModel`

**Files:**
- Create: `apps/api/src/models/wishlist.model.ts`
- Create: `apps/api/src/models/wishlist.model.spec.ts`
- Modify: `apps/api/src/models/models.module.ts` — add `WishlistModel`
- Modify: `apps/api/src/modules/wishlist/wishlist.service.ts`

**Interfaces:**
- Consumes: `ProductModel.findFirst(args)` (Task 1).
- Produces: `WishlistModel` with `findMany(args)`, `findManyIds(args)`, `upsert(args)`, `deleteMany(args)`.

- [ ] **Step 1: Write `WishlistModel`**

```typescript
// apps/api/src/models/wishlist.model.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class WishlistModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.WishlistItemFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.WishlistItemFindManyArgs>) {
    return this.prisma.wishlistItem.findMany(args);
  }

  upsert<T extends Prisma.WishlistItemUpsertArgs>(args: Prisma.SelectSubset<T, Prisma.WishlistItemUpsertArgs>) {
    return this.prisma.wishlistItem.upsert(args);
  }

  deleteMany(args: Prisma.WishlistItemDeleteManyArgs) {
    return this.prisma.wishlistItem.deleteMany(args);
  }
}
```

- [ ] **Step 2: Write `WishlistModel`'s test**

```typescript
// apps/api/src/models/wishlist.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { WishlistModel } from './wishlist.model';

describe('WishlistModel', () => {
  let model: WishlistModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      wishlistItem: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WishlistModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(WishlistModel);
  });

  it('findMany delegates to prisma.wishlistItem.findMany', async () => {
    prisma.wishlistItem.findMany.mockResolvedValue([{ productId: 'p1' }]);
    const args = { where: { userId: 'u1' } };
    await expect(model.findMany(args as any)).resolves.toEqual([{ productId: 'p1' }]);
    expect(prisma.wishlistItem.findMany).toHaveBeenCalledWith(args);
  });

  it('upsert delegates to prisma.wishlistItem.upsert', async () => {
    prisma.wishlistItem.upsert.mockResolvedValue({ userId: 'u1', productId: 'p1' });
    const args = {
      where: { userId_productId: { userId: 'u1', productId: 'p1' } },
      create: { userId: 'u1', productId: 'p1' },
      update: {},
    };
    await expect(model.upsert(args as any)).resolves.toEqual({ userId: 'u1', productId: 'p1' });
    expect(prisma.wishlistItem.upsert).toHaveBeenCalledWith(args);
  });

  it('deleteMany delegates to prisma.wishlistItem.deleteMany', async () => {
    prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
    const args = { where: { userId: 'u1', productId: 'p1' } };
    await expect(model.deleteMany(args as any)).resolves.toEqual({ count: 1 });
    expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith(args);
  });
});
```

- [ ] **Step 3: Register `WishlistModel` in `ModelsModule`**

```typescript
// apps/api/src/models/models.module.ts
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

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel, BannerModel, FlashSaleModel, WishlistModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel, BannerModel, FlashSaleModel, WishlistModel],
})
export class ModelsModule {}
```

- [ ] **Step 4: Refactor `WishlistService`**

Replace the whole file:

```typescript
// apps/api/src/modules/wishlist/wishlist.service.ts
import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WishlistModel } from '../../models/wishlist.model';
import { ProductModel } from '../../models/product.model';

const productSummaryInclude = {
  images: { orderBy: { position: 'asc' as const }, take: 1 },
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    private readonly wishlist: WishlistModel,
    private readonly products: ProductModel,
  ) {}

  /** List the user's wishlist, newest first, with full product cards. */
  async list(userId: string) {
    return this.wishlist.findMany({
      where: { userId, product: { isActive: true } },
      orderBy: { createdAt: 'desc' },
      include: { product: { include: productSummaryInclude } },
    });
  }

  /** Just the product IDs — lets the frontend hydrate heart-toggle state cheaply. */
  async listIds(userId: string): Promise<string[]> {
    const rows = await this.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }

  /** Add a product. Idempotent — adding twice is a no-op, not an error. */
  async add(userId: string, productId: string) {
    const product = await this.products.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { productId, wishlisted: true };
  }

  /** Remove a product. Idempotent — removing something absent is fine. */
  async remove(userId: string, productId: string) {
    await this.wishlist.deleteMany({ where: { userId, productId } });
    return { productId, wishlisted: false };
  }
}
```

- [ ] **Step 5: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models/wishlist.model.ts apps/api/src/models/wishlist.model.spec.ts apps/api/src/models/models.module.ts apps/api/src/modules/wishlist/wishlist.service.ts
git commit -m "refactor(api): extract WishlistModel data-access layer"
```

---

### Task 9: `SettingsModel`

**Files:**
- Create: `apps/api/src/models/settings.model.ts`
- Create: `apps/api/src/models/settings.model.spec.ts`
- Modify: `apps/api/src/models/models.module.ts` — add `SettingsModel`
- Modify: `apps/api/src/modules/settings/settings.service.ts`

**Interfaces:**
- Consumes: nothing from other tasks — self-contained.
- Produces: `SettingsModel` with `upsert(args)`.

- [ ] **Step 1: Write `SettingsModel`**

```typescript
// apps/api/src/models/settings.model.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class SettingsModel {
  constructor(private readonly prisma: PrismaService) {}

  upsert<T extends Prisma.SiteSettingsUpsertArgs>(args: Prisma.SelectSubset<T, Prisma.SiteSettingsUpsertArgs>) {
    return this.prisma.siteSettings.upsert(args);
  }
}
```

- [ ] **Step 2: Write `SettingsModel`'s test**

```typescript
// apps/api/src/models/settings.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { SettingsModel } from './settings.model';

describe('SettingsModel', () => {
  let model: SettingsModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = { siteSettings: { upsert: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(SettingsModel);
  });

  it('upsert delegates to prisma.siteSettings.upsert', async () => {
    prisma.siteSettings.upsert.mockResolvedValue({ id: 'singleton' });
    const args = { where: { id: 'singleton' }, create: { id: 'singleton' }, update: {} };
    await expect(model.upsert(args as any)).resolves.toEqual({ id: 'singleton' });
    expect(prisma.siteSettings.upsert).toHaveBeenCalledWith(args);
  });
});
```

- [ ] **Step 3: Register `SettingsModel` in `ModelsModule`**

```typescript
// apps/api/src/models/models.module.ts
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

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel, BannerModel, FlashSaleModel, WishlistModel, SettingsModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel, BannerModel, FlashSaleModel, WishlistModel, SettingsModel],
})
export class ModelsModule {}
```

- [ ] **Step 4: Refactor `SettingsService`**

Replace the whole file:

```typescript
// apps/api/src/modules/settings/settings.service.ts
import { Injectable } from '@nestjs/common';
import { SettingsModel } from '../../models/settings.model';
import type { UpdateSettingsDto } from './dto/settings.dto';

const SINGLETON_ID = 'singleton';

@Injectable()
export class SettingsService {
  constructor(private readonly settings: SettingsModel) {}

  /** Always returns the one settings row, creating defaults on first read. */
  async get() {
    return this.settings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
  }

  /** Admin update. Empty strings clear optional fields (stored as null). */
  async update(dto: UpdateSettingsDto) {
    const data = Object.fromEntries(
      Object.entries(dto).map(([k, v]) => [k, v === '' ? null : v]),
    );
    return this.settings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
  }
}
```

- [ ] **Step 5: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models/settings.model.ts apps/api/src/models/settings.model.spec.ts apps/api/src/models/models.module.ts apps/api/src/modules/settings/settings.service.ts
git commit -m "refactor(api): extract SettingsModel data-access layer"
```

---

### Task 10: `UserModel` + refactor `AuthService` + split `UsersModule`

The largest task: `AuthService` is the biggest, most security-sensitive service in the codebase (JWT sessions, argon2 password hashing, email verification, password reset, TOTP 2FA). `UsersModule` today defines its Service and Controller inline in one file instead of separate files like every other module — this task also splits it into `users.controller.ts` / `users.service.ts`, since leaving it inline while every other module now has a Model would undercut the "visible MVC structure" goal. No security behavior changes: every hash, token, comparison, and transaction is preserved exactly.

**Files:**
- Create: `apps/api/src/models/user.model.ts`
- Create: `apps/api/src/models/user.model.spec.ts`
- Modify: `apps/api/src/models/models.module.ts` — add `UserModel`
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/users/users.service.ts`
- Create: `apps/api/src/modules/users/users.controller.ts`
- Modify: `apps/api/src/modules/users/users.module.ts`

**Interfaces:**
- Consumes: nothing from other tasks — self-contained.
- Produces: `UserModel` — see the full method list in Step 1 (includes `count(args)` and `findManyAndCount(args, countArgs)`, needed by `AdminService` in Task 11). Any future module needing User/Session/token data goes through this, not `PrismaService`.

- [ ] **Step 1: Write `UserModel`**

```typescript
// apps/api/src/models/user.model.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class UserModel {
  constructor(private readonly prisma: PrismaService) {}

  // ─── User ───

  findUnique<T extends Prisma.UserFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.UserFindUniqueArgs>) {
    return this.prisma.user.findUnique(args);
  }

  findFirst<T extends Prisma.UserFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>) {
    return this.prisma.user.findFirst(args);
  }

  findUniqueOrThrow<T extends Prisma.UserFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, Prisma.UserFindUniqueOrThrowArgs>) {
    return this.prisma.user.findUniqueOrThrow(args);
  }

  create<T extends Prisma.UserCreateArgs>(args: Prisma.SelectSubset<T, Prisma.UserCreateArgs>) {
    return this.prisma.user.create(args);
  }

  update<T extends Prisma.UserUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>) {
    return this.prisma.user.update(args);
  }

  count(args: Prisma.UserCountArgs = {}) {
    return this.prisma.user.count(args);
  }

  findManyAndCount<T extends Prisma.UserFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>,
    countArgs: Prisma.UserCountArgs,
  ) {
    return this.prisma.$transaction([
      this.prisma.user.findMany(args),
      this.prisma.user.count(countArgs),
    ]);
  }

  // ─── Email verification ───

  createVerificationToken<T extends Prisma.VerificationTokenCreateArgs>(args: Prisma.SelectSubset<T, Prisma.VerificationTokenCreateArgs>) {
    return this.prisma.verificationToken.create(args);
  }

  findVerificationToken(tokenHash: string) {
    return this.prisma.verificationToken.findUnique({ where: { tokenHash } });
  }

  /** Atomically marks the user verified and the token used. */
  consumeVerificationToken(tokenId: string, userId: string) {
    return this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
      this.prisma.verificationToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
    ]);
  }

  // ─── Password reset ───

  createPasswordResetToken<T extends Prisma.PasswordResetTokenCreateArgs>(args: Prisma.SelectSubset<T, Prisma.PasswordResetTokenCreateArgs>) {
    return this.prisma.passwordResetToken.create(args);
  }

  findPasswordResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  /** Atomically sets the new password, marks the token used, and revokes every session. */
  resetPasswordTransaction(tokenId: string, userId: string, passwordHash: string) {
    return this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
  }

  // ─── Sessions ───

  findSessionByRefreshHash(tokenHash: string) {
    return this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });
  }

  createSession<T extends Prisma.SessionCreateArgs>(args: Prisma.SelectSubset<T, Prisma.SessionCreateArgs>) {
    return this.prisma.session.create(args);
  }

  deleteSession(id: string) {
    return this.prisma.session.delete({ where: { id } });
  }

  deleteSessionsForUser(userId: string) {
    return this.prisma.session.deleteMany({ where: { userId } });
  }

  deleteSessionsByRefreshHash(tokenHash: string) {
    return this.prisma.session.deleteMany({ where: { refreshTokenHash: tokenHash } });
  }

  // ─── Two-factor (TOTP) ───

  upsertTwoFactorSecret<T extends Prisma.TwoFactorSecretUpsertArgs>(args: Prisma.SelectSubset<T, Prisma.TwoFactorSecretUpsertArgs>) {
    return this.prisma.twoFactorSecret.upsert(args);
  }

  findTwoFactorSecret(userId: string) {
    return this.prisma.twoFactorSecret.findUnique({ where: { userId } });
  }

  /** Atomically stores the recovery codes and flips twoFactorEnabled on. */
  enableTwoFactorTransaction(userId: string, hashedRecoveryCodes: string[]) {
    return this.prisma.$transaction([
      this.prisma.twoFactorSecret.update({ where: { userId }, data: { recoveryCodes: hashedRecoveryCodes } }),
      this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } }),
    ]);
  }

  /** Atomically flips twoFactorEnabled off and deletes the secret. */
  disableTwoFactorTransaction(userId: string) {
    return this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } }),
      this.prisma.twoFactorSecret.delete({ where: { userId } }),
    ]);
  }
}
```

- [ ] **Step 2: Write `UserModel`'s test**

```typescript
// apps/api/src/models/user.model.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { UserModel } from './user.model';

describe('UserModel', () => {
  let model: UserModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
      verificationToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      passwordResetToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      session: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
      twoFactorSecret: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(UserModel);
  });

  it('findUnique delegates to prisma.user.findUnique', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await expect(model.findUnique({ where: { id: 'u1' } } as any)).resolves.toEqual({ id: 'u1' });
  });

  it('findFirst delegates to prisma.user.findFirst', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
    const args = { where: { OR: [{ googleId: 'g1' }, { email: 'a@b.com' }] } };
    await expect(model.findFirst(args as any)).resolves.toEqual({ id: 'u1' });
    expect(prisma.user.findFirst).toHaveBeenCalledWith(args);
  });

  it('findUniqueOrThrow delegates to prisma.user.findUniqueOrThrow', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1' });
    await expect(model.findUniqueOrThrow({ where: { id: 'u1' } } as any)).resolves.toEqual({ id: 'u1' });
  });

  it('create delegates to prisma.user.create', async () => {
    prisma.user.create.mockResolvedValue({ id: 'u1' });
    const args = { data: { email: 'a@b.com', name: 'A' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'u1' });
    expect(prisma.user.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.user.update', async () => {
    prisma.user.update.mockResolvedValue({ id: 'u1' });
    const args = { where: { id: 'u1' }, data: { lastLoginAt: new Date() } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'u1' });
    expect(prisma.user.update).toHaveBeenCalledWith(args);
  });

  it('count delegates to prisma.user.count', async () => {
    prisma.user.count.mockResolvedValue(42);
    await expect(model.count({ where: { role: 'ADMIN' } } as any)).resolves.toBe(42);
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: 'ADMIN' } });
  });

  it('findManyAndCount runs findMany + count inside one $transaction call', async () => {
    prisma.$transaction.mockResolvedValue([[{ id: 'u1' }], 1]);
    await model.findManyAndCount({ where: {} } as any, { where: {} } as any);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.findMany).toHaveBeenCalled();
    expect(prisma.user.count).toHaveBeenCalled();
  });

  it('createVerificationToken delegates to prisma.verificationToken.create', async () => {
    prisma.verificationToken.create.mockResolvedValue({ id: 'vt1' });
    const args = { data: { userId: 'u1', tokenHash: 'h', expiresAt: new Date() } };
    await expect(model.createVerificationToken(args as any)).resolves.toEqual({ id: 'vt1' });
    expect(prisma.verificationToken.create).toHaveBeenCalledWith(args);
  });

  it('findVerificationToken looks up by tokenHash', async () => {
    prisma.verificationToken.findUnique.mockResolvedValue({ id: 'vt1' });
    await expect(model.findVerificationToken('h')).resolves.toEqual({ id: 'vt1' });
    expect(prisma.verificationToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: 'h' } });
  });

  it('consumeVerificationToken marks the user verified and the token used inside one transaction', async () => {
    prisma.$transaction.mockResolvedValue([{ id: 'u1' }, { id: 'vt1' }]);
    await model.consumeVerificationToken('vt1', 'u1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' } }));
    expect(prisma.verificationToken.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'vt1' } }));
  });

  it('createPasswordResetToken delegates to prisma.passwordResetToken.create', async () => {
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'pr1' });
    const args = { data: { userId: 'u1', tokenHash: 'h', expiresAt: new Date() } };
    await expect(model.createPasswordResetToken(args as any)).resolves.toEqual({ id: 'pr1' });
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(args);
  });

  it('findPasswordResetToken looks up by tokenHash', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 'pr1' });
    await expect(model.findPasswordResetToken('h')).resolves.toEqual({ id: 'pr1' });
    expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: 'h' } });
  });

  it('resetPasswordTransaction updates the password, consumes the token, and revokes sessions in one transaction', async () => {
    prisma.$transaction.mockResolvedValue([{ id: 'u1' }, { id: 'pr1' }, { count: 2 }]);
    await model.resetPasswordTransaction('pr1', 'u1', 'hashed');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'u1' },
      data: { passwordHash: 'hashed', failedLoginAttempts: 0, lockedUntil: null },
    }));
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('findSessionByRefreshHash looks up the session with its user', async () => {
    prisma.session.findUnique.mockResolvedValue({ id: 's1', user: { id: 'u1' } });
    await expect(model.findSessionByRefreshHash('h')).resolves.toEqual({ id: 's1', user: { id: 'u1' } });
    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { refreshTokenHash: 'h' },
      include: { user: true },
    });
  });

  it('createSession delegates to prisma.session.create', async () => {
    prisma.session.create.mockResolvedValue({ id: 's1' });
    const args = { data: { id: 's1', userId: 'u1', refreshTokenHash: 'h', expiresAt: new Date() } };
    await expect(model.createSession(args as any)).resolves.toEqual({ id: 's1' });
    expect(prisma.session.create).toHaveBeenCalledWith(args);
  });

  it('deleteSession delegates to prisma.session.delete', async () => {
    prisma.session.delete.mockResolvedValue({ id: 's1' });
    await expect(model.deleteSession('s1')).resolves.toEqual({ id: 's1' });
    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('deleteSessionsForUser delegates to prisma.session.deleteMany by userId', async () => {
    prisma.session.deleteMany.mockResolvedValue({ count: 3 });
    await expect(model.deleteSessionsForUser('u1')).resolves.toEqual({ count: 3 });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('deleteSessionsByRefreshHash delegates to prisma.session.deleteMany by refreshTokenHash', async () => {
    prisma.session.deleteMany.mockResolvedValue({ count: 1 });
    await expect(model.deleteSessionsByRefreshHash('h')).resolves.toEqual({ count: 1 });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { refreshTokenHash: 'h' } });
  });

  it('upsertTwoFactorSecret delegates to prisma.twoFactorSecret.upsert', async () => {
    prisma.twoFactorSecret.upsert.mockResolvedValue({ userId: 'u1' });
    const args = { where: { userId: 'u1' }, create: { userId: 'u1', secret: 's', recoveryCodes: [] }, update: {} };
    await expect(model.upsertTwoFactorSecret(args as any)).resolves.toEqual({ userId: 'u1' });
    expect(prisma.twoFactorSecret.upsert).toHaveBeenCalledWith(args);
  });

  it('findTwoFactorSecret looks up by userId', async () => {
    prisma.twoFactorSecret.findUnique.mockResolvedValue({ userId: 'u1', secret: 's' });
    await expect(model.findTwoFactorSecret('u1')).resolves.toEqual({ userId: 'u1', secret: 's' });
    expect(prisma.twoFactorSecret.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('enableTwoFactorTransaction stores recovery codes and flips twoFactorEnabled in one transaction', async () => {
    prisma.$transaction.mockResolvedValue([{ userId: 'u1' }, { id: 'u1' }]);
    await model.enableTwoFactorTransaction('u1', ['h1', 'h2']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.twoFactorSecret.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { recoveryCodes: ['h1', 'h2'] },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { twoFactorEnabled: true } });
  });

  it('disableTwoFactorTransaction flips twoFactorEnabled off and deletes the secret in one transaction', async () => {
    prisma.$transaction.mockResolvedValue([{ id: 'u1' }, { userId: 'u1' }]);
    await model.disableTwoFactorTransaction('u1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { twoFactorEnabled: false } });
    expect(prisma.twoFactorSecret.delete).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });
});
```

- [ ] **Step 3: Register `UserModel` in `ModelsModule`**

```typescript
// apps/api/src/models/models.module.ts
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
];

@Global()
@Module({
  providers: models,
  exports: models,
})
export class ModelsModule {}
```

(Switching to a `models` array here, instead of repeating all 11 names in both `providers` and `exports`, is a one-time cleanup now that the list has stabilized at its final size — every earlier task's inline two-array form remains correct for its point in the sequence.)

- [ ] **Step 4: Refactor `AuthService`**

Replace the whole file — only `this.prisma.*` calls become `this.users.*` calls; every security decision, message, and timing keeps its exact original shape:

```typescript
// apps/api/src/modules/auth/auth.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { UserModel } from '../../models/user.model';
import { MailService } from '../mail/mail.service';
import type { GoogleUserPayload } from './strategies/google.strategy';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
  TokenPair,
} from './interfaces/jwt.interface';

interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

interface LoginResult {
  user: { id: string; email: string; name: string; role: string };
  tokens?: TokenPair;
  requiresTwoFactor?: boolean;
}

/**
 * The single source of truth for everything authentication.
 *
 * Security choices made here are deliberate; see ARCHITECTURE.md §6.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly argonOptions: argon2.Options;

  constructor(
    private readonly users: UserModel,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    this.argonOptions = {
      type: argon2.argon2id,
      memoryCost: config.get<number>('ARGON2_MEMORY_COST', 65_536),
      timeCost: config.get<number>('ARGON2_TIME_COST', 3),
      parallelism: config.get<number>('ARGON2_PARALLELISM', 4),
    };

    authenticator.options = { window: 1 };
  }

  // ───────────────────────────────────────────────────────────────────
  // REGISTRATION
  // ───────────────────────────────────────────────────────────────────

  async register(input: { email: string; password: string; name: string }): Promise<{ message: string }> {
    const existing = await this.users.findUnique({ where: { email: input.email } });
    if (existing) {
      return { message: 'Account created. Please check your email to verify.' };
    }

    const passwordHash = await argon2.hash(input.password, this.argonOptions);

    const user = await this.users.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        authProvider: AuthProvider.LOCAL,
      },
    });

    const { raw, hash } = this.generateOneTimeToken();
    await this.users.createVerificationToken({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.mail.sendVerificationEmail(user.email, user.name, raw);

    this.logger.log({ msg: 'user.registered', userId: user.id });
    return { message: 'Account created. Please check your email to verify.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const hash = this.hashToken(token);
    const row = await this.users.findVerificationToken(hash);
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.users.consumeVerificationToken(row.id, row.userId);
    return { message: 'Email verified successfully.' };
  }

  // ───────────────────────────────────────────────────────────────────
  // LOGIN
  // ───────────────────────────────────────────────────────────────────

  async login(
    input: { email: string; password: string; twoFactorCode?: string },
    ctx: LoginContext,
  ): Promise<LoginResult> {
    const user = await this.users.findUnique({
      where: { email: input.email },
      include: { twoFactorSecret: true },
    });

    if (!user || !user.passwordHash) {
      await argon2.hash('dummy-password', this.argonOptions).catch(() => undefined);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account temporarily locked due to too many failed attempts. Try again later.',
      );
    }

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!input.twoFactorCode) {
        return {
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          requiresTwoFactor: true,
        };
      }
      const valid = authenticator.check(input.twoFactorCode, user.twoFactorSecret.secret);
      if (!valid) throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.users.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ctx.ipAddress,
      },
    });

    const tokens = await this.issueTokenPair(user, ctx);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const threshold = this.config.get<number>('ACCOUNT_LOCK_THRESHOLD', 5);
    const duration = this.config.get<number>('ACCOUNT_LOCK_DURATION', 1800);
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= threshold;
    await this.users.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + duration * 1000) : null,
      },
    });
    if (shouldLock) {
      this.logger.warn({ msg: 'account.locked', userId: user.id, attempts });
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH
  // ───────────────────────────────────────────────────────────────────

  async loginWithGoogle(payload: GoogleUserPayload, ctx: LoginContext): Promise<LoginResult> {
    let user = await this.users.findFirst({
      where: { OR: [{ googleId: payload.googleId }, { email: payload.email }] },
    });

    if (!user) {
      user = await this.users.create({
        data: {
          email: payload.email,
          name: payload.name,
          avatarUrl: payload.avatarUrl,
          googleId: payload.googleId,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: new Date(),
        },
      });
    } else if (!user.googleId) {
      user = await this.users.update({
        where: { id: user.id },
        data: {
          googleId: payload.googleId,
          emailVerified: user.emailVerified ?? new Date(),
        },
      });
    }

    const tokens = await this.issueTokenPair(user, ctx);
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, tokens };
  }

  // ───────────────────────────────────────────────────────────────────
  // REFRESH TOKEN ROTATION
  // ───────────────────────────────────────────────────────────────────

  async refresh(refreshToken: string, ctx: LoginContext): Promise<TokenPair> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Wrong token type');

    const tokenHash = this.hashToken(refreshToken);
    const session = await this.users.findSessionByRefreshHash(tokenHash);

    if (!session) {
      this.logger.warn({ msg: 'refresh.reuse_detected', sub: payload.sub });
      await this.users.deleteSessionsForUser(payload.sub);
      throw new UnauthorizedException('Token reuse detected — all sessions revoked');
    }
    if (session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.users.deleteSession(session.id);
    return this.issueTokenPair(session.user, ctx);
  }

  // ───────────────────────────────────────────────────────────────────
  // LOGOUT
  // ───────────────────────────────────────────────────────────────────

  async logout(refreshToken?: string): Promise<{ message: string }> {
    if (!refreshToken) return { message: 'Logged out' };
    const tokenHash = this.hashToken(refreshToken);
    await this.users.deleteSessionsByRefreshHash(tokenHash);
    return { message: 'Logged out' };
  }

  async logoutEverywhere(userId: string): Promise<{ message: string }> {
    await this.users.deleteSessionsForUser(userId);
    return { message: 'All sessions revoked' };
  }

  // ───────────────────────────────────────────────────────────────────
  // PASSWORD RESET
  // ───────────────────────────────────────────────────────────────────

  async forgotPassword(email: string, ipAddress?: string): Promise<{ message: string }> {
    const user = await this.users.findUnique({ where: { email } });
    if (user && user.authProvider === AuthProvider.LOCAL) {
      const { raw, hash } = this.generateOneTimeToken();
      await this.users.createPasswordResetToken({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          ipAddress,
        },
      });
      await this.mail.sendPasswordResetEmail(user.email, user.name, raw);
    }
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const hash = this.hashToken(token);
    const row = await this.users.findPasswordResetToken(hash);
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await argon2.hash(newPassword, this.argonOptions);
    await this.users.resetPasswordTransaction(row.id, row.userId, passwordHash);
    return { message: 'Password updated. Please log in again.' };
  }

  // ───────────────────────────────────────────────────────────────────
  // 2FA (TOTP)
  // ───────────────────────────────────────────────────────────────────

  async setup2FA(userId: string): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const user = await this.users.findUniqueOrThrow({ where: { id: userId } });
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA already enabled');
    }
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'Drikon', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

    await this.users.upsertTwoFactorSecret({
      where: { userId },
      create: { userId, secret, recoveryCodes: [] },
      update: { secret, recoveryCodes: [] },
    });
    return { secret, qrCodeDataUrl };
  }

  async enable2FA(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const row = await this.users.findTwoFactorSecret(userId);
    if (!row) throw new BadRequestException('Run 2FA setup first');
    if (!authenticator.check(code, row.secret)) {
      throw new BadRequestException('Invalid code');
    }
    const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(5).toString('hex'));
    const hashedCodes = recoveryCodes.map((c) => this.hashToken(c));
    await this.users.enableTwoFactorTransaction(userId, hashedCodes);
    return { recoveryCodes };
  }

  async disable2FA(userId: string, code: string): Promise<{ message: string }> {
    const row = await this.users.findTwoFactorSecret(userId);
    if (!row) throw new BadRequestException('2FA not enabled');
    if (!authenticator.check(code, row.secret)) {
      throw new BadRequestException('Invalid code');
    }
    await this.users.disableTwoFactorTransaction(userId);
    return { message: '2FA disabled' };
  }

  // ───────────────────────────────────────────────────────────────────
  // TOKEN HELPERS
  // ───────────────────────────────────────────────────────────────────

  private async issueTokenPair(user: User, ctx: LoginContext): Promise<TokenPair> {
    const accessTtl = Number(this.config.get('JWT_ACCESS_TTL') ?? 900);
    const refreshTtl = Number(this.config.get('JWT_REFRESH_TTL') ?? 604_800);

    const sessionId = randomUUID();
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti: accessJti,
    };
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      sid: sessionId,
      type: 'refresh',
      jti: refreshJti,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      }),
    ]);

    await this.users.createSession({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        userAgent: ctx.userAgent,
        ipAddress: ctx.ipAddress,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  // ───────────────────────────────────────────────────────────────────
  // PRIMITIVES
  // ───────────────────────────────────────────────────────────────────

  private generateOneTimeToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    return { raw, hash: this.hashToken(raw) };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
```

Note: the original file imported `timingSafeEqual` from `node:crypto` and `Prisma` from `@prisma/client` but never used either (confirmed via `grep -n "timingSafeEqual\|Prisma\." apps/api/src/modules/auth/auth.service.ts`, which only matches the import line) — both are dropped above, matching the file's actual pre-existing behavior.

- [ ] **Step 5: Split `UsersModule` into `users.service.ts` + `users.controller.ts`**

Create `apps/api/src/modules/users/users.service.ts`:

```typescript
// apps/api/src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { UserModel } from '../../models/user.model';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly users: UserModel) {}

  async getProfile(userId: string) {
    return this.users.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true, avatarUrl: true,
        role: true, emailVerified: true, twoFactorEnabled: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.users.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, email: true, name: true, phone: true, avatarUrl: true,
      },
    });
  }
}
```

Create `apps/api/src/modules/users/dto/update-profile.dto.ts` (the DTO was previously defined inline in `users.module.ts` — moving it to its own `dto/` file matches every other module's convention):

```typescript
// apps/api/src/modules/users/dto/update-profile.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/).optional(),
  avatarUrl: z.string().url().optional(),
});
export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}
```

Create `apps/api/src/modules/users/users.controller.ts`:

```typescript
// apps/api/src/modules/users/users.controller.ts
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators';

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(user.id, dto);
  }
}
```

Replace `apps/api/src/modules/users/users.module.ts`:

```typescript
// apps/api/src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 6: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 7: Manual smoke check (this task touches security-critical auth code — a build pass alone isn't enough confidence)**

Start the API (`pnpm --filter api dev`, requires local Postgres via `docker-compose up -d postgres` per `deploy/DEPLOY.md`) and exercise, via the Swagger UI or `curl`:
1. Register a new account, verify the email link works.
2. Log in, confirm access + refresh cookies are set.
3. Hit `GET /api/v1/users/me` with the access token, confirm the profile returns.
4. Refresh the token, confirm rotation works and the old refresh token is now rejected.
5. Log out, confirm the session is gone.

Expected: all five steps behave exactly as they did before this task (compare against `git stash` if in doubt).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/models/user.model.ts apps/api/src/models/user.model.spec.ts apps/api/src/models/models.module.ts apps/api/src/modules/auth/auth.service.ts apps/api/src/modules/users/users.service.ts apps/api/src/modules/users/users.controller.ts apps/api/src/modules/users/users.module.ts apps/api/src/modules/users/dto/update-profile.dto.ts
git commit -m "refactor(api): extract UserModel data-access layer; split UsersModule into controller/service"
```

---

### Task 11: Refactor `AdminService` to consume the existing Models

`AdminService` doesn't get its own Model — it's a read/write aggregator over Product, Order, User, and Review, and the spec calls for it to consume those Models directly rather than duplicating query logic.

**Files:**
- Modify: `apps/api/src/modules/admin/admin.service.ts`

**Interfaces:**
- Consumes: `ProductModel.count(args)`, `ProductModel.findMany(args)` (Task 1); `OrderModel.count(args)`, `OrderModel.aggregate(args)`, `OrderModel.findMany(args)`, `OrderModel.findManyAndCount(args, countArgs)`, `OrderModel.findUnique(args)`, `OrderModel.update(args)` (Task 1); `UserModel.count(args)`, `UserModel.findManyAndCount(args, countArgs)`, `UserModel.findUnique(args)`, `UserModel.update(args)` (Task 10); `ReviewModel.count(args)` (Task 2).
- Produces: nothing new — `AdminService`'s public methods (`stats`, `listOrders`, `updateOrderStatus`, `listUsers`, `updateUserRole`) keep their exact existing signatures; `AdminController` needs no changes.

**Behavioral note:** the original `stats()` ran its 9 queries (across Product, Order, User, Review) inside one `$transaction([...])` for snapshot isolation. Since Models don't reference each other or share a transaction handle across entities, and this is a read-only dashboard summary (not a financial calculation — a few hundred milliseconds of skew between "order count" and "top products" on an admin dashboard has no correctness impact), this task switches `stats()` to `Promise.all([...])` over the equivalent Model calls. Every other method (`listOrders`, `listUsers`) still batches its `findMany`+`count` pair through a single Model-level `$transaction` via `findManyAndCount`, preserving that guarantee exactly where it existed for a single entity.

- [ ] **Step 1: Refactor `AdminService`**

Replace the whole file:

```typescript
// apps/api/src/modules/admin/admin.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import { UserModel } from '../../models/user.model';
import { ReviewModel } from '../../models/review.model';
import type {
  AdminOrderQueryDto,
  AdminUserQueryDto,
} from './dto/admin.dto';

const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

@Injectable()
export class AdminService {
  constructor(
    private readonly products: ProductModel,
    private readonly orders: OrderModel,
    private readonly users: UserModel,
    private readonly reviews: ReviewModel,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // DASHBOARD STATS
  // ─────────────────────────────────────────────────────────────────
  async stats() {
    const [
      orderCount,
      customerCount,
      productCount,
      reviewCount,
      revenueAgg,
      pendingOrders,
      recentOrdersRaw,
      topProducts,
      statusRows,
    ] = await Promise.all([
      this.orders.count(),
      this.users.count(),
      this.products.count({ where: { isActive: true } }),
      this.reviews.count(),
      this.orders.aggregate({
        _sum: { total: true },
        where: { status: { in: REVENUE_STATUSES } },
      }),
      this.orders.count({ where: { status: OrderStatus.PENDING } }),
      this.orders.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      this.products.findMany({
        orderBy: { salesCount: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          salesCount: true,
          price: true,
          currency: true,
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        },
      }),
      this.orders.findMany({ select: { status: true } }),
    ]);

    const ordersByStatus: Record<string, number> = {};
    for (const r of statusRows) {
      ordersByStatus[r.status] = (ordersByStatus[r.status] ?? 0) + 1;
    }

    return {
      totals: {
        revenue: revenueAgg._sum.total ?? new Prisma.Decimal(0),
        orders: orderCount,
        customers: customerCount,
        products: productCount,
        reviews: reviewCount,
        pendingOrders,
      },
      ordersByStatus,
      recentOrders: recentOrdersRaw,
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        salesCount: p.salesCount,
        price: p.price,
        currency: p.currency,
        image: p.images[0]?.url ?? null,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // ORDERS
  // ─────────────────────────────────────────────────────────────────
  async listOrders(query: AdminOrderQueryDto) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await this.orders.findManyAndCount(
      {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      { where },
    );

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

  async updateOrderStatus(id: string, status: OrderStatus) {
    const order = await this.orders.findUnique({ where: { id }, select: { id: true } });
    if (!order) throw new NotFoundException('Order not found');
    return this.orders.update({
      where: { id },
      data: {
        status,
        ...(status === OrderStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
      },
      include: { items: true, user: { select: { id: true, name: true, email: true } } },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────────────────────────
  async listUsers(query: AdminUserQueryDto) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.users.findManyAndCount(
      {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          lastLoginAt: true,
          lockedUntil: true,
          twoFactorEnabled: true,
          _count: { select: { orders: true } },
        },
      },
      { where },
    );

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

  async updateUserRole(actingUserId: string, targetId: string, role: Role) {
    if (actingUserId === targetId) {
      throw new BadRequestException('You cannot change your own role');
    }
    const user = await this.users.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    return this.users.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }
}
```

- [ ] **Step 2: Build and test**

Run: `pnpm --filter api build && pnpm --filter api test`
Expected: build succeeds; all tests PASS.

- [ ] **Step 3: Manual smoke check**

Start the API and hit `GET /api/v1/admin/stats` as an admin user (via Swagger UI or `curl` with an admin access token). Confirm the response shape and values match what the endpoint returned before this task (compare against `git stash` if unsure) — in particular that `totals.revenue`, `ordersByStatus`, `recentOrders`, and `topProducts` are all populated correctly.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/admin/admin.service.ts
git commit -m "refactor(api): AdminService consumes Product/Order/User/Review models instead of PrismaService"
```

---

### Task 12: Document the MVC layer mapping in `ARCHITECTURE.md`

**Files:**
- Modify: `ARCHITECTURE.md`

**Interfaces:** none — documentation only, no code.

`ARCHITECTURE.md` numbers its top-level sections sequentially (`## 1.` through `## 11.`, confirmed via `grep -n "^## " ARCHITECTURE.md`). Inserting a new section between the existing `## 3. Monorepo Layout` and `## 4. Data Model` means every section from 4 onward shifts up by one number.

- [ ] **Step 1: Insert the new section 4, immediately before the current `## 4. Data Model (PostgreSQL via Prisma)` heading**

```markdown
## 4. MVC Layer Mapping

Neither Next.js App Router nor NestJS spells out "Model/View/Controller" by
folder name, so here's the explicit mapping — added as part of the course
requirement to demonstrate the separation, without breaking either
framework's own routing/DI conventions (see
`docs/superpowers/specs/2026-08-17-mvc-conversion-design.md` for the full
rationale and rejected alternatives).

**apps/api (NestJS):**

| MVC role | Where it lives | What it does |
|---|---|---|
| Model | `src/models/*.model.ts` | One injectable class per entity, wrapping every Prisma query. No business rules — only persistence. |
| Controller | `src/modules/*/‍*.controller.ts` | Thin request/response handlers — unchanged by this refactor, they were already correctly scoped. |
| View | `src/modules/*/dto/*.dto.ts` + `common/interceptors/response.interceptor.ts` | The API's "view" is its response shape: DTOs plus the global response interceptor decide what a client actually sees. |
| *(Service)* | `src/modules/*/‍*.service.ts` | Not a classic MVC layer — this is where business rules, validation, and cross-entity orchestration live, sitting between Controller and Model. Removing it would mean pushing business logic into the Model (wrong — Models should stay pure persistence) or the Controller (wrong — Controllers should stay thin), so it stays as an explicit fourth layer. |

**apps/web (Next.js App Router):**

| MVC role | Where it lives | What it does |
|---|---|---|
| Model | `src/models/*.ts` | Data-fetching functions against the API (via `lib/api-client.ts`), grouped by domain entity. |
| View | `src/components/**` and `src/app/**/page.tsx` | Pure presentation — components render props, pages compose components. |
| Controller | `src/controllers/*.ts` | Thin per-route functions that read route params, call the Model layer, and return props for the View. `page.tsx` files stay in `app/` (required for file-based routing) but only call a controller and render — no fetching or business logic inline. |

`lib/api-client.ts`, `lib/cloudinary.ts`, and `lib/utils.ts` stay in `lib/` —
infrastructure, not domain data. Zustand stores in `src/store/` are also
left out of this mapping: they hold transient client UI state (cart, auth
session, compare/wishlist toggles), not persisted domain data, so folding
them into "Model" would misrepresent what they are.

---

```

- [ ] **Step 2: Renumber every subsequent top-level section by one**, using these exact heading replacements (each is a unique string in the file, so each is a separate one-line change):

| Old heading | New heading |
|---|---|
| `## 4. Data Model (PostgreSQL via Prisma)` | `## 5. Data Model (PostgreSQL via Prisma)` |
| `## 5. Authentication Flow` | `## 6. Authentication Flow` |
| `## 6. Security Posture` | `## 7. Security Posture` |
| `## 7. Performance` | `## 8. Performance` |
| `## 8. Observability` | `## 9. Observability` |
| `## 9. CI/CD Pipeline` | `## 10. CI/CD Pipeline` |
| `## 10. What's Built on Day 1 (this commit)` | `## 11. What's Built on Day 1 (this commit)` |
| `## 11. How to Talk About This in an Interview` | `## 12. How to Talk About This in an Interview` |

`## What's Next (Day 2+)` has no number and is unaffected.

Also check the body text of section 6 (old "Security Posture", new "## 7.") and any other section for cross-references like "see §4" or "see ARCHITECTURE.md §6" that point at a renumbered section, and update them to match (`grep -n "§[0-9]" ARCHITECTURE.md` to find any). `apps/api/src/modules/auth/auth.service.ts` has a comment `// Security choices made here are deliberate; see ARCHITECTURE.md §6.` from Task 10 — update it to `§7` since Security Posture is now section 7.

- [ ] **Step 3: Fix the cross-reference in `auth.service.ts`**

In `apps/api/src/modules/auth/auth.service.ts`, change:

```typescript
 * Security choices made here are deliberate; see ARCHITECTURE.md §6.
```

to:

```typescript
 * Security choices made here are deliberate; see ARCHITECTURE.md §7.
```

- [ ] **Step 4: Verify the table of contents / grep sanity check**

Run: `grep -n "^## " ARCHITECTURE.md`
Expected: sections numbered 1 through 12 with no gaps or duplicates, `## 4. MVC Layer Mapping` present, `## What's Next (Day 2+)` still unnumbered between 11 and 12.

- [ ] **Step 5: Commit**

```bash
git add ARCHITECTURE.md apps/api/src/modules/auth/auth.service.ts
git commit -m "docs: add MVC layer mapping section to ARCHITECTURE.md"
```

---

## Definition of Done

- All 12 tasks committed, in order, each with a green `pnpm --filter api build && pnpm --filter api test`.
- `apps/api/src/models/` contains 11 Model files + 11 spec files, all registered in `ModelsModule`.
- No service in `apps/api/src/modules/**` imports `PrismaService` anymore except `models/*.model.ts` themselves (verify with `grep -rl "PrismaService" apps/api/src/modules --include=*.service.ts` — expected: no output).
- `UsersModule` has separate `users.controller.ts` / `users.service.ts` files like every other module.
- `ARCHITECTURE.md` documents the MVC mapping for both apps.
- Manual smoke checks from Tasks 10 and 11 passed.
- Next: apps/web customer-facing routes (separate plan, per the spec's rollout order), then apps/web admin routes.
