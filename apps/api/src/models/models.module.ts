import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel],
  exports: [ProductModel, OrderModel, ReviewModel],
})
export class ModelsModule {}
