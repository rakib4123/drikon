import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { ProductModel } from './product.model';

describe('ProductModel', () => {
  let model: ProductModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      productImage: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(ProductModel);
  });

  it('findMany delegates to prisma.product.findMany with the given args', async () => {
    const args = { where: { isActive: true } };
    prisma.product.findMany.mockResolvedValue(['p1']);
    await expect(model.findMany(args as any)).resolves.toEqual(['p1']);
    expect(prisma.product.findMany).toHaveBeenCalledWith(args);
  });

  it('findFirst delegates to prisma.product.findFirst', async () => {
    const args = { where: { id: 'p1', isActive: true } };
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    await expect(model.findFirst(args as any)).resolves.toEqual({ id: 'p1' });
    expect(prisma.product.findFirst).toHaveBeenCalledWith(args);
  });

  it('findManyAndCount runs findMany + count inside one $transaction call', async () => {
    prisma.$transaction.mockResolvedValue([['p1'], 1]);
    const args = { where: {} };
    const countArgs = { where: {} };
    await expect(model.findManyAndCount(args as any, countArgs as any)).resolves.toEqual([['p1'], 1]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith(args);
    expect(prisma.product.count).toHaveBeenCalledWith(countArgs);
  });

  it('findUnique delegates to prisma.product.findUnique', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
    await expect(model.findUnique({ where: { id: 'p1' } } as any)).resolves.toEqual({ id: 'p1' });
  });

  it('create delegates to prisma.product.create', async () => {
    prisma.product.create.mockResolvedValue({ id: 'p1' });
    const args = { data: { name: 'x' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'p1' });
    expect(prisma.product.create).toHaveBeenCalledWith(args);
  });

  it('updateWithImages replaces images and updates the product inside one transaction when images is given', async () => {
    const tx = {
      productImage: { deleteMany: jest.fn(), createMany: jest.fn() },
      product: { update: jest.fn().mockResolvedValue({ id: 'p1' }) },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const images = [{ url: 'a.jpg', position: 0 }] as any;
    const result = await model.updateWithImages('p1', { name: 'x' } as any, images);

    expect(tx.productImage.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    expect(tx.productImage.createMany).toHaveBeenCalledWith({
      data: [{ url: 'a.jpg', position: 0, productId: 'p1' }],
    });
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { name: 'x' },
      include: { images: true, category: true, brand: true },
    });
    expect(result).toEqual({ id: 'p1' });
  });

  it('updateWithImages skips the image swap when images is undefined', async () => {
    const tx = {
      productImage: { deleteMany: jest.fn(), createMany: jest.fn() },
      product: { update: jest.fn().mockResolvedValue({ id: 'p1' }) },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await model.updateWithImages('p1', { name: 'x' } as any, undefined);

    expect(tx.productImage.deleteMany).not.toHaveBeenCalled();
    expect(tx.productImage.createMany).not.toHaveBeenCalled();
  });

  it('update delegates to prisma.product.update', async () => {
    prisma.product.update.mockResolvedValue({ id: 'p1', isActive: false });
    const args = { where: { id: 'p1' }, data: { isActive: false } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'p1', isActive: false });
  });

  it('delete delegates to prisma.product.delete', async () => {
    prisma.product.delete.mockResolvedValue({ id: 'p1' });
    await expect(model.delete({ where: { id: 'p1' } } as any)).resolves.toEqual({ id: 'p1' });
  });

  it('deleteMany delegates to prisma.product.deleteMany', async () => {
    prisma.product.deleteMany.mockResolvedValue({ count: 2 });
    const args = { where: { id: { in: ['a', 'b'] } } };
    await expect(model.deleteMany(args as any)).resolves.toEqual({ count: 2 });
  });

  it('decrementStock returns true when enough rows were updated', async () => {
    prisma.product.updateMany.mockResolvedValue({ count: 1 });
    await expect(model.decrementStock('p1', 2)).resolves.toBe(true);
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
  });

  it('decrementStock returns false when stock was insufficient', async () => {
    prisma.product.updateMany.mockResolvedValue({ count: 0 });
    await expect(model.decrementStock('p1', 99)).resolves.toBe(false);
  });
});
