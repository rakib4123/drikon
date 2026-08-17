import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';
import { BrandModel } from './brand.model';
import { CategoryModel } from './category.model';
import { BannerModel } from './banner.model';
import { FlashSaleModel } from './flash-sale.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel, BannerModel, FlashSaleModel],
  exports: [ProductModel, OrderModel, ReviewModel, CouponModel, BrandModel, CategoryModel, BannerModel, FlashSaleModel],
})
export class ModelsModule {}
