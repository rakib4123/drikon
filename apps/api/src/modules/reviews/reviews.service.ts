import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────
  // LIST — visible reviews for a product + aggregate stats
  // ─────────────────────────────────────────────────────────────────
  async listForProduct(productId: string) {
    const [items, allRatings] = await this.prisma.$transaction([
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

    // distribution[0] = count of 1★ … distribution[4] = count of 5★
    const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const r of allRatings) {
      distribution[r.rating - 1] += 1;
      sum += r.rating;
    }
    const count = allRatings.length;

    return {
      items,
      reviewCount: count,
      averageRating: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
      distribution,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // CREATE / UPDATE — one review per user per product
  // ─────────────────────────────────────────────────────────────────
  async upsertForProduct(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Verified-buyer: the user has a delivered order containing this product.
    const delivered = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: OrderStatus.DELIVERED },
      },
      select: { id: true },
    });
    const isVerified = Boolean(delivered);

    const review = await this.prisma.review.upsert({
      where: { userId_productId: { userId, productId } },
      create: {
        userId,
        productId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        isVerified,
      },
      update: {
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        isVerified,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await this.recomputeAggregates(productId);
    return review;
  }

  async remove(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, productId: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own review');
    }
    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.recomputeAggregates(review.productId);
    return { id: reviewId, deleted: true };
  }

  // ─────────────────────────────────────────────────────────────────
  // ADMIN — moderation
  // ─────────────────────────────────────────────────────────────────
  async listAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.review.count(),
    ]);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + items.length < total,
        hasPrev: page > 1,
      },
    };
  }

  async setHidden(id: string, isHidden: boolean) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, productId: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    const updated = await this.prisma.review.update({
      where: { id },
      data: { isHidden },
    });
    // Hidden reviews are excluded from aggregates — keep them in sync.
    await this.recomputeAggregates(review.productId);
    return updated;
  }

  // ─────────────────────────────────────────────────────────────────
  // Keep the denormalized Product.averageRating / reviewCount in sync.
  // ─────────────────────────────────────────────────────────────────
  private async recomputeAggregates(productId: string) {
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
