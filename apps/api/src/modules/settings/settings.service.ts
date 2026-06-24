import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateSettingsDto } from './dto/settings.dto';

const SINGLETON_ID = 'singleton';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Always returns the one settings row, creating defaults on first read. */
  async get() {
    return this.prisma.siteSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
  }

  /** Admin update. Empty strings clear optional fields (stored as null). */
  async update(dto: UpdateSettingsDto) {
    const data = Object.fromEntries(
      Object.entries(dto).map(([k, v]) => [k, v === '' ? null : v]),
    );
    return this.prisma.siteSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
  }
}
