import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';
import { Public, Roles } from '../../common/decorators';

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // ─── Public read endpoints ───
  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with filters, sort, pagination' })
  findAll(@Query() query: ProductQueryDto) {
    return this.products.findAll(query);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a product by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/all')
  @ApiOperation({ summary: '(Admin) List ALL products incl. inactive, paginated' })
  findAllAdmin(@Query() query: ProductQueryDto) {
    return this.products.findAll(query, { admin: true });
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: '(Admin) Get a product by ID for editing' })
  findById(@Param('id') id: string) {
    return this.products.findById(id);
  }

  // ─── Admin-only mutations ───
  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: '(Admin) Create a product' })
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: '(Admin) Update a product' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: '(Admin) Soft-delete a product' })
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
