import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class ProductModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.ProductFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.ProductFindManyArgs>) {
    return this.prisma.product.findMany(args);
  }

  findFirst<T extends Prisma.ProductFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.ProductFindFirstArgs>) {
    return this.prisma.product.findFirst(args);
  }

  findManyAndCount<T extends Prisma.ProductFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductFindManyArgs>,
    countArgs: Prisma.ProductCountArgs,
  ) {
    return this.prisma.$transaction([
      this.prisma.product.findMany(args),
      this.prisma.product.count(countArgs),
    ]);
  }

  findUnique<T extends Prisma.ProductFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.ProductFindUniqueArgs>) {
    return this.prisma.product.findUnique(args);
  }

  create<T extends Prisma.ProductCreateArgs>(args: Prisma.SelectSubset<T, Prisma.ProductCreateArgs>) {
    return this.prisma.product.create(args);
  }

  count<T extends Prisma.ProductCountArgs>(args: Prisma.SelectSubset<T, Prisma.ProductCountArgs>) {
    return this.prisma.product.count(args);
  }

  /** Atomically replaces the product's image set (if `images` is given) and updates its fields. */
  async updateWithImages(
    id: string,
    data: Prisma.ProductUpdateInput,
    images: Prisma.ProductImageCreateManyProductInput[] | undefined,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((img) => ({ ...img, productId: id })),
        });
      }
      return tx.product.update({
        where: { id },
        data,
        include: { images: true, category: true, brand: true },
      });
    });
  }

  update<T extends Prisma.ProductUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.ProductUpdateArgs>) {
    return this.prisma.product.update(args);
  }

  delete<T extends Prisma.ProductDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.ProductDeleteArgs>) {
    return this.prisma.product.delete(args);
  }

  deleteMany(args: Prisma.ProductDeleteManyArgs) {
    return this.prisma.product.deleteMany(args);
  }

  /** Returns false (instead of throwing) when there isn't enough stock — the caller decides what that means. */
  async decrementStock(productId: string, qty: number): Promise<boolean> {
    const result = await this.prisma.product.updateMany({
      where: { id: productId, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    return result.count > 0;
  }
}
