import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public list, enriched with product counts for nav + admin. */
  list() {
    return this.prisma.category.findMany({
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
    return this.prisma.category.create({
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
    return this.prisma.category.update({
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
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found');

    const products = await this.prisma.product.findMany({
      where: { categoryId: id },
      select: { id: true, isActive: true },
    });

    if (products.length > 0) {
      // Active products must be moved/removed first — they're live in the store.
      if (products.some((p) => p.isActive)) {
        throw new BadRequestException(
          'This category still has active products. Remove or reassign them first.',
        );
      }
      // Only archived products remain. Any tied to past orders must stay (history).
      const ids = products.map((p) => p.id);
      const withOrders = await this.prisma.orderItem.count({
        where: { productId: { in: ids } },
      });
      if (withOrders > 0) {
        throw new BadRequestException(
          'This category has archived products linked to past orders, so it can’t be deleted.',
        );
      }
      // Safe: archived and never ordered → remove them (children cascade).
      await this.prisma.product.deleteMany({ where: { id: { in: ids } } });
    }

    await this.prisma.category.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async getOrThrow(id: string) {
    const c = await this.prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  private async assertSlugFree(slug: string, exceptId?: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`A category with slug "${slug}" already exists`);
    }
  }
}
