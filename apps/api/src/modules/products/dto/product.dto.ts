import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().min(10).max(10_000),
  shortDescription: z.string().max(500).optional(),
  sku: z.string().min(2).max(64),
  price: z.coerce.number().positive().max(99_999_999),
  compareAtPrice: z.coerce.number().positive().max(99_999_999).optional(),
  currency: z.string().length(3).default('BDT'),
  stock: z.coerce.number().int().nonnegative().default(0),
  lowStockThreshold: z.coerce.number().int().nonnegative().default(5),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  categoryId: z.string().min(1),
  brandId: z.string().min(1).optional(),
  attributes: z.record(z.any()).optional(),
  metaTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(320).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        position: z.number().int().nonnegative().default(0),
      }),
    )
    .min(1)
    .max(10),
});
export class CreateProductDto extends createZodDto(CreateProductSchema) {}

export const UpdateProductSchema = CreateProductSchema.partial();
export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}

export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(60).default(20),
  search: z.string().max(120).optional(),
  category: z.string().optional(),       // slug
  brand: z.string().optional(),          // slug
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  inStock: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z
    .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'popular', 'rating'])
    .default('newest'),
});
export class ProductQueryDto extends createZodDto(ProductQuerySchema) {}
