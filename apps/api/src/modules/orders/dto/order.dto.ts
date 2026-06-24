import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Mirrors CreateOrderSchema / ShippingAddressSchema in @drikon/shared-types.
export const ShippingAddressSchema = z.object({
  fullName: z.string().min(2).max(120).trim(),
  phone: z.string().min(5).max(30).trim(),
  line1: z.string().min(2).max(200).trim(),
  line2: z.string().max(200).trim().optional(),
  city: z.string().min(1).max(120).trim(),
  state: z.string().max(120).trim().optional(),
  postalCode: z.string().min(1).max(20).trim(),
  country: z.string().min(2).max(60).default('BD'),
});

export const CheckoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.coerce.number().int().positive().max(99),
});

export const CreateOrderSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1).max(50),
  shippingAddress: ShippingAddressSchema,
  notes: z.string().max(500).trim().optional(),
});
export class CreateOrderDto extends createZodDto(CreateOrderSchema) {}

export const OrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export class OrderQueryDto extends createZodDto(OrderQuerySchema) {}
