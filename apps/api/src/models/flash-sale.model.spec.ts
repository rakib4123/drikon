import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { FlashSaleModel } from './flash-sale.model';

describe('FlashSaleModel', () => {
  let model: FlashSaleModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      flashSale: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      flashSaleProduct: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FlashSaleModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(FlashSaleModel);
  });

  it('findMany delegates to prisma.flashSale.findMany', async () => {
    prisma.flashSale.findMany.mockResolvedValue([{ id: 'fs1' }]);
    await expect(model.findMany({})).resolves.toEqual([{ id: 'fs1' }]);
    expect(prisma.flashSale.findMany).toHaveBeenCalledWith({});
  });

  it('findFirst delegates to prisma.flashSale.findFirst', async () => {
    prisma.flashSale.findFirst.mockResolvedValue({ id: 'fs1' });
    const args = { where: { isActive: true } };
    await expect(model.findFirst(args as any)).resolves.toEqual({ id: 'fs1' });
    expect(prisma.flashSale.findFirst).toHaveBeenCalledWith(args);
  });

  it('findUnique delegates to prisma.flashSale.findUnique', async () => {
    prisma.flashSale.findUnique.mockResolvedValue({ id: 'fs1' });
    const args = { where: { id: 'fs1' } };
    await expect(model.findUnique(args as any)).resolves.toEqual({ id: 'fs1' });
    expect(prisma.flashSale.findUnique).toHaveBeenCalledWith(args);
  });

  it('create delegates to prisma.flashSale.create', async () => {
    prisma.flashSale.create.mockResolvedValue({ id: 'fs1' });
    const args = { data: { name: 'Sale', slug: 'sale' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'fs1' });
    expect(prisma.flashSale.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.flashSale.update', async () => {
    prisma.flashSale.update.mockResolvedValue({ id: 'fs1' });
    const args = { where: { id: 'fs1' }, data: { isActive: false } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'fs1' });
    expect(prisma.flashSale.update).toHaveBeenCalledWith(args);
  });

  it('delete delegates to prisma.flashSale.delete', async () => {
    prisma.flashSale.delete.mockResolvedValue({ id: 'fs1' });
    const args = { where: { id: 'fs1' } };
    await expect(model.delete(args as any)).resolves.toEqual({ id: 'fs1' });
    expect(prisma.flashSale.delete).toHaveBeenCalledWith(args);
  });

  it('upsertProduct delegates to prisma.flashSaleProduct.upsert', async () => {
    prisma.flashSaleProduct.upsert.mockResolvedValue({ flashSaleId: 'fs1', productId: 'p1' });
    const args = { where: { flashSaleId_productId: { flashSaleId: 'fs1', productId: 'p1' } }, create: {}, update: {} };
    await expect(model.upsertProduct(args as any)).resolves.toEqual({ flashSaleId: 'fs1', productId: 'p1' });
    expect(prisma.flashSaleProduct.upsert).toHaveBeenCalledWith(args);
  });

  it('deleteManyProducts delegates to prisma.flashSaleProduct.deleteMany', async () => {
    prisma.flashSaleProduct.deleteMany.mockResolvedValue({ count: 1 });
    const args = { where: { flashSaleId: 'fs1', productId: 'p1' } };
    await expect(model.deleteManyProducts(args as any)).resolves.toEqual({ count: 1 });
    expect(prisma.flashSaleProduct.deleteMany).toHaveBeenCalledWith(args);
  });
});
