import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class ProductAssociationRuleModel {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.ProductAssociationRuleFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductAssociationRuleFindManyArgs>,
  ) {
    return this.prisma.productAssociationRule.findMany(args);
  }

  /** Atomically replaces the entire rule set with a freshly computed one. */
  async replaceAll(rules: Prisma.ProductAssociationRuleCreateManyInput[]) {
    return this.prisma.$transaction([
      this.prisma.productAssociationRule.deleteMany({}),
      this.prisma.productAssociationRule.createMany({ data: rules }),
    ]);
  }
}
