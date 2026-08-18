import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/).optional(),
  avatarUrl: z.string().url().optional(),
});
export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}
