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

import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { Roles } from '../../common/decorators';

@ApiTags('coupons')
@Controller({ path: 'coupons', version: '1' })
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  // Authenticated (any signed-in user) — used by checkout to apply a code.
  @Get('validate')
  @ApiOperation({ summary: 'Validate a coupon code against a subtotal' })
  validate(@Query('code') code: string, @Query('subtotal') subtotal?: string) {
    return this.coupons.validate(code ?? '', subtotal ? parseFloat(subtotal) : 0);
  }

  // ─── Admin CRUD ───
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: '(Admin) List coupons' })
  list() {
    return this.coupons.list();
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: '(Admin) Create a coupon' })
  create(@Body() dto: CreateCouponDto) {
    return this.coupons.create(dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: '(Admin) Update a coupon' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.coupons.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: '(Admin) Delete a coupon' })
  remove(@Param('id') id: string) {
    return this.coupons.remove(id);
  }
}
