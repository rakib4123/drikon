import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class FlashSaleModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.FlashSaleFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleFindManyArgs>) {
    return this.prisma.flashSale.findMany(args);
  }

  findFirst<T extends Prisma.FlashSaleFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleFindFirstArgs>) {
    return this.prisma.flashSale.findFirst(args);
  }

  findUnique<T extends Prisma.FlashSaleFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleFindUniqueArgs>) {
    return this.prisma.flashSale.findUnique(args);
  }

  create<T extends Prisma.FlashSaleCreateArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleCreateArgs>) {
    return this.prisma.flashSale.create(args);
  }

  update<T extends Prisma.FlashSaleUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleUpdateArgs>) {
    return this.prisma.flashSale.update(args);
  }

  delete<T extends Prisma.FlashSaleDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleDeleteArgs>) {
    return this.prisma.flashSale.delete(args);
  }

  upsertProduct<T extends Prisma.FlashSaleProductUpsertArgs>(args: Prisma.SelectSubset<T, Prisma.FlashSaleProductUpsertArgs>) {
    return this.prisma.flashSaleProduct.upsert(args);
  }

  deleteManyProducts(args: Prisma.FlashSaleProductDeleteManyArgs) {
    return this.prisma.flashSaleProduct.deleteMany(args);
  }
}
