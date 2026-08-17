import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WishlistModel } from '../../models/wishlist.model';
import { ProductModel } from '../../models/product.model';

const productSummaryInclude = {
  images: { orderBy: { position: 'asc' as const }, take: 1 },
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    private readonly wishlist: WishlistModel,
    private readonly products: ProductModel,
  ) {}

  /** List the user's wishlist, newest first, with full product cards. */
  async list(userId: string) {
    return this.wishlist.findMany({
      where: { userId, product: { isActive: true } },
      orderBy: { createdAt: 'desc' },
      include: { product: { include: productSummaryInclude } },
    });
  }

  /** Just the product IDs — lets the frontend hydrate heart-toggle state cheaply. */
  async listIds(userId: string): Promise<string[]> {
    const rows = await this.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }

  /** Add a product. Idempotent — adding twice is a no-op, not an error. */
  async add(userId: string, productId: string) {
    const product = await this.products.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { productId, wishlisted: true };
  }

  /** Remove a product. Idempotent — removing something absent is fine. */
  async remove(userId: string, productId: string) {
    await this.wishlist.deleteMany({ where: { userId, productId } });
    return { productId, wishlisted: false };
  }
}
