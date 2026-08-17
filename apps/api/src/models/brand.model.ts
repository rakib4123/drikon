import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class BrandModel {
  constructor(private readonly prisma: PrismaService) {}

  // @ts-expect-error TS2322 - type-safe at runtime via SelectSubset
  findMany<T extends Prisma.BrandFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.BrandFindManyArgs> = {} as T) {
    return this.prisma.brand.findMany(args);
  }

  findFirst<T extends Prisma.BrandFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.BrandFindFirstArgs>) {
    return this.prisma.brand.findFirst(args);
  }

  findUnique<T extends Prisma.BrandFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.BrandFindUniqueArgs>) {
    return this.prisma.brand.findUnique(args);
  }

  create<T extends Prisma.BrandCreateArgs>(args: Prisma.SelectSubset<T, Prisma.BrandCreateArgs>) {
    return this.prisma.brand.create(args);
  }

  update<T extends Prisma.BrandUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.BrandUpdateArgs>) {
    return this.prisma.brand.update(args);
  }

  delete<T extends Prisma.BrandDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.BrandDeleteArgs>) {
    return this.prisma.brand.delete(args);
  }
}
