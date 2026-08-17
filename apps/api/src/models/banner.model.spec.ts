import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { BannerModel } from './banner.model';

describe('BannerModel', () => {
  let model: BannerModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      banner: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BannerModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(BannerModel);
  });

  it('findMany delegates to prisma.banner.findMany', async () => {
    prisma.banner.findMany.mockResolvedValue([{ id: 'b1' }]);
    await expect(model.findMany({})).resolves.toEqual([{ id: 'b1' }]);
    expect(prisma.banner.findMany).toHaveBeenCalledWith({});
  });

  it('findUnique delegates to prisma.banner.findUnique', async () => {
    prisma.banner.findUnique.mockResolvedValue({ id: 'b1' });
    const args = { where: { id: 'b1' } };
    await expect(model.findUnique(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.banner.findUnique).toHaveBeenCalledWith(args);
  });

  it('create delegates to prisma.banner.create', async () => {
    prisma.banner.create.mockResolvedValue({ id: 'b1' });
    const args = { data: { title: 'Sale' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.banner.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.banner.update', async () => {
    prisma.banner.update.mockResolvedValue({ id: 'b1' });
    const args = { where: { id: 'b1' }, data: { title: 'New' } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.banner.update).toHaveBeenCalledWith(args);
  });

  it('delete delegates to prisma.banner.delete', async () => {
    prisma.banner.delete.mockResolvedValue({ id: 'b1' });
    const args = { where: { id: 'b1' } };
    await expect(model.delete(args as any)).resolves.toEqual({ id: 'b1' });
    expect(prisma.banner.delete).toHaveBeenCalledWith(args);
  });
});
