import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('brands')
@Controller({ path: 'brands', version: '1' })
export class BrandsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all brands' })
  async findAll() {
    return this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
  }
}
