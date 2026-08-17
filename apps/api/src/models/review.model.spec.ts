import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { ReviewModel } from './review.model';

describe('ReviewModel', () => {
  let model: ReviewModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      review: {
        findMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      product: { update: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(ReviewModel);
  });

  it('listVisibleForProduct runs both findMany queries inside one $transaction call', async () => {
    prisma.$transaction.mockResolvedValue([[{ id: 'r1' }], [{ rating: 5 }]]);
    await expect(model.listVisibleForProduct('p1')).resolves.toEqual([[{ id: 'r1' }], [{ rating: 5 }]]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.review.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.review.findMany).toHaveBeenNthCalledWith(1, {
      where: { productId: 'p1', isHidden: false },
      orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    expect(prisma.review.findMany).toHaveBeenNthCalledWith(2, {
      where: { productId: 'p1', isHidden: false },
      select: { rating: true },
    });
  });

  it('upsert delegates to prisma.review.upsert', async () => {
    prisma.review.upsert.mockResolvedValue({ id: 'r1' });
    const args = { where: { userId_productId: { userId: 'u1', productId: 'p1' } }, create: {}, update: {} };
    await expect(model.upsert(args as any)).resolves.toEqual({ id: 'r1' });
    expect(prisma.review.upsert).toHaveBeenCalledWith(args);
  });

  it('findUnique delegates to prisma.review.findUnique', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 'r1' });
    await expect(model.findUnique({ where: { id: 'r1' } } as any)).resolves.toEqual({ id: 'r1' });
  });

  it('delete delegates to prisma.review.delete', async () => {
    prisma.review.delete.mockResolvedValue({ id: 'r1' });
    await expect(model.delete({ where: { id: 'r1' } } as any)).resolves.toEqual({ id: 'r1' });
  });

  it('findManyAndCount runs findMany + count inside one $transaction call', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);
    const args = { where: { productId: 'p1' } };
    const countArgs = { where: { productId: 'p1' } };
    await model.findManyAndCount(args as any, countArgs as any);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.review.findMany).toHaveBeenCalledWith(args);
    expect(prisma.review.count).toHaveBeenCalledWith(countArgs);
  });

  it('update delegates to prisma.review.update', async () => {
    prisma.review.update.mockResolvedValue({ id: 'r1', isHidden: true });
    await expect(model.update({ where: { id: 'r1' }, data: { isHidden: true } } as any))
      .resolves.toEqual({ id: 'r1', isHidden: true });
  });

  it('recomputeProductAggregates writes the rounded average and count onto the product', async () => {
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.666 }, _count: { rating: 3 } });
    await model.recomputeProductAggregates('p1');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { reviewCount: 3, averageRating: 4.7 },
    });
  });

  it('recomputeProductAggregates writes 0 when there are no ratings', async () => {
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { rating: 0 } });
    await model.recomputeProductAggregates('p1');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { reviewCount: 0, averageRating: 0 },
    });
  });
});
