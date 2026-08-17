import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BrandModel } from '../../models/brand.model';
import { slugify } from '../../common/utils/slugify';
import type { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly brands: BrandModel) {}

  list() {
    return this.brands.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        _count: { select: { products: true } },
      },
    });
  }

  async create(dto: CreateBrandDto) {
    const slug = dto.slug || slugify(dto.name);
    await this.assertFree(slug, dto.name);
    return this.brands.create({
      data: { name: dto.name, slug, logoUrl: dto.logoUrl || null },
    });
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.getOrThrow(id);
    const slug = dto.slug || (dto.name ? slugify(dto.name) : undefined);
    if (slug) await this.assertFree(slug, dto.name, id);
    return this.brands.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug && { slug }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl || null }),
      },
    });
  }

  async remove(id: string) {
    const brand = await this.brands.findUnique({
      where: { id },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand._count.products > 0) {
      throw new BadRequestException('This brand still has products. Reassign them first.');
    }
    await this.brands.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async getOrThrow(id: string) {
    const b = await this.brands.findUnique({ where: { id }, select: { id: true } });
    if (!b) throw new NotFoundException('Brand not found');
    return b;
  }

  private async assertFree(slug: string, name?: string, exceptId?: string) {
    const clash = await this.brands.findFirst({
      where: {
        OR: [{ slug }, ...(name ? [{ name }] : [])],
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`A brand with that name/slug already exists`);
  }
}
