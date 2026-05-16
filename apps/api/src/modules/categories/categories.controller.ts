import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('categories')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all categories' })
  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
  }
}
