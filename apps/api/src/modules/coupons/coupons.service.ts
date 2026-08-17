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
