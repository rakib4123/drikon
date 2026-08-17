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
