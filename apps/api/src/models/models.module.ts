import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel],
})
export class ModelsModule {}
