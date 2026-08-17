import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class CouponModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.CouponFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.CouponFindManyArgs>) {
    return this.prisma.coupon.findMany(args);
  }

  findUnique<T extends Prisma.CouponFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.CouponFindUniqueArgs>) {
    return this.prisma.coupon.findUnique(args);
  }

  create<T extends Prisma.CouponCreateArgs>(args: Prisma.SelectSubset<T, Prisma.CouponCreateArgs>) {
    return this.prisma.coupon.create(args);
  }

  update<T extends Prisma.CouponUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.CouponUpdateArgs>) {
    return this.prisma.coupon.update(args);
  }

  delete<T extends Prisma.CouponDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.CouponDeleteArgs>) {
    return this.prisma.coupon.delete(args);
  }
}
