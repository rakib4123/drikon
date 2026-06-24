import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateFlashSaleSchema = z
  .object({
    name: z.string().min(1).max(120).trim(),
    slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isActive: z.coerce.boolean().default(true),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: 'End must be after start',
    path: ['endsAt'],
  });
export class CreateFlashSaleDto extends createZodDto(CreateFlashSaleSchema) {}

export const UpdateFlashSaleSchema = z.object({
  name: z.string().min(1).max(120).trim().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  isActive: z.coerce.boolean().optional(),
});
export class UpdateFlashSaleDto extends createZodDto(UpdateFlashSaleSchema) {}

export const AddFlashSaleProductSchema = z.object({
  productId: z.string().min(1),
  salePrice: z.coerce.number().positive().max(99_999_999),
  inventoryCap: z.coerce.number().int().positive().optional(),
});
export class AddFlashSaleProductDto extends createZodDto(AddFlashSaleProductSchema) {}
