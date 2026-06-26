import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const hex = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, 'Must be a 6-digit hex colour')
  .optional()
  .or(z.literal(''));

const text = (max: number) => z.string().max(max).trim().optional().or(z.literal(''));

const featureSchema = z.object({
  title: z.string().max(60).trim(),
  body: z.string().max(160).trim(),
});

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

  // Editable storefront content
  heroBadge: text(120),
  heroTitle: text(120),
  heroHighlight: text(60),
  heroSubtitle: text(400),
  heroCtaLabel: text(40),
  heroCtaHref: text(200),
  heroCtaAltLabel: text(40),
  heroCtaAltHref: text(200),
  features: z.array(featureSchema).max(8).optional(),
  ctaHeading: text(120),
  ctaBody: text(400),
  ctaButtonLabel: text(40),
  ctaButtonHref: text(200),
  dealsTitle: text(60),
  dealsBlurb: text(160),
  dealsImage: z.string().url().optional().or(z.literal('')),
  topbarPromo: text(160),
  footerNote: text(120),
  shippingNote: text(80),
  returnsNote: text(80),
  warrantyNote: text(80),
  seoKeywords: text(300),
});
export class UpdateSettingsDto extends createZodDto(UpdateSettingsSchema) {}
