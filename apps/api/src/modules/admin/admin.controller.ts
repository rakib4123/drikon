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
  VerifyPaymentDto,
  AuditLogQueryDto,
} from './dto/admin.dto';
import { Audit, CurrentUser, Roles } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/decorators';

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
  @Audit('order.status', 'Order')
  @ApiOperation({ summary: 'Update an order status' })
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.admin.updateOrderStatus(id, dto.status);
  }

  @Patch('orders/:id/payment')
  @Audit('order.payment_verify', 'Order')
  @ApiOperation({ summary: 'Verify a manual payment (mark paid or failed)' })
  verifyPayment(@Param('id') id: string, @Body() dto: VerifyPaymentDto) {
    return this.admin.verifyPayment(id, dto.status, dto.adminNote);
  }

  // ─── Audit trail ───
  @Get('audit-logs')
  @ApiOperation({ summary: 'Admin action audit trail' })
  listAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.admin.listAuditLogs(query);
  }

  // ─── Users ───
  @Get('users')
  @ApiOperation({ summary: 'List users' })
  listUsers(@Query() query: AdminUserQueryDto) {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id/role')
  @Audit('user.role_change', 'User')
  @ApiOperation({ summary: 'Change a user role' })
  updateUserRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.admin.updateUserRole(actor, id, dto.role);
  }
}
