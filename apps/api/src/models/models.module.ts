import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';
import { BrandModel } from './brand.model';
import { CategoryModel } from './category.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel],
})
export class ModelsModule {}
