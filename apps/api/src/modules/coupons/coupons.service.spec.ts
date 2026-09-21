import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CouponsService } from './coupons.service';
import { CouponModel } from '../../models/coupon.model';
import { ProductModel } from '../../models/product.model';

const dec = (n: number) => new Prisma.Decimal(n);

function coupon(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    code: 'SAVE10',
    isActive: true,
    isPercentage: true,
    value: dec(10),
    minOrderAmount: null,
    maxRedemptions: null,
    perUserLimit: null,
    redemptionCount: 0,
    startsAt: new Date(Date.now() - 1000),
    expiresAt: null,
    freeShipping: false,
    categoryId: null,
    ...overrides,
  };
}

describe('CouponsService', () => {
  let service: CouponsService;
  let coupons: Record<string, jest.Mock>;
  let products: Record<string, jest.Mock>;

  beforeEach(async () => {
    coupons = {
      findUnique: jest.fn().mockResolvedValue(coupon()),
      countRedemptionsByUser: jest.fn().mockResolvedValue(0),
    };
    products = { findMany: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: CouponModel, useValue: coupons },
        { provide: ProductModel, useValue: products },
      ],
    }).compile();

    service = module.get(CouponsService);
  });

  describe('discount maths', () => {
    it('takes a percentage off the subtotal', async () => {
      const r = await service.validate('SAVE10', 1000);
      expect(r.valid).toBe(true);
      expect(r.discount).toEqual(dec(100));
    });

    it('takes a fixed amount off the subtotal', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ isPercentage: false, value: dec(250) }));
      const r = await service.validate('SAVE10', 1000);
      expect(r.discount).toEqual(dec(250));
    });

    it('never discounts more than the cart is worth', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ isPercentage: false, value: dec(5000) }));
      const r = await service.validate('SAVE10', 1000);
      expect(r.discount).toEqual(dec(1000));
    });
  });

  describe('eligibility', () => {
    it('rejects an inactive code', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ isActive: false }));
      expect((await service.validate('SAVE10', 1000)).valid).toBe(false);
    });

    it('rejects an expired code', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ expiresAt: new Date(Date.now() - 5000) }));
      expect((await service.validate('SAVE10', 1000)).valid).toBe(false);
    });

    it('rejects a code that has not started yet', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ startsAt: new Date(Date.now() + 60_000) }));
      expect((await service.validate('SAVE10', 1000)).valid).toBe(false);
    });

    it('rejects a cart under the minimum order amount', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ minOrderAmount: dec(2000) }));
      expect((await service.validate('SAVE10', 1000)).valid).toBe(false);
    });

    it('rejects a code that has hit its global redemption cap', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ maxRedemptions: 5, redemptionCount: 5 }));
      expect((await service.validate('SAVE10', 1000)).valid).toBe(false);
    });
  });

  describe('per-user limit', () => {
    it('rejects a code the shopper has already used up', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ perUserLimit: 1 }));
      coupons.countRedemptionsByUser.mockResolvedValue(1);

      const r = await service.validate('SAVE10', 1000, undefined, 'u1');
      expect(r.valid).toBe(false);
      expect(r.message).toMatch(/already used/i);
    });

    it('allows a code the shopper still has uses left on', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ perUserLimit: 3 }));
      coupons.countRedemptionsByUser.mockResolvedValue(1);

      expect((await service.validate('SAVE10', 1000, undefined, 'u1')).valid).toBe(true);
    });

    it('skips the per-user check for a guest, since there is no user to count', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ perUserLimit: 1 }));

      expect((await service.validate('SAVE10', 1000)).valid).toBe(true);
      expect(coupons.countRedemptionsByUser).not.toHaveBeenCalled();
    });

    it('enforces the per-user limit at order time, where the user is always known', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ perUserLimit: 1 }));
      coupons.countRedemptionsByUser.mockResolvedValue(1);

      await expect(
        service.resolveForOrder('SAVE10', 1000, undefined, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('category-scoped codes', () => {
    it('discounts only the lines in the coupon category', async () => {
      coupons.findUnique.mockResolvedValue(
        coupon({ categoryId: 'cat1', isPercentage: false, value: dec(50) }),
      );
      products.findMany.mockResolvedValue([
        { id: 'p1', categoryId: 'cat1' },
        { id: 'p2', categoryId: 'cat2' },
      ]);

      const r = await service.validate('SAVE10', 1000, [
        { productId: 'p1', quantity: 1, unitPrice: 400 },
        { productId: 'p2', quantity: 1, unitPrice: 600 },
      ]);

      expect(r.valid).toBe(true);
      expect(r.discount).toEqual(dec(50));
    });

    it('rejects when nothing in the cart is in the coupon category', async () => {
      coupons.findUnique.mockResolvedValue(coupon({ categoryId: 'cat1' }));
      products.findMany.mockResolvedValue([{ id: 'p2', categoryId: 'cat2' }]);

      const r = await service.validate('SAVE10', 1000, [
        { productId: 'p2', quantity: 1, unitPrice: 1000 },
      ]);
      expect(r.valid).toBe(false);
    });
  });
});
