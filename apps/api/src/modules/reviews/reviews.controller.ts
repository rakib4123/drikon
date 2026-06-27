import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';
import { Public, Roles, CurrentUser } from '../../common/decorators';

@ApiTags('reviews')
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'List visible reviews + aggregates for a product' })
  listForProduct(@Param('productId') productId: string) {
    return this.reviews.listForProduct(productId);
  }

  @Post('product/:productId')
  @Throttle({ short: { limit: 10, ttl: 60_000 } }) // 10 review writes / min / IP
  @ApiOperation({ summary: 'Create or update your review for a product' })
  upsert(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.upsertForProduct(userId, productId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete your own review' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.reviews.remove(userId, id);
  }

  // ─── Admin moderation ───
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/all')
  @ApiOperation({ summary: '(Admin) List every review for moderation' })
  listAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reviews.listAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id/visibility')
  @ApiOperation({ summary: '(Admin) Hide or unhide a review' })
  setHidden(@Param('id') id: string, @Body('isHidden') isHidden: boolean) {
    return this.reviews.setHidden(id, Boolean(isHidden));
  }
}
