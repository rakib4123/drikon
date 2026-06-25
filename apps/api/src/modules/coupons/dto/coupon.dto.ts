import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const couponBase = {
  description: z.string().max(200).trim().optional().or(z.literal('')),
  isPercentage: z.coerce.boolean().default(true),
  value: z.coerce.number().min(0).max(1_000_000),
  minOrderAmount: z.coerce.number().nonnegative().optional(),
  maxRedemptions: z.coerce.number().int().positive().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.coerce.boolean().default(true),
  freeShipping: z.coerce.boolean().default(false),
  isPublic: z.coerce.boolean().default(false),
  categoryId: z.string().min(1).optional().or(z.literal('')),
};

export const CreateCouponSchema = z
  .object({
    code: z.string().min(2).max(40).trim().transform((s) => s.toUpperCase()),
    ...couponBase,
  })
  .refine((d) => !d.isPercentage || d.value <= 100, {
    message: 'Percentage discount cannot exceed 100',
    path: ['value'],
  });
export class CreateCouponDto extends createZodDto(CreateCouponSchema) {}

export const UpdateCouponSchema = z.object({
  code: z.string().min(2).max(40).trim().transform((s) => s.toUpperCase()).optional(),
  description: z.string().max(200).trim().optional().or(z.literal('')),
  isPercentage: z.coerce.boolean().optional(),
  value: z.coerce.number().min(0).max(1_000_000).optional(),
  minOrderAmount: z.coerce.number().nonnegative().optional(),
  maxRedemptions: z.coerce.number().int().positive().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.coerce.boolean().optional(),
  freeShipping: z.coerce.boolean().optional(),
  isPublic: z.coerce.boolean().optional(),
  categoryId: z.string().min(1).optional().or(z.literal('')),
});
export class UpdateCouponDto extends createZodDto(UpdateCouponSchema) {}

// ─── Apply / best (storefront) ───
const CartLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

export const ValidateCouponSchema = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.coerce.number().nonnegative(),
  items: z.array(CartLineSchema).max(50).optional(),
});
export class ValidateCouponDto extends createZodDto(ValidateCouponSchema) {}

export const BestCouponSchema = z.object({
  subtotal: z.coerce.number().nonnegative(),
  items: z.array(CartLineSchema).max(50).optional(),
});
export class BestCouponDto extends createZodDto(BestCouponSchema) {}
