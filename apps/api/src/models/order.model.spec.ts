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

  it('createOrderTransaction creates the address, order, payment, decrements stock, bumps sales and coupon redemption', async () => {
    const tx = {
      address: { create: jest.fn().mockResolvedValue({ id: 'addr1' }) },
      order: { create: jest.fn().mockResolvedValue({ id: 'order1', items: [] }) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'pay1' }) },
      product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      productVariant: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      coupon: { update: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(1),
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
      payment: { method: 'BKASH_MANUAL', providerPaymentId: 'TRX123', payerReference: '01711111111' },
    };

    const result = await model.createOrderTransaction(args);

    expect(tx.address.create).toHaveBeenCalledWith({ data: { userId: 'u1', ...args.shippingAddress } });
    expect(tx.order.create).toHaveBeenCalled();
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order1',
        method: 'BKASH_MANUAL',
        amount: args.total,
        currency: 'BDT',
        providerPaymentId: 'TRX123',
        payerReference: '01711111111',
      },
    });
    // Guarded by `stock: { gte }` so the check and the decrement are one statement.
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', stock: { gte: 1 } },
      data: { stock: { decrement: 1 }, salesCount: { increment: 1 } },
    });
    expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: 'v1', stock: { gte: 1 } },
      data: { stock: { decrement: 1 } },
    });
    // Coupon redemption is a raw guarded UPDATE, not a blind increment.
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(result).toEqual({ id: 'order1', items: [] });
  });

  it('createOrderTransaction creates a COD payment with no providerPaymentId/payerReference', async () => {
    const tx = {
      address: { create: jest.fn().mockResolvedValue({ id: 'addr1' }) },
      order: { create: jest.fn().mockResolvedValue({ id: 'order2', items: [] }) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'pay2' }) },
      product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      productVariant: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      coupon: { update: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await model.createOrderTransaction({
      userId: 'u1',
      shippingAddress: { fullName: 'A', phone: '1', line1: 'L1', city: 'C', postalCode: '000', country: 'BD' },
      orderNumber: 'DRK-2026-000002',
      subtotal: new Prisma.Decimal(50), shipping: new Prisma.Decimal(0), tax: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(0), total: new Prisma.Decimal(50), currency: 'BDT', couponId: null,
      lines: [],
      payment: { method: 'COD' },
    });

    expect(tx.payment.create).toHaveBeenCalledWith({
      data: { orderId: 'order2', method: 'COD', amount: expect.anything(), currency: 'BDT' },
    });
  });

  it('createOrderTransaction skips the coupon update when couponId is null', async () => {
    const tx = {
      address: { create: jest.fn().mockResolvedValue({ id: 'addr1' }) },
      order: { create: jest.fn().mockResolvedValue({ id: 'order1', items: [] }) },
      payment: { create: jest.fn() },
      product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      productVariant: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      coupon: { update: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await model.createOrderTransaction({
      userId: 'u1',
      shippingAddress: { fullName: 'A', phone: '1', line1: 'L1', city: 'C', postalCode: '000', country: 'BD' },
      orderNumber: 'DRK-2026-000001',
      subtotal: new Prisma.Decimal(0), shipping: new Prisma.Decimal(0), tax: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(0), total: new Prisma.Decimal(0), currency: 'BDT', couponId: null,
      lines: [],
      payment: { method: 'COD' },
    });

    expect(tx.$executeRaw).not.toHaveBeenCalled();
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

  it('updatePayment delegates to prisma.payment.update', async () => {
    prisma.payment = { update: jest.fn().mockResolvedValue({ id: 'pay1', status: 'SUCCEEDED' }) };
    const args = { where: { orderId: 'order1' }, data: { status: 'SUCCEEDED' as const } };
    await expect(model.updatePayment(args as any)).resolves.toEqual({ id: 'pay1', status: 'SUCCEEDED' });
    expect(prisma.payment.update).toHaveBeenCalledWith(args);
  });
});
