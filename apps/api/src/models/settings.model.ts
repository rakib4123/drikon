import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class SettingsModel {
  constructor(private readonly prisma: PrismaService) {}

  upsert<T extends Prisma.SiteSettingsUpsertArgs>(args: Prisma.SelectSubset<T, Prisma.SiteSettingsUpsertArgs>) {
    return this.prisma.siteSettings.upsert(args);
  }
}
