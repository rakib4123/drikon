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
import type { CreateOrderDto, OrderQueryDto } from './dto/order.dto';

const FREE_SHIPPING_THRESHOLD = new Prisma.Decimal(3000);
const FLAT_SHIPPING_FEE = new Prisma.Decimal(60);

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

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.products.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: true,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // Authoritative sale pricing. The client sends product IDs and quantities but
    // never prices — what a line costs is decided here, from the same live flash
    // sale the storefront renders, so an advertised discount is actually charged.
    const saleEntries = await this.flashSales.findActiveEntriesForProducts(productIds);
    const saleByProduct = new Map(saleEntries.map((e) => [e.productId, e]));

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

      // A flash sale prices the product itself, so it only applies to a line with no
      // variant override — a variant carries its own price and isn't part of the sale.
      const sale = variant ? undefined : saleByProduct.get(product.id);
      const basePrice = variant?.price ?? product.price;
      const unitPrice = sale && sale.salePrice.lessThan(basePrice) ? sale.salePrice : basePrice;
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
        flashSaleId: unitPrice.equals(basePrice) ? null : (sale?.flashSaleId ?? null),
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
