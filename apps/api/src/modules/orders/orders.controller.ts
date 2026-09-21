import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderQueryDto, QuoteDto } from './dto/order.dto';
import { CurrentUser, Public } from '../../common/decorators';

// Auth-protected by the global JwtAuthGuard, except the public price quote.
@ApiTags('orders')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // Public: guests price their cart too. It reads prices and writes nothing.
  @Public()
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Price a cart exactly as order creation would' })
  quote(@Body() dto: QuoteDto) {
    return this.orders.quote(dto);
  }

  @Post()
  @Throttle({ short: { limit: 12, ttl: 60_000 } }) // cap order placement / inventory abuse
  @ApiOperation({ summary: 'Place an order from a cart payload' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.orders.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List your order history (paginated)' })
  list(@CurrentUser('id') userId: string, @Query() query: OrderQueryDto) {
    return this.orders.listForUser(userId, query);
  }

  @Get(':orderNumber')
  @ApiOperation({ summary: 'Get one of your orders by its order number' })
  getOne(
    @CurrentUser('id') userId: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.orders.getByNumber(userId, orderNumber);
  }
}
