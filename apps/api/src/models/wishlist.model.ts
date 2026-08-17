import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class WishlistModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.WishlistItemFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.WishlistItemFindManyArgs>) {
    return this.prisma.wishlistItem.findMany(args);
  }

  upsert<T extends Prisma.WishlistItemUpsertArgs>(args: Prisma.SelectSubset<T, Prisma.WishlistItemUpsertArgs>) {
    return this.prisma.wishlistItem.upsert(args);
  }

  deleteMany(args: Prisma.WishlistItemDeleteManyArgs) {
    return this.prisma.wishlistItem.deleteMany(args);
  }
}
