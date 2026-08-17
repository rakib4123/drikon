import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { WishlistModel } from './wishlist.model';

describe('WishlistModel', () => {
  let model: WishlistModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      wishlistItem: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WishlistModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(WishlistModel);
  });

  it('findMany delegates to prisma.wishlistItem.findMany', async () => {
    prisma.wishlistItem.findMany.mockResolvedValue([{ productId: 'p1' }]);
    const args = { where: { userId: 'u1' } };
    await expect(model.findMany(args as any)).resolves.toEqual([{ productId: 'p1' }]);
    expect(prisma.wishlistItem.findMany).toHaveBeenCalledWith(args);
  });

  it('upsert delegates to prisma.wishlistItem.upsert', async () => {
    prisma.wishlistItem.upsert.mockResolvedValue({ userId: 'u1', productId: 'p1' });
    const args = {
      where: { userId_productId: { userId: 'u1', productId: 'p1' } },
      create: { userId: 'u1', productId: 'p1' },
      update: {},
    };
    await expect(model.upsert(args as any)).resolves.toEqual({ userId: 'u1', productId: 'p1' });
    expect(prisma.wishlistItem.upsert).toHaveBeenCalledWith(args);
  });

  it('deleteMany delegates to prisma.wishlistItem.deleteMany', async () => {
    prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
    const args = { where: { userId: 'u1', productId: 'p1' } };
    await expect(model.deleteMany(args as any)).resolves.toEqual({ count: 1 });
    expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith(args);
  });
});
