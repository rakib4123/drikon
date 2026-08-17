import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ReviewModel } from '../../models/review.model';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import type { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly reviews: ReviewModel,
    private readonly products: ProductModel,
    private readonly orders: OrderModel,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // LIST — visible reviews for a product + aggregate stats
  // ─────────────────────────────────────────────────────────────────
  async listForProduct(productId: string) {
    const [items, allRatings] = await this.reviews.listVisibleForProduct(productId);

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
    const product = await this.products.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const delivered = await this.orders.findDeliveredItem(userId, productId);
    const isVerified = Boolean(delivered);

    const review = await this.reviews.upsert({
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

    await this.reviews.recomputeProductAggregates(productId);
    return review;
  }

  async remove(userId: string, reviewId: string) {
    const review = await this.reviews.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, productId: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own review');
    }
    await this.reviews.delete({ where: { id: reviewId } });
    await this.reviews.recomputeProductAggregates(review.productId);
    return { id: reviewId, deleted: true };
  }

  // ─────────────────────────────────────────────────────────────────
  // ADMIN — moderation
  // ─────────────────────────────────────────────────────────────────
  async listAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.reviews.findManyAndCount(
      {
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      },
      {},
    );
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
    const review = await this.reviews.findUnique({
      where: { id },
      select: { id: true, productId: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    const updated = await this.reviews.update({
      where: { id },
      data: { isHidden },
    });
    await this.reviews.recomputeProductAggregates(review.productId);
    return updated;
  }
}
