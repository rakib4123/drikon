import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';
import { Public, CurrentUser } from '../../common/decorators';

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
}
