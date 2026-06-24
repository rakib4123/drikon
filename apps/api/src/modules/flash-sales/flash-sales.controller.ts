import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { FlashSalesService } from './flash-sales.service';
import {
  CreateFlashSaleDto,
  UpdateFlashSaleDto,
  AddFlashSaleProductDto,
} from './dto/flash-sale.dto';
import { Public, Roles } from '../../common/decorators';

@ApiTags('flash-sales')
@Controller({ path: 'flash-sales', version: '1' })
export class FlashSalesController {
  constructor(private readonly flashSales: FlashSalesService) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'The currently-running flash sale (storefront)' })
  active() {
    return this.flashSales.active();
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: '(Admin) List flash sales' })
  list() {
    return this.flashSales.list();
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: '(Admin) Create a flash sale' })
  create(@Body() dto: CreateFlashSaleDto) {
    return this.flashSales.create(dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: '(Admin) Update a flash sale' })
  update(@Param('id') id: string, @Body() dto: UpdateFlashSaleDto) {
    return this.flashSales.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: '(Admin) Delete a flash sale' })
  remove(@Param('id') id: string) {
    return this.flashSales.remove(id);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post(':id/products')
  @ApiOperation({ summary: '(Admin) Add/update a product in a flash sale' })
  addProduct(@Param('id') id: string, @Body() dto: AddFlashSaleProductDto) {
    return this.flashSales.addProduct(id, dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id/products/:productId')
  @ApiOperation({ summary: '(Admin) Remove a product from a flash sale' })
  removeProduct(@Param('id') id: string, @Param('productId') productId: string) {
    return this.flashSales.removeProduct(id, productId);
  }
}
