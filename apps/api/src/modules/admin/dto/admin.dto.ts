import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OrderStatus, Role } from '@prisma/client';

export const AdminOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  status: z.nativeEnum(OrderStatus).optional(),
  search: z.string().max(120).optional(),
});
export class AdminOrderQueryDto extends createZodDto(AdminOrderQuerySchema) {}

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});
export class UpdateOrderStatusDto extends createZodDto(UpdateOrderStatusSchema) {}

export const AdminUserQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  search: z.string().max(120).optional(),
});
export class AdminUserQueryDto extends createZodDto(AdminUserQuerySchema) {}

export const UpdateUserRoleSchema = z.object({
  role: z.nativeEnum(Role),
});
export class UpdateUserRoleDto extends createZodDto(UpdateUserRoleSchema) {}
