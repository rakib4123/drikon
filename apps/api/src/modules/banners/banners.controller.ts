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

import { BannersService } from './banners.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import { Public, Roles } from '../../common/decorators';

@ApiTags('banners')
@Controller({ path: 'banners', version: '1' })
export class BannersController {
  constructor(private readonly banners: BannersService) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Active hero banners for the storefront slider' })
  active() {
    return this.banners.activeBanners();
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: '(Admin) List all banners' })
  list() {
    return this.banners.list();
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: '(Admin) Create a banner' })
  create(@Body() dto: CreateBannerDto) {
    return this.banners.create(dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: '(Admin) Update a banner' })
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.banners.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: '(Admin) Delete a banner' })
  remove(@Param('id') id: string) {
    return this.banners.remove(id);
  }
}
