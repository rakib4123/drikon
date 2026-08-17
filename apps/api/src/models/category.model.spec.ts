import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { CategoryModel } from './category.model';

describe('CategoryModel', () => {
  let model: CategoryModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(CategoryModel);
  });

  it('findMany delegates to prisma.category.findMany', async () => {
    prisma.category.findMany.mockResolvedValue([{ id: 'c1' }]);
    await expect(model.findMany({})).resolves.toEqual([{ id: 'c1' }]);
    expect(prisma.category.findMany).toHaveBeenCalledWith({});
  });

  it('findUnique delegates to prisma.category.findUnique', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
    const args = { where: { id: 'c1' } };
    await expect(model.findUnique(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.category.findUnique).toHaveBeenCalledWith(args);
  });

  it('create delegates to prisma.category.create', async () => {
    prisma.category.create.mockResolvedValue({ id: 'c1' });
    const args = { data: { name: 'Phones', slug: 'phones' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.category.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.category.update', async () => {
    prisma.category.update.mockResolvedValue({ id: 'c1' });
    const args = { where: { id: 'c1' }, data: { name: 'New' } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.category.update).toHaveBeenCalledWith(args);
  });

  it('delete delegates to prisma.category.delete', async () => {
    prisma.category.delete.mockResolvedValue({ id: 'c1' });
    const args = { where: { id: 'c1' } };
    await expect(model.delete(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.category.delete).toHaveBeenCalledWith(args);
  });
});
