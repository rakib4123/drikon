import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly products: ProductModel,
    private readonly orders: OrderModel,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // LIST — filtering, sorting, pagination
  // ─────────────────────────────────────────────────────────────────
  async findAll(query: ProductQueryDto, opts: { admin?: boolean } = {}) {
    const { page, limit, search, category, brand, minPrice, maxPrice, minRating, inStock, featured, sort } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      // Admins see every product (incl. inactive) so they can manage/re-activate them.
      ...(opts.admin ? {} : { isActive: true }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category: { slug: category } }),
      ...(brand && { brand: { slug: brand } }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined && { gte: new Prisma.Decimal(minPrice) }),
              ...(maxPrice !== undefined && { lte: new Prisma.Decimal(maxPrice) }),
            },
          }
        : {}),
      ...(minRating !== undefined && { averageRating: { gte: minRating } }),
      ...(inStock && { stock: { gt: 0 } }),
      ...(featured !== undefined && { isFeatured: featured }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (sort) {
        case 'oldest':     return { createdAt: 'asc' };
        case 'price_asc':  return { price: 'asc' };
        case 'price_desc': return { price: 'desc' };
        case 'popular':    return { salesCount: 'desc' };
        case 'rating':     return { averageRating: 'desc' };
        case 'newest':
        default:           return { createdAt: 'desc' };
      }
    })();

    const [items, total] = await this.products.findManyAndCount(
      {
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
      },
      { where },
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

  // ─────────────────────────────────────────────────────────────────
  // DETAIL
  // ─────────────────────────────────────────────────────────────────
  async findBySlug(slug: string) {
    const product = await this.products.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { position: 'asc' } },
        category: true,
        brand: true,
        variants: true,
        reviews: {
          where: { isHidden: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  // ─────────────────────────────────────────────────────────────────
  // GET ONE BY ID (admin edit form)
  // ─────────────────────────────────────────────────────────────────
  async findById(id: string) {
    const product = await this.products.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ─────────────────────────────────────────────────────────────────
  // CREATE (admin)
  // ─────────────────────────────────────────────────────────────────
  async create(dto: CreateProductDto) {
    const slug = dto.slug ?? this.slugify(dto.name);
    try {
      return await this.products.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          shortDescription: dto.shortDescription,
          sku: dto.sku,
          price: new Prisma.Decimal(dto.price),
          compareAtPrice: dto.compareAtPrice ? new Prisma.Decimal(dto.compareAtPrice) : null,
          currency: dto.currency,
          stock: dto.stock,
          lowStockThreshold: dto.lowStockThreshold,
          isActive: dto.isActive,
          isFeatured: dto.isFeatured,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          attributes: dto.attributes as any,
          videoUrl: dto.videoUrl || null,
          metaTitle: dto.metaTitle,
          metaDescription: dto.metaDescription,
          images: { create: dto.images ?? [] },
        },
        include: { images: true, category: true, brand: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('A product with this slug or SKU already exists');
      }
      throw e;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // UPDATE (admin)
  // ─────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id); // 404 if missing

    const { images, price, compareAtPrice, videoUrl, ...rest } = dto;

    return this.products.updateWithImages(
      id,
      {
        ...rest,
        ...(videoUrl !== undefined && { videoUrl: videoUrl || null }),
        ...(price !== undefined && { price: new Prisma.Decimal(price) }),
        ...(compareAtPrice !== undefined && {
          compareAtPrice: compareAtPrice === null ? null : new Prisma.Decimal(compareAtPrice),
        }),
      },
      images,
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // DELETE (admin)
  // Never-ordered products are removed completely (images, variants, cart,
  // wishlist, reviews, flash-sale entries all cascade). Products with order
  // history are archived (isActive = false) instead, so past orders stay intact.
  // ─────────────────────────────────────────────────────────────────
  async remove(id: string) {
    await this.findById(id);
    const orderCount = await this.orders.countItemsForProducts([id]);
    if (orderCount > 0) {
      return this.products.update({
        where: { id },
        data: { isActive: false },
      });
    }
    await this.products.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─────────────────────────────────────────────────────────────────
  // STOCK MUTATION — atomic, used by checkout
  // ─────────────────────────────────────────────────────────────────
  async decrementStock(productId: string, qty: number): Promise<void> {
    const ok = await this.products.decrementStock(productId, qty);
    if (!ok) {
      throw new ConflictException('Insufficient stock');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  private slugify(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }
}
