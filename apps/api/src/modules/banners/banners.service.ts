import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BannerModel } from '../../models/banner.model';
import type { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';

@Injectable()
export class BannersService {
  constructor(private readonly banners: BannerModel) {}

  /** Storefront: active slides in display order. */
  activeBanners() {
    return this.banners.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Admin: every banner. */
  list() {
    return this.banners.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(dto: CreateBannerDto) {
    return this.banners.create({
      data: this.clean(dto) as Prisma.BannerCreateInput,
    });
  }

  async update(id: string, dto: UpdateBannerDto) {
    await this.getOrThrow(id);
    return this.banners.update({
      where: { id },
      data: this.clean(dto) as Prisma.BannerUpdateInput,
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.banners.delete({ where: { id } });
    return { id, deleted: true };
  }

  private clean(dto: CreateBannerDto | UpdateBannerDto) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) {
      out[k] = v === '' ? null : v;
    }
    return out;
  }

  private async getOrThrow(id: string) {
    const b = await this.banners.findUnique({ where: { id }, select: { id: true } });
    if (!b) throw new NotFoundException('Banner not found');
    return b;
  }
}
