import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(80).trim(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).trim().optional().or(z.literal('')),
  nameBn: z.string().max(80).trim().optional().or(z.literal('')),
  descriptionBn: z.string().max(500).trim().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  parentId: z.string().min(1).optional().or(z.literal('')),
});
export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}

export const UpdateCategorySchema = CreateCategorySchema.partial();
export class UpdateCategoryDto extends createZodDto(UpdateCategorySchema) {}
