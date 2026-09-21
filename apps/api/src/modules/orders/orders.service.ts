import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderModel } from '../../models/order.model';
import { ProductModel } from '../../models/product.model';
import { FlashSaleModel } from '../../models/flash-sale.model';
import { CouponsService } from '../coupons/coupons.service';
import { SettingsService } from '../settings/settings.service';
import type { CreateOrderDto, OrderQueryDto, QuoteDto } from './dto/order.dto';

const FREE_SHIPPING_THRESHOLD = new Prisma.Decimal(3000);
const FLAT_SHIPPING_FEE = new Prisma.Decimal(60);

type CheckoutItem = { productId: string; variantId?: string; quantity: number };

interface PricedLine {
  productId: string;
  variantId: string | null;
  productName: string;
  productNameBn: string | null;
  slug: string;
  productImage: string | null;
  unitPrice: Prisma.Decimal;
  listPrice: Prisma.Decimal;
  quantity: number;
  lineTotal: Prisma.Decimal;
  currency: string;
  stock: number;
  flashSaleId: string | null;
}

export interface LineIssue {
  productId: string;
  variantId: string | null;
  reason: 'unavailable' | 'insufficient_stock';
  /** Units actually available (0 when the product is gone). */
  available: number;
  message: string;
}

const sumLines = (lines: PricedLine[]) =>
  lines.reduce((acc, l) => acc.add(l.lineTotal), new Prisma.Decimal(0));

