import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const hex = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, 'Must be a 6-digit hex colour')
  .optional()
  .or(z.literal(''));

export const UpdateSettingsSchema = z.object({
  siteName: z.string().min(1).max(60).trim().optional(),
  tagline: z.string().max(160).trim().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  faviconUrl: z.string().url().optional().or(z.literal('')),
  accentColor: hex,
  accentColor2: hex,
  supportEmail: z.string().email().optional().or(z.literal('')),
  socialFacebook: z.string().url().optional().or(z.literal('')),
  socialInstagram: z.string().url().optional().or(z.literal('')),
});
export class UpdateSettingsDto extends createZodDto(UpdateSettingsSchema) {}
