import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class AdminLogModel {
  constructor(private readonly prisma: PrismaService) {}

  create<T extends Prisma.AdminLogCreateArgs>(args: Prisma.SelectSubset<T, Prisma.AdminLogCreateArgs>) {
    return this.prisma.adminLog.create(args);
  }

  findManyAndCount(args: Prisma.AdminLogFindManyArgs, countArgs: Prisma.AdminLogCountArgs) {
    return this.prisma.$transaction([
      this.prisma.adminLog.findMany(args),
      this.prisma.adminLog.count(countArgs),
    ]);
  }
}
