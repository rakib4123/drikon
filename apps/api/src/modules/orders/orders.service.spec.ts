import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { OrdersService } from './orders.service';
import { OrderModel } from '../../models/order.model';
import { ProductModel } from '../../models/product.model';
import { FlashSaleModel } from '../../models/flash-sale.model';
import { CouponsService } from '../coupons/coupons.service';
import { SettingsService } from '../settings/settings.service';

const dec = (n: number) => new Prisma.Decimal(n);

/** A catalogue product priced at 1000 with plenty of stock. */
function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Phone',
    price: dec(1000),
    currency: 'BDT',
    stock: 10,
    images: [{ url: 'img.jpg' }],
    variants: [],
    ...overrides,
  };
}

function baseDto(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ productId: 'p1', quantity: 1 }],
    shippingAddress: {
      fullName: 'A', phone: '1', line1: 'L1', city: 'C', postalCode: '000', country: 'BD',
    },
    payment: { method: 'COD' as const },
    ...overrides,
  };
}

describe('OrdersService', () => {
  let service: OrdersService;
  let orders: jest.Mocked<Pick<OrderModel, 'createOrderTransaction' | 'nextSequenceValue'>> & {
    findMany: jest.Mock;
  };
  let products: jest.Mocked<Pick<ProductModel, 'findMany'>>;
  let flashSales: jest.Mocked<Pick<FlashSaleModel, 'findActiveEntriesForProducts'>>;
  let coupons: jest.Mocked<Pick<CouponsService, 'resolveForOrder' | 'validate'>>;
  let settings: jest.Mocked<Pick<SettingsService, 'get'>>;

  beforeEach(async () => {
    orders = {
      createOrderTransaction: jest.fn().mockImplementation((args) =>
        Promise.resolve({ id: 'o1', orderNumber: args.orderNumber, items: [] }),
      ),
      nextSequenceValue: jest.fn().mockResolvedValue(7),
      findMany: jest.fn().mockResolvedValue([]),
    } as never;
    products = { findMany: jest.fn().mockResolvedValue([product()]) } as never;
    flashSales = { findActiveEntriesForProducts: jest.fn().mockResolvedValue([]) } as never;
    coupons = { resolveForOrder: jest.fn(), validate: jest.fn() } as never;
    settings = { get: jest.fn().mockResolvedValue({ bkashEnabled: true, codEnabled: true }) } as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrderModel, useValue: orders },
        { provide: ProductModel, useValue: products },
        { provide: FlashSaleModel, useValue: flashSales },
        { provide: CouponsService, useValue: coupons },
        { provide: SettingsService, useValue: settings },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('flash-sale pricing', () => {
    it('charges the flash-sale price, not the catalogue price, for a product in a live sale', async () => {
      flashSales.findActiveEntriesForProducts.mockResolvedValue([
        { flashSaleId: 'fs1', productId: 'p1', salePrice: dec(750), inventoryCap: null, soldCount: 0,
          flashSale: { endsAt: new Date() } },
      ] as never);

      await service.create('u1', baseDto({ items: [{ productId: 'p1', quantity: 2 }] }) as never);

      const args = orders.createOrderTransaction.mock.calls[0][0];
      expect(args.lines[0].unitPrice).toEqual(dec(750));
      expect(args.lines[0].lineTotal).toEqual(dec(1500));
      expect(args.subtotal).toEqual(dec(1500));
      // Tagged so the transaction can bump soldCount / enforce inventoryCap.
      expect(args.lines[0].flashSaleId).toBe('fs1');
    });

    it('ignores a flash-sale entry that is more expensive than the catalogue price', async () => {
      flashSales.findActiveEntriesForProducts.mockResolvedValue([
        { flashSaleId: 'fs1', productId: 'p1', salePrice: dec(1200), inventoryCap: null, soldCount: 0,
          flashSale: { endsAt: new Date() } },
      ] as never);

      await service.create('u1', baseDto() as never);

      const args = orders.createOrderTransaction.mock.calls[0][0];
      expect(args.lines[0].unitPrice).toEqual(dec(1000));
      expect(args.lines[0].flashSaleId).toBeNull();
    });

    it('prices a variant line from the variant, leaving the flash sale out of it', async () => {
      products.findMany.mockResolvedValue([
        product({ variants: [{ id: 'v1', price: dec(1300), stock: 5 }] }),
      ] as never);
      flashSales.findActiveEntriesForProducts.mockResolvedValue([
        { flashSaleId: 'fs1', productId: 'p1', salePrice: dec(750), inventoryCap: null, soldCount: 0,
          flashSale: { endsAt: new Date() } },
      ] as never);

      await service.create('u1', baseDto({
        items: [{ productId: 'p1', quantity: 1, variantId: 'v1' }],
      }) as never);

      const args = orders.createOrderTransaction.mock.calls[0][0];
      expect(args.lines[0].unitPrice).toEqual(dec(1300));
      expect(args.lines[0].flashSaleId).toBeNull();
    });

    it('falls back to the catalogue price when no sale is running', async () => {
      await service.create('u1', baseDto() as never);
      const args = orders.createOrderTransaction.mock.calls[0][0];
      expect(args.lines[0].unitPrice).toEqual(dec(1000));
    });
  });

  describe('order numbering', () => {
    it('builds the order number from the atomic sequence, not an order count', async () => {
      await service.create('u1', baseDto() as never);

      expect(orders.nextSequenceValue).toHaveBeenCalledWith(new Date().getFullYear());
      const args = orders.createOrderTransaction.mock.calls[0][0];
      expect(args.orderNumber).toBe(`DRK-${new Date().getFullYear()}-000007`);
    });
  });

  describe('coupons', () => {
    it('passes the buyer id through so the per-user redemption cap can be enforced', async () => {
      coupons.resolveForOrder.mockResolvedValue({
        couponId: 'c1', discount: dec(100), freeShipping: false,
      } as never);

      await service.create('u1', baseDto({ couponCode: 'SAVE' }) as never);

      expect(coupons.resolveForOrder).toHaveBeenCalledWith('SAVE', 1000, expect.anything(), 'u1');
    });

    it('prices the coupon against the discounted subtotal when a sale is running', async () => {
      flashSales.findActiveEntriesForProducts.mockResolvedValue([
        { flashSaleId: 'fs1', productId: 'p1', salePrice: dec(600), inventoryCap: null, soldCount: 0,
          flashSale: { endsAt: new Date() } },
      ] as never);
      coupons.resolveForOrder.mockResolvedValue({
        couponId: 'c1', discount: dec(60), freeShipping: false,
      } as never);

      await service.create('u1', baseDto({ couponCode: 'SAVE' }) as never);

      // 600, not the 1000 list price — the coupon can't be applied to a price we never charge.
      expect(coupons.resolveForOrder).toHaveBeenCalledWith('SAVE', 600, expect.anything(), 'u1');
    });
  });

  describe('availability guards', () => {
    it('rejects an order for a product that is not on sale to begin with', async () => {
      products.findMany.mockResolvedValue([] as never);
      await expect(service.create('u1', baseDto() as never)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a quantity larger than the stock on hand', async () => {
      products.findMany.mockResolvedValue([product({ stock: 1 })] as never);
      await expect(
        service.create('u1', baseDto({ items: [{ productId: 'p1', quantity: 5 }] }) as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a payment method the admin has switched off', async () => {
      settings.get.mockResolvedValue({ bkashEnabled: false, codEnabled: true } as never);
      await expect(
        service.create('u1', baseDto({
          payment: { method: 'BKASH_MANUAL', providerPaymentId: 'T1', payerReference: '017' },
        }) as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('quote', () => {
    const sale = (salePrice: number) => [
      { flashSaleId: 'fs1', productId: 'p1', salePrice: dec(salePrice), inventoryCap: null, soldCount: 0,
        flashSale: { endsAt: new Date() } },
    ];

    it('prices the cart with the live flash-sale price and shipping, in plain numbers', async () => {
      flashSales.findActiveEntriesForProducts.mockResolvedValue(sale(750) as never);

      const q = await service.quote({ items: [{ productId: 'p1', quantity: 2 }] } as never);

      expect(q.lines[0]).toMatchObject({ unitPrice: 750, listPrice: 1000, onSale: true, lineTotal: 1500 });
      expect(q.subtotal).toBe(1500);
      expect(q.shipping).toBe(60); // under the 3000 free-shipping threshold
      expect(q.total).toBe(1560);
      expect(q.issues).toEqual([]);
    });

    it('charges exactly what the quote showed — the guarantee this endpoint exists for', async () => {
      flashSales.findActiveEntriesForProducts.mockResolvedValue(sale(750) as never);
      const cart = { items: [{ productId: 'p1', quantity: 3 }] };

      const q = await service.quote(cart as never);
      await service.create('u1', baseDto(cart) as never);
      const charged = orders.createOrderTransaction.mock.calls[0][0];

      expect(charged.total.toNumber()).toBe(q.total);
      expect(charged.subtotal.toNumber()).toBe(q.subtotal);
      expect(charged.shipping.toNumber()).toBe(q.shipping);
    });

    it('reports an unavailable product instead of throwing, and leaves it out of the totals', async () => {
      products.findMany.mockResolvedValue([product()] as never);

      const q = await service.quote({
        items: [{ productId: 'p1', quantity: 1 }, { productId: 'gone', quantity: 1 }],
      } as never);

      expect(q.lines.map((l) => l.productId)).toEqual(['p1']);
      expect(q.issues).toEqual([expect.objectContaining({ productId: 'gone', reason: 'unavailable' })]);
      expect(q.subtotal).toBe(1000);
    });

    it('flags a quantity above stock but still prices it, so the cart can ask the shopper to reduce it', async () => {
      products.findMany.mockResolvedValue([product({ stock: 2 })] as never);

      const q = await service.quote({ items: [{ productId: 'p1', quantity: 5 }] } as never);

      expect(q.lines[0].quantity).toBe(5);
      expect(q.issues).toEqual([expect.objectContaining({ reason: 'insufficient_stock', available: 2 })]);
    });

    it('applies a valid coupon, including free shipping', async () => {
      coupons.validate.mockResolvedValue({
        valid: true, message: 'ok', discount: dec(100), freeShipping: true, couponId: 'c1', code: 'SAVE',
      } as never);

      const q = await service.quote({ items: [{ productId: 'p1', quantity: 1 }], couponCode: 'save' } as never);

      expect(q.discount).toBe(100);
      expect(q.shipping).toBe(0);
      expect(q.total).toBe(900);
      expect(q.coupon).toMatchObject({ code: 'SAVE', valid: true, freeShipping: true });
    });

    it('reports an invalid coupon without discounting', async () => {
      coupons.validate.mockResolvedValue({
        valid: false, message: 'This coupon has expired', discount: dec(0), freeShipping: false,
      } as never);

      const q = await service.quote({ items: [{ productId: 'p1', quantity: 1 }], couponCode: 'OLD' } as never);

      expect(q.discount).toBe(0);
      expect(q.coupon).toMatchObject({ valid: false, message: 'This coupon has expired' });
    });

    it('quotes an empty cart as zero, with no shipping', async () => {
      products.findMany.mockResolvedValue([] as never);
      const q = await service.quote({ items: [] } as never);
      expect(q).toMatchObject({ subtotal: 0, shipping: 0, discount: 0, total: 0, lines: [] });
    });
  });
});
