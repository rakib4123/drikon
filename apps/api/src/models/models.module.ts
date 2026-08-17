import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';
import { BrandModel } from './brand.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel],
})
export class ModelsModule {}
