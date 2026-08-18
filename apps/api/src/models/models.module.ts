import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';
import { ReviewModel } from './review.model';
import { CouponModel } from './coupon.model';
import { BrandModel } from './brand.model';
import { CategoryModel } from './category.model';
import { BannerModel } from './banner.model';
import { FlashSaleModel } from './flash-sale.model';
import { WishlistModel } from './wishlist.model';
import { SettingsModel } from './settings.model';
import { UserModel } from './user.model';

const models = [
  ProductModel,
  OrderModel,
  ReviewModel,
  CouponModel,
  BrandModel,
  CategoryModel,
  BannerModel,
  FlashSaleModel,
  WishlistModel,
  SettingsModel,
  UserModel,
];

@Global()
@Module({
  providers: models,
  exports: models,
})
export class ModelsModule {}
