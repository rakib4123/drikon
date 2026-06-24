import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { AdminService } from './admin.service';
import {
  AdminOrderQueryDto,
  UpdateOrderStatusDto,
  AdminUserQueryDto,
  UpdateUserRoleDto,
} from './dto/admin.dto';
import { CurrentUser, Roles } from '../../common/decorators';

// Class-level role gate — every route here requires an admin.
@ApiTags('admin')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard metrics' })
  stats() {
    return this.admin.stats();
  }

  // ─── Orders ───
  @Get('orders')
  @ApiOperation({ summary: 'List all orders (filter by status / search)' })
  listOrders(@Query() query: AdminOrderQueryDto) {
    return this.admin.listOrders(query);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update an order status' })
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.admin.updateOrderStatus(id, dto.status);
  }

  // ─── Users ───
  @Get('users')
  @ApiOperation({ summary: 'List users' })
  listUsers(@Query() query: AdminUserQueryDto) {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change a user role' })
  updateUserRole(
    @CurrentUser('id') actingUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.admin.updateUserRole(actingUserId, id, dto.role);
  }
}
