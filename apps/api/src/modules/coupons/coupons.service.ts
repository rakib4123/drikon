import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

export interface CouponValidation {
  valid: boolean;
  message: string;
  discount: Prisma.Decimal;
  couponId?: string;
  code?: string;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateCouponDto) {
    const exists = await this.prisma.coupon.findUnique({ where: { code: dto.code }, select: { id: true } });
    if (exists) throw new ConflictException(`Coupon "${dto.code}" already exists`);
    return this.prisma.coupon.create({
      data: {
        code: dto.code,
        description: dto.description || null,
        isPercentage: dto.isPercentage,
        value: new Prisma.Decimal(dto.value),
        minOrderAmount: dto.minOrderAmount !== undefined ? new Prisma.Decimal(dto.minOrderAmount) : null,
        maxRedemptions: dto.maxRedemptions ?? null,
        expiresAt: dto.expiresAt ?? null,
        isActive: dto.isActive,
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.getOrThrow(id);
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.isPercentage !== undefined && { isPercentage: dto.isPercentage }),
        ...(dto.value !== undefined && { value: new Prisma.Decimal(dto.value) }),
        ...(dto.minOrderAmount !== undefined && { minOrderAmount: new Prisma.Decimal(dto.minOrderAmount) }),
        ...(dto.maxRedemptions !== undefined && { maxRedemptions: dto.maxRedemptions }),
        ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Public-facing validation used by the checkout UI. Never throws. */
  async validate(code: string, subtotal: number): Promise<CouponValidation> {
    const zero = new Prisma.Decimal(0);
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
    const invalid = (message: string): CouponValidation => ({ valid: false, message, discount: zero });

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

    const raw = coupon.isPercentage ? sub.mul(coupon.value).div(100) : coupon.value;
    const discount = raw.greaterThan(sub) ? sub : raw;
    return { valid: true, message: 'Coupon applied', discount, couponId: coupon.id, code: coupon.code };
  }

  /** Used inside order creation — throws if the code can't be applied. */
  async resolveForOrder(code: string, subtotal: number): Promise<{ couponId: string; discount: Prisma.Decimal }> {
    const result = await this.validate(code, subtotal);
    if (!result.valid || !result.couponId) throw new BadRequestException(result.message);
    return { couponId: result.couponId, discount: result.discount };
  }

  private async getOrThrow(id: string) {
    const c = await this.prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Coupon not found');
    return c;
  }
}
