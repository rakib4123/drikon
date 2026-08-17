import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FlashSaleModel } from '../../models/flash-sale.model';
import { ProductModel } from '../../models/product.model';
import { slugify } from '../../common/utils/slugify';
import type {
  CreateFlashSaleDto,
  UpdateFlashSaleDto,
  AddFlashSaleProductDto,
} from './dto/flash-sale.dto';

const productCard = {
  select: {
    id: true,
    name: true,
    slug: true,
    price: true,
    currency: true,
    stock: true,
    images: { orderBy: { position: 'asc' as const }, take: 1, select: { url: true, alt: true } },
  },
} satisfies Prisma.ProductDefaultArgs;

@Injectable()
export class FlashSalesService {
  constructor(
    private readonly flashSales: FlashSaleModel,
    private readonly products: ProductModel,
  ) {}

  list() {
    return this.flashSales.findMany({
      orderBy: { createdAt: 'desc' },
      include: { products: { include: { product: productCard } } },
    });
  }

  /** Storefront: products in the currently-running sale (flat, with sale price). */
  async active() {
    const now = new Date();
    const sale = await this.flashSales.findFirst({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: 'asc' },
      include: { products: { include: { product: productCard } } },
    });
    if (!sale) return null;
    return {
      id: sale.id,
      name: sale.name,
      slug: sale.slug,
      endsAt: sale.endsAt,
      items: sale.products
        .filter((p) => p.product.stock > 0)
        .map((p) => ({ salePrice: p.salePrice, soldCount: p.soldCount, product: p.product })),
    };
  }

  async create(dto: CreateFlashSaleDto) {
    const slug = dto.slug || slugify(dto.name);
    const exists = await this.flashSales.findUnique({ where: { slug }, select: { id: true } });
    if (exists) throw new ConflictException(`A flash sale with slug "${slug}" already exists`);
    return this.flashSales.create({
      data: { name: dto.name, slug, startsAt: dto.startsAt, endsAt: dto.endsAt, isActive: dto.isActive },
      include: { products: { include: { product: productCard } } },
    });
  }

  async update(id: string, dto: UpdateFlashSaleDto) {
    await this.getOrThrow(id);
    if (dto.startsAt && dto.endsAt && dto.endsAt <= dto.startsAt) {
      throw new BadRequestException('End must be after start');
    }
    const slug = dto.slug || (dto.name ? slugify(dto.name) : undefined);
    return this.flashSales.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug && { slug }),
        ...(dto.startsAt !== undefined && { startsAt: dto.startsAt }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { products: { include: { product: productCard } } },
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.flashSales.delete({ where: { id } });
    return { id, deleted: true };
  }

  async addProduct(id: string, dto: AddFlashSaleProductDto) {
    await this.getOrThrow(id);
    const product = await this.products.findUnique({ where: { id: dto.productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    return this.flashSales.upsertProduct({
      where: { flashSaleId_productId: { flashSaleId: id, productId: dto.productId } },
      create: {
        flashSaleId: id,
        productId: dto.productId,
        salePrice: new Prisma.Decimal(dto.salePrice),
        inventoryCap: dto.inventoryCap ?? null,
      },
      update: {
        salePrice: new Prisma.Decimal(dto.salePrice),
        inventoryCap: dto.inventoryCap ?? null,
      },
      include: { product: productCard },
    });
  }

  async removeProduct(id: string, productId: string) {
    await this.flashSales.deleteManyProducts({ where: { flashSaleId: id, productId } });
    return { flashSaleId: id, productId, removed: true };
  }

  private async getOrThrow(id: string) {
    const s = await this.flashSales.findUnique({ where: { id }, select: { id: true } });
    if (!s) throw new NotFoundException('Flash sale not found');
    return s;
  }
}
