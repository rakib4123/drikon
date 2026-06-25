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

import { CouponsService } from './coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  BestCouponDto,
} from './dto/coupon.dto';
import { Public, Roles } from '../../common/decorators';

@ApiTags('coupons')
@Controller({ path: 'coupons', version: '1' })
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  // ─── Storefront (public — guests can apply coupons in the cart) ───
  @Public()
  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon against a cart' })
  validate(@Body() dto: ValidateCouponDto) {
    return this.coupons.validate(dto.code, dto.subtotal, dto.items);
  }

  @Public()
  @Post('best')
  @ApiOperation({ summary: 'Best eligible coupon for a cart (auto-apply)' })
  best(@Body() dto: BestCouponDto) {
    return this.coupons.best(dto.subtotal, dto.items);
  }

  @Public()
  @Get('offers')
  @ApiOperation({ summary: 'Public, currently-valid coupon offers' })
  offers() {
    return this.coupons.offers();
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
