import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import type { CreateOrderDto, OrderQueryDto } from './dto/order.dto';

// Flat shipping fee (BDT) below the free-shipping threshold.
const FREE_SHIPPING_THRESHOLD = new Prisma.Decimal(3000);
const FLAT_SHIPPING_FEE = new Prisma.Decimal(60);

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // CREATE — turn a cart payload into a real Order (no payment yet)
  // ─────────────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateOrderDto) {
    // Load every referenced product once, with its first image for the snapshot.
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: true,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // Build line items with server-trusted prices (never trust client prices).
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

    // Apply a coupon if one was supplied (server-validated against trusted prices).
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

    // One transaction: address + order + items + stock decrement + sales bump.
    const order = await this.prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: { userId, ...dto.shippingAddress },
      });

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: OrderStatus.PENDING,
          subtotal,
          shipping,
          tax,
          discount,
          total,
          currency,
          couponId,
          shippingAddressId: address.id,
          notes: dto.notes,
          items: {
            create: lines.map((l) => ({
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

      for (const l of lines) {
        await tx.product.update({
          where: { id: l.productId },
          data: {
            stock: { decrement: l.quantity },
            salesCount: { increment: l.quantity },
          },
        });
        if (l.variantId) {
          await tx.productVariant.update({
            where: { id: l.variantId },
            data: { stock: { decrement: l.quantity } },
          });
        }
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { redemptionCount: { increment: 1 } },
        });
      }

      return created;
    });

    return this.attachSlugs(order);
  }

  // ─────────────────────────────────────────────────────────────────
  // LIST — the signed-in user's order history
  // ─────────────────────────────────────────────────────────────────
  async listForUser(userId: string, query: OrderQueryDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { items: true },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

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
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, userId },
      include: { items: true, shippingAddress: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.attachSlugs(order);
  }

  // ─────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────

  /** Human-readable, year-scoped, zero-padded sequence: DRK-2026-000123. */
  private async nextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const countThisYear = await this.prisma.order.count({
      where: { createdAt: { gte: start, lt: end } },
    });
    const seq = String(countThisYear + 1).padStart(6, '0');
    return `DRK-${year}-${seq}`;
  }

  /** Decorate order items with the product slug so the UI can deep-link. */
  private async attachSlugs<T extends { items: { productId: string }[] }>(
    order: T,
  ): Promise<T & { items: (T['items'][number] & { slug: string | null })[] }> {
    const ids = [...new Set(order.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
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
