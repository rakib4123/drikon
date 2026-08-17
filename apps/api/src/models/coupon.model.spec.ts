import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { CouponModel } from './coupon.model';

describe('CouponModel', () => {
  let model: CouponModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      coupon: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CouponModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(CouponModel);
  });

  it('findMany delegates to prisma.coupon.findMany', async () => {
    prisma.coupon.findMany.mockResolvedValue([{ id: 'c1' }]);
    await expect(model.findMany()).resolves.toEqual([{ id: 'c1' }]);
    expect(prisma.coupon.findMany).toHaveBeenCalledWith({});
  });

  it('findUnique delegates to prisma.coupon.findUnique', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ id: 'c1', code: 'SAVE10' });
    const args = { where: { code: 'SAVE10' } };
    await expect(model.findUnique(args as any)).resolves.toEqual({ id: 'c1', code: 'SAVE10' });
    expect(prisma.coupon.findUnique).toHaveBeenCalledWith(args);
  });

  it('create delegates to prisma.coupon.create', async () => {
    prisma.coupon.create.mockResolvedValue({ id: 'c1' });
    const args = { data: { code: 'SAVE10' } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.coupon.create).toHaveBeenCalledWith(args);
  });

  it('update delegates to prisma.coupon.update', async () => {
    prisma.coupon.update.mockResolvedValue({ id: 'c1' });
    const args = { where: { id: 'c1' }, data: { isActive: false } };
    await expect(model.update(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.coupon.update).toHaveBeenCalledWith(args);
  });

  it('delete delegates to prisma.coupon.delete', async () => {
    prisma.coupon.delete.mockResolvedValue({ id: 'c1' });
    const args = { where: { id: 'c1' } };
    await expect(model.delete(args as any)).resolves.toEqual({ id: 'c1' });
    expect(prisma.coupon.delete).toHaveBeenCalledWith(args);
  });
});
