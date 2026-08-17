import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class CategoryModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.CategoryFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.CategoryFindManyArgs>) {
    return this.prisma.category.findMany(args);
  }

  findUnique<T extends Prisma.CategoryFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.CategoryFindUniqueArgs>) {
    return this.prisma.category.findUnique(args);
  }

  create<T extends Prisma.CategoryCreateArgs>(args: Prisma.SelectSubset<T, Prisma.CategoryCreateArgs>) {
    return this.prisma.category.create(args);
  }

  update<T extends Prisma.CategoryUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.CategoryUpdateArgs>) {
    return this.prisma.category.update(args);
  }

  delete<T extends Prisma.CategoryDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.CategoryDeleteArgs>) {
    return this.prisma.category.delete(args);
  }
}
