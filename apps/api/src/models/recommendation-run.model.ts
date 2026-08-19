import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class RecommendationRunModel {
  constructor(private readonly prisma: PrismaService) {}

  create<T extends Prisma.RecommendationRunCreateArgs>(args: Prisma.SelectSubset<T, Prisma.RecommendationRunCreateArgs>) {
    return this.prisma.recommendationRun.create(args);
  }

  findLatest() {
    return this.prisma.recommendationRun.findFirst({ orderBy: { computedAt: 'desc' } });
  }
}
