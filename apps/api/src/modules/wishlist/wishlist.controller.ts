import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { WishlistService } from './wishlist.service';
import { CurrentUser } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/decorators';

// Every route here is auth-protected by the global JwtAuthGuard (no @Public()).
@ApiTags('wishlist')
@Controller({ path: 'wishlist', version: '1' })
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user wishlist (full product cards)' })
  list(@CurrentUser('id') userId: string) {
    return this.wishlist.list(userId);
  }

  @Get('ids')
  @ApiOperation({ summary: 'List wishlisted product IDs (for toggle hydration)' })
  ids(@CurrentUser('id') userId: string) {
    return this.wishlist.listIds(userId);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add a product to the wishlist (idempotent)' })
  add(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return this.wishlist.add(userId, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove a product from the wishlist (idempotent)' })
  remove(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return this.wishlist.remove(userId, productId);
  }
}
