import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CartRecommendationsSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(50),
});
export class CartRecommendationsDto extends createZodDto(CartRecommendationsSchema) {}
