import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class ReviewModel {
  constructor(private readonly prisma: PrismaService) {}

  /** Visible reviews (paginated to 50) + every visible rating, for aggregate computation. */
  listVisibleForProduct(productId: string) {
    return this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { productId, isHidden: false },
        orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
        take: 50,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      this.prisma.review.findMany({
        where: { productId, isHidden: false },
        select: { rating: true },
      }),
    ]);
  }

  upsert<T extends Prisma.ReviewUpsertArgs>(args: Prisma.SelectSubset<T, Prisma.ReviewUpsertArgs>) {
    return this.prisma.review.upsert(args);
  }

  findUnique<T extends Prisma.ReviewFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.ReviewFindUniqueArgs>) {
    return this.prisma.review.findUnique(args);
  }

  delete<T extends Prisma.ReviewDeleteArgs>(args: Prisma.SelectSubset<T, Prisma.ReviewDeleteArgs>) {
    return this.prisma.review.delete(args);
  }

  findManyAndCount<T extends Prisma.ReviewFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ReviewFindManyArgs>,
    countArgs: Prisma.ReviewCountArgs,
  ) {
    return this.prisma.$transaction([
      this.prisma.review.findMany(args),
      this.prisma.review.count(countArgs),
    ]);
  }

  update<T extends Prisma.ReviewUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.ReviewUpdateArgs>) {
    return this.prisma.review.update(args);
  }

  count(args: Prisma.ReviewCountArgs = {}) {
    return this.prisma.review.count(args);
  }

  /** Keeps the denormalized Product.averageRating / reviewCount in sync with visible reviews. */
  async recomputeProductAggregates(productId: string): Promise<void> {
    const agg = await this.prisma.review.aggregate({
      where: { productId, isHidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const count = agg._count.rating;
    const avg = agg._avg.rating ?? 0;
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        reviewCount: count,
        averageRating: Math.round(avg * 10) / 10,
      },
    });
  }
}
