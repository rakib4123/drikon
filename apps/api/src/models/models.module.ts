import { Global, Module } from '@nestjs/common';
import { ProductModel } from './product.model';
import { OrderModel } from './order.model';

@Global()
@Module({
  providers: [ProductModel, OrderModel],
  exports: [ProductModel, OrderModel],
})
export class ModelsModule {}
