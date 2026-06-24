import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateCouponSchema = z
  .object({
    code: z
      .string()
      .min(2)
      .max(40)
      .trim()
      .transform((s) => s.toUpperCase()),
    description: z.string().max(200).trim().optional().or(z.literal('')),
    isPercentage: z.coerce.boolean().default(true),
    value: z.coerce.number().positive().max(1_000_000),
    minOrderAmount: z.coerce.number().nonnegative().optional(),
    maxRedemptions: z.coerce.number().int().positive().optional(),
    expiresAt: z.coerce.date().optional(),
    isActive: z.coerce.boolean().default(true),
  })
  .refine((d) => !d.isPercentage || d.value <= 100, {
    message: 'Percentage discount cannot exceed 100',
    path: ['value'],
  });
export class CreateCouponDto extends createZodDto(CreateCouponSchema) {}

// .partial() isn't available after .refine(); redefine the base for updates.
export const UpdateCouponSchema = z
  .object({
    code: z.string().min(2).max(40).trim().transform((s) => s.toUpperCase()).optional(),
    description: z.string().max(200).trim().optional().or(z.literal('')),
    isPercentage: z.coerce.boolean().optional(),
    value: z.coerce.number().positive().max(1_000_000).optional(),
    minOrderAmount: z.coerce.number().nonnegative().optional(),
    maxRedemptions: z.coerce.number().int().positive().optional(),
    expiresAt: z.coerce.date().optional(),
    isActive: z.coerce.boolean().optional(),
  });
export class UpdateCouponDto extends createZodDto(UpdateCouponSchema) {}
