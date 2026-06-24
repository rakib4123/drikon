import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import type { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.brand.findMany({
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
    return this.prisma.brand.create({
      data: { name: dto.name, slug, logoUrl: dto.logoUrl || null },
    });
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.getOrThrow(id);
    const slug = dto.slug || (dto.name ? slugify(dto.name) : undefined);
    if (slug) await this.assertFree(slug, dto.name, id);
    return this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug && { slug }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl || null }),
      },
    });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand._count.products > 0) {
      throw new BadRequestException('This brand still has products. Reassign them first.');
    }
    await this.prisma.brand.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async getOrThrow(id: string) {
    const b = await this.prisma.brand.findUnique({ where: { id }, select: { id: true } });
    if (!b) throw new NotFoundException('Brand not found');
    return b;
  }

  private async assertFree(slug: string, name?: string, exceptId?: string) {
    const clash = await this.prisma.brand.findFirst({
      where: {
        OR: [{ slug }, ...(name ? [{ name }] : [])],
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`A brand with that name/slug already exists`);
  }
}
