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
