import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderQueryDto } from './dto/order.dto';
import { CurrentUser } from '../../common/decorators';

// All routes auth-protected by the global JwtAuthGuard.
@ApiTags('orders')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
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
