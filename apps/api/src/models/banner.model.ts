import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class BannerModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.BannerFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.BannerFindManyArgs>) {
    return this.prisma.banner.findMany(args);
  }

  findUnique<T extends Prisma.BannerFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.BannerFindUniqueArgs>) {
    return this.prisma.banner.findUnique(args);
  }

  create<T extends Prisma.BannerCreateArgs>(args: Prisma.SelectSubset<T, Prisma.BannerCreateArgs>) {
    return this.prisma.banner.create(args);
  }

  update<T extends Prisma.BannerUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.BannerUpdateArgs>) {
    return this.prisma.banner.update(args);
  }

  delete<T extends Prisma.BannerDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.BannerDeleteArgs>) {
    return this.prisma.banner.delete(args);
  }
}
