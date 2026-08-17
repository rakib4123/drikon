import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { BrandModel } from './brand.model';

describe('BrandModel', () => {
  let model: BrandModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      brand: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BrandModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(BrandModel);
  });

  it('findMany delegates to prisma.brand.findMany', async () => {
    prisma.brand.findMany.mockResolvedValue([{ id: 'b1' }]);
    await expect(model.findMany({})).resolves.toEqual([{ id: 'b1' }]);
    expect(prisma.brand.findMany).toHaveBeenCalledWith({});
  });

  it('findFirst delegates to prisma.brand.findFirst', async () => {
    prisma.brand.findFirst.mockResolvedValue({ id: 'b1' });
    const args = { where: { slug: 'acme' } };
    await expect(model.findFirst(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.brand.findFirst).toHaveBeenCalledWith(args);
  });

  it('findUnique delegates to prisma.brand.findUnique', async () => {
    prisma.brand.findUnique.mockResolvedValue({ id: 'b1' });
    const args = { where: { id: 'b1' } };
    await expect(model.findUnique(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.brand.findUnique).toHaveBeenCalledWith(args);
  });

  it('create delegates to prisma.brand.create', async () => {
    prisma.brand.create.mockResolvedValue({ id: 'b1' });
    const args = { data: { name: 'Acme', slug: 'acme' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.brand.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.brand.update', async () => {
    prisma.brand.update.mockResolvedValue({ id: 'b1' });
    const args = { where: { id: 'b1' }, data: { name: 'New' } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.brand.update).toHaveBeenCalledWith(args);
  });

  it('delete delegates to prisma.brand.delete', async () => {
    prisma.brand.delete.mockResolvedValue({ id: 'b1' });
    const args = { where: { id: 'b1' } };
    await expect(model.delete(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.brand.delete).toHaveBeenCalledWith(args);
  });
});
