import { ConflictException, Injectable } from '@nestjs/common';
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
  /** Set when this line was priced from a live flash sale — drives soldCount/cap bookkeeping. */
  flashSaleId?: string | null;
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
  /** Enforced inside the transaction so a coupon can't blow past maxRedemptions under load. */
  couponMaxRedemptions?: number | null;
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
        // Conditional decrement: the `stock: { gte }` guard makes the check and the
        // write one atomic statement, so two concurrent checkouts for the last unit
        // can't both succeed and drive stock negative. count === 0 means we lost the race.
        const stockHit = await tx.product.updateMany({
          where: { id: l.productId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity }, salesCount: { increment: l.quantity } },
        });
        if (stockHit.count === 0) {
          throw new ConflictException(
            `"${l.productName}" sold out while you were checking out — please adjust your cart`,
          );
        }

        if (l.variantId) {
          const variantHit = await tx.productVariant.updateMany({
            where: { id: l.variantId, stock: { gte: l.quantity } },
            data: { stock: { decrement: l.quantity } },
          });
          if (variantHit.count === 0) {
            throw new ConflictException(
              `The selected option for "${l.productName}" sold out while you were checking out`,
            );
          }
        }

        // Flash-sale bookkeeping: bump soldCount and enforce inventoryCap in the same
        // atomic guard, so a capped sale can't oversell either.
        if (l.flashSaleId) {
          const saleHit = await tx.$executeRaw`
            UPDATE "FlashSaleProduct"
               SET "soldCount" = "soldCount" + ${l.quantity}
             WHERE "flashSaleId" = ${l.flashSaleId}
               AND "productId" = ${l.productId}
               AND ("inventoryCap" IS NULL OR "soldCount" + ${l.quantity} <= "inventoryCap")
          `;
          if (saleHit === 0) {
            throw new ConflictException(
              `The flash-sale allocation for "${l.productName}" just ran out — please reload your cart`,
            );
          }
        }
      }

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

      if (args.couponId) {
        // Same pattern as stock: increment only while still under the cap, in one
        // statement, so the limit holds under concurrent redemptions.
        const couponHit = await tx.$executeRaw`
          UPDATE "Coupon"
             SET "redemptionCount" = "redemptionCount" + 1
           WHERE "id" = ${args.couponId}
             AND ("maxRedemptions" IS NULL OR "redemptionCount" < "maxRedemptions")
        `;
        if (couponHit === 0) {
          throw new ConflictException('This coupon has just been fully redeemed');
        }
      }

      return created;
    });
  }

  /**
   * Atomically reserves the next order number for `year`.
   *
   * Runs in its own statement (not the order transaction) on purpose: holding the
   * counter row locked for the whole checkout would serialise every concurrent
   * order. A number burned by a later failure just leaves a harmless gap.
   */
  async nextSequenceValue(year: number): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ lastValue: number }[]>`
      INSERT INTO "OrderSequence" ("year", "lastValue", "updatedAt")
      VALUES (${year}, 1, NOW())
      ON CONFLICT ("year")
      DO UPDATE SET "lastValue" = "OrderSequence"."lastValue" + 1, "updatedAt" = NOW()
      RETURNING "lastValue"
    `;
    return rows[0].lastValue;
  }

  /**
   * Returns stock to inventory for a cancelled/refunded order, exactly once.
   *
   * `stockRestoredAt IS NULL` is checked as part of the same UPDATE that sets it,
   * so two concurrent cancels can't both restock. Returns false if it was a no-op.
   */
  async restoreStockTransaction(orderId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Claim the restock. Losing this race means someone else already did it.
      const claimed = await tx.order.updateMany({
        where: { id: orderId, stockRestoredAt: null },
        data: { stockRestoredAt: new Date() },
      });
      if (claimed.count === 0) return false;

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { couponId: true, items: { select: { productId: true, variantId: true, quantity: true } } },
      });

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            // salesCount is a "units actually sold" metric, so a cancelled order
            // should not keep inflating it (or the best-seller list).
            salesCount: { decrement: item.quantity },
          },
        });
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // Give the coupon use back so a cancelled order doesn't consume an allocation.
      if (order.couponId) {
        await tx.$executeRaw`
          UPDATE "Coupon"
             SET "redemptionCount" = GREATEST("redemptionCount" - 1, 0)
           WHERE "id" = ${order.couponId}
        `;
      }

      return true;
    });
  }

  /** Status histogram for the admin dashboard — aggregated in Postgres, not in Node. */
  groupByStatus() {
    return this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
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

  updatePayment<T extends Prisma.PaymentUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.PaymentUpdateArgs>) {
    return this.prisma.payment.update(args);
  }

  count<T extends Prisma.OrderCountArgs>(args: Prisma.SelectSubset<T, Prisma.OrderCountArgs>) {
    return this.prisma.order.count(args);
  }

  aggregate<T extends Prisma.OrderAggregateArgs>(args: Prisma.SelectSubset<T, Prisma.OrderAggregateArgs>) {
    return this.prisma.order.aggregate(args);
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
