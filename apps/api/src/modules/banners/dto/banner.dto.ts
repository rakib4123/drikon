import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateBannerSchema = z.object({
  heading: z.string().min(1).max(120).trim(),
  subheading: z.string().max(300).trim().optional().or(z.literal('')),
  headingBn: z.string().max(120).trim().optional().or(z.literal('')),
  subheadingBn: z.string().max(300).trim().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  ctaLabel: z.string().max(40).trim().optional().or(z.literal('')),
  ctaHref: z.string().max(300).trim().optional().or(z.literal('')),
  position: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.coerce.boolean().default(true),
});
export class CreateBannerDto extends createZodDto(CreateBannerSchema) {}

export const UpdateBannerSchema = CreateBannerSchema.partial();
export class UpdateBannerDto extends createZodDto(UpdateBannerSchema) {}
