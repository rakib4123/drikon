import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryModel } from '../../models/category.model';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import { slugify } from '../../common/utils/slugify';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categories: CategoryModel,
    private readonly products: ProductModel,
    private readonly orders: OrderModel,
  ) {}

  /** Public list, enriched with product counts for nav + admin. */
  list() {
    return this.categories.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        parentId: true,
        _count: { select: { products: true } },
      },
    });
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || slugify(dto.name);
    await this.assertSlugFree(slug);
    return this.categories.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description || null,
        imageUrl: dto.imageUrl || null,
        parentId: dto.parentId || null,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.getOrThrow(id);
    const slug = dto.slug || (dto.name ? slugify(dto.name) : undefined);
    if (slug) await this.assertSlugFree(slug, id);
    return this.categories.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug && { slug }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId || null }),
      },
    });
  }

  async remove(id: string) {
    const category = await this.categories.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found');

    const products = await this.products.findMany({
      where: { categoryId: id },
      select: { id: true, isActive: true },
    });

    if (products.length > 0) {
      if (products.some((p) => p.isActive)) {
        throw new BadRequestException(
          'This category still has active products. Remove or reassign them first.',
        );
      }
      const ids = products.map((p) => p.id);
      const withOrders = await this.orders.countItemsForProducts(ids);
      if (withOrders > 0) {
        throw new BadRequestException(
          'This category has archived products linked to past orders, so it can’t be deleted.',
        );
      }
      await this.products.deleteMany({ where: { id: { in: ids } } });
    }

    await this.categories.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async getOrThrow(id: string) {
    const c = await this.categories.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  private async assertSlugFree(slug: string, exceptId?: string) {
    const existing = await this.categories.findUnique({ where: { slug }, select: { id: true } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`A category with slug "${slug}" already exists`);
    }
  }
}
