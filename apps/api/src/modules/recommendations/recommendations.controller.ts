import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RecommendationsService } from './recommendations.service';
import { CartRecommendationsDto } from './dto/cart-recommendations.dto';
import { CurrentUser, Public, Roles } from '../../common/decorators';

const DEFAULT_LIMIT = 6;

@ApiTags('recommendations')
@Controller({ path: 'recommendations', version: '1' })
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Frequently-bought-together recommendations for one product' })
  forProduct(@Param('productId') productId: string) {
    return this.recommendations.getRecommendations([productId], [productId], DEFAULT_LIMIT);
  }

  @Public()
  @Post('cart')
  @ApiOperation({ summary: 'Recommendations based on current cart contents' })
  forCart(@Body() dto: CartRecommendationsDto) {
    return this.recommendations.getRecommendations(dto.productIds, dto.productIds, DEFAULT_LIMIT);
  }

  @Get('me')
  @ApiOperation({ summary: "Recommendations based on the current user's purchase history" })
  async forMe(@CurrentUser('id') userId: string) {
    const history = await this.recommendations.getUserPurchaseHistory(userId);
    if (history.length === 0) return [];
    // Don't exclude already-purchased products here: unlike the PDP/cart contexts (where
    // the viewed/cart item itself is meaningless as a "recommendation"), a customer's full
    // purchase history is a valid basket to mine rules against, and excluding every product
    // they've ever bought means a loyal customer who has purchased across the whole catalog
    // would always get zero recommendations.
    return this.recommendations.getRecommendations(history, [], DEFAULT_LIMIT);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('recompute')
  @ApiOperation({ summary: '(Admin) Recompute association rules from current order history' })
  recompute() {
    return this.recommendations.recompute();
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('status')
  @ApiOperation({ summary: '(Admin) Latest recompute status and a preview of top rules' })
  status() {
    return this.recommendations.getStatus();
  }
}
