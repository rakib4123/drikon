import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';

@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Storefront: active slides in display order. */
  activeBanners() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Admin: every banner. */
  list() {
    return this.prisma.banner.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(dto: CreateBannerDto) {
    return this.prisma.banner.create({
      data: this.clean(dto) as Prisma.BannerCreateInput,
    });
  }

  async update(id: string, dto: UpdateBannerDto) {
    await this.getOrThrow(id);
    return this.prisma.banner.update({
      where: { id },
      data: this.clean(dto) as Prisma.BannerUpdateInput,
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.prisma.banner.delete({ where: { id } });
    return { id, deleted: true };
  }

  private clean(dto: CreateBannerDto | UpdateBannerDto) {
    // Convert empty strings to null for optional text columns.
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) {
      out[k] = v === '' ? null : v;
    }
    return out;
  }

  private async getOrThrow(id: string) {
    const b = await this.prisma.banner.findUnique({ where: { id }, select: { id: true } });
    if (!b) throw new NotFoundException('Banner not found');
    return b;
  }
}
