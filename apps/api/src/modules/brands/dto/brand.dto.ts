import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateBrandSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});
export class CreateBrandDto extends createZodDto(CreateBrandSchema) {}

export const UpdateBrandSchema = CreateBrandSchema.partial();
export class UpdateBrandDto extends createZodDto(UpdateBrandSchema) {}