const shippingFor = (subtotal: Prisma.Decimal) =>
  subtotal.greaterThanOrEqualTo(FREE_SHIPPING_THRESHOLD) ? new Prisma.Decimal(0) : FLAT_SHIPPING_FEE;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly orders: OrderModel,
    private readonly products: ProductModel,
    private readonly flashSales: FlashSaleModel,
    private readonly coupons: CouponsService,
    private readonly settingsService: SettingsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // CREATE — turn a cart payload into a real Order (no payment yet)
  // ─────────────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateOrderDto) {
    const settings = await this.settingsService.get();
    if (dto.payment.method === 'BKASH_MANUAL' && settings.bkashEnabled === false) {
      throw new BadRequestException('bKash payment is currently unavailable');
    }
    if (dto.payment.method === 'COD' && settings.codEnabled === false) {
      throw new BadRequestException('Cash on delivery is currently unavailable');
    }

    const { lines, issues } = await this.priceItems(dto.items);
    // Checkout refuses what the quote merely reports.
    if (issues.length > 0) throw new BadRequestException(issues[0].message);

    const subtotal = sumLines(lines);
    let shipping = shippingFor(subtotal);
    const tax = new Prisma.Decimal(0);

    let discount = new Prisma.Decimal(0);
    let couponId: string | null = null;
    if (dto.couponCode) {
      const resolved = await this.coupons.resolveForOrder(
        dto.couponCode,
        subtotal.toNumber(),
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice.toNumber() })),
        userId,
      );
      discount = resolved.discount;
      couponId = resolved.couponId;
      if (resolved.freeShipping) shipping = new Prisma.Decimal(0);
    }

    const total = subtotal.add(shipping).add(tax).sub(discount);
    const currency = lines[0]?.currency ?? 'BDT';

    const orderNumber = await this.nextOrderNumber();

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

  // ─────────────────────────────────────────────────────────────────
  // QUOTE — what this cart costs right now, without creating anything
  // ─────────────────────────────────────────────────────────────────
  /**
   * Prices a cart exactly as `create()` would, so the cart and checkout show
   * the amount the order will actually be charged.
   *
   * The storefront used to total prices cached in the browser when each item
   * was added. After a flash sale ended, checkout showed (and told bKash
   * customers to send) the old sale price while the order charged full price.
   *
   * Unlike `create()` it never throws on a bad line: unavailable and short-stock
   * items come back as `issues` so the cart can show them.
   */
  async quote(dto: QuoteDto) {
    const { lines, issues } = await this.priceItems(dto.items);
    const subtotal = sumLines(lines);
    let shipping = lines.length > 0 ? shippingFor(subtotal) : new Prisma.Decimal(0);
    let discount = new Prisma.Decimal(0);
    let coupon: { code: string; valid: boolean; message: string; freeShipping: boolean } | null = null;

    const code = dto.couponCode?.trim();
    if (code && lines.length > 0) {
      // Guests can quote too, so the per-user redemption cap is only checked
      // when the order is placed and the buyer is known.
      const v = await this.coupons.validate(
        code,
        subtotal.toNumber(),
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice.toNumber() })),
      );
      coupon = { code: v.code ?? code.toUpperCase(), valid: v.valid, message: v.message, freeShipping: v.freeShipping };
      if (v.valid) {
        discount = v.discount;
        if (v.freeShipping) shipping = new Prisma.Decimal(0);
      }
    }

    const total = Prisma.Decimal.max(0, subtotal.add(shipping).sub(discount));
    return {
      currency: lines[0]?.currency ?? 'BDT',
      lines: lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        name: l.productName,
        nameBn: l.productNameBn,
        slug: l.slug,
        image: l.productImage,
        unitPrice: l.unitPrice.toNumber(),
        listPrice: l.listPrice.toNumber(),
        onSale: !l.unitPrice.equals(l.listPrice),
        quantity: l.quantity,
        lineTotal: l.lineTotal.toNumber(),
        stock: l.stock,
      })),
      issues,
      subtotal: subtotal.toNumber(),
      shipping: shipping.toNumber(),
      discount: discount.toNumber(),
      total: total.toNumber(),
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD.toNumber(),
      coupon,
    };
  }

  /**
   * The one place a cart line gets its price. Both `create()` and `quote()`
   * call this, so what's shown and what's charged can't drift apart.
   *
   * The client sends product IDs and quantities but never prices. A live flash
   * sale prices the product itself, so it applies only to lines without a
   * variant — a variant carries its own price and isn't part of the sale.
   */
  private async priceItems(items: CheckoutItem[]) {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const [products, saleEntries] = await Promise.all([
      this.products.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          variants: true,
        },
      }),
      this.flashSales.findActiveEntriesForProducts(productIds),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));
    const saleByProduct = new Map(saleEntries.map((e) => [e.productId, e]));

    const issues: LineIssue[] = [];
    const lines: PricedLine[] = [];

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) {
        issues.push({ productId: item.productId, variantId: item.variantId ?? null, reason: 'unavailable', available: 0,
          message: `Product ${item.productId} is unavailable` });
        continue;
      }
      const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : undefined;
      if (item.variantId && !variant) {
        issues.push({ productId: product.id, variantId: item.variantId, reason: 'unavailable', available: 0,
          message: `Variant ${item.variantId} is unavailable` });
        continue;
      }

      const stock = variant ? variant.stock : product.stock;
      if (stock < item.quantity) {
        issues.push({ productId: product.id, variantId: variant?.id ?? null, reason: 'insufficient_stock', available: stock,
          message: `Not enough stock for "${product.name}" (${stock} left)` });
      }

      const sale = variant ? undefined : saleByProduct.get(product.id);
      const listPrice = variant?.price ?? product.price;
      const unitPrice = sale && sale.salePrice.lessThan(listPrice) ? sale.salePrice : listPrice;

      lines.push({
        productId: product.id,
        variantId: variant?.id ?? null,
        productName: product.name,
        productNameBn: product.nameBn,
        slug: product.slug,
        productImage: product.images[0]?.url ?? null,
        unitPrice,
        listPrice,
        quantity: item.quantity,
        lineTotal: unitPrice.mul(item.quantity),
        currency: product.currency,
        stock,
        flashSaleId: unitPrice.equals(listPrice) ? null : (sale?.flashSaleId ?? null),
      });
    }
    return { lines, issues };
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
      include: { items: true, shippingAddress: true, payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.attachSlugs(order);
  }

  // ─────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────

  /**
   * Reserves the next order number from the OrderSequence table.
   *
   * The previous count()+1 scheme handed the same number to two concurrent
   * checkouts, and one of them died on the unique constraint as a 500.
   */
  private async nextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const next = await this.orders.nextSequenceValue(year);
    return `DRK-${year}-${String(next).padStart(6, '0')}`;
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
