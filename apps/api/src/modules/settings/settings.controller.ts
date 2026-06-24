import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { Public, Roles } from '../../common/decorators';

@ApiTags('settings')
@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public site settings (branding) for the storefront' })
  get() {
    return this.settings.get();
  }

  @Patch()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: '(Admin) Update site settings / branding' })
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
