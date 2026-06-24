import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Mirrors CreateReviewSchema in @drikon/shared-types — kept inline to match the
// existing convention in product.dto.ts (DTOs redefine rather than import).
export const CreateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).trim().optional(),
  body: z.string().max(2000).trim().optional(),
});
export class CreateReviewDto extends createZodDto(CreateReviewSchema) {}
