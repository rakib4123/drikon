import { Test, TestingModule } from '@nestjs/testing';
import { ProductModel } from '../../models/product.model';
import { OrderModel } from '../../models/order.model';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let products: jest.Mocked<Pick<ProductModel, 'findManyAndCount'>>;
  let orders: jest.Mocked<Pick<OrderModel, 'countItemsForProducts'>>;

  beforeEach(async () => {
    products = { findManyAndCount: jest.fn().mockResolvedValue([[], 0]) };
    orders = { countItemsForProducts: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductModel, useValue: products },
        { provide: OrderModel, useValue: orders },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('findAll search filter', () => {
    it('matches a Bangla search word against nameBn and descriptionBn, not just the English fields', async () => {
      await service.findAll({ page: 1, limit: 20, search: 'রোবট', sort: 'newest' } as any);

      const callArgs = products.findManyAndCount.mock.calls[0][0];
      const whereArg = callArgs.where as any;
      const andClause = whereArg.AND[0];

      expect(andClause.OR).toEqual(
        expect.arrayContaining([
          { name: { contains: 'রোবট', mode: 'insensitive' } },
          { description: { contains: 'রোবট', mode: 'insensitive' } },
          { nameBn: { contains: 'রোবট', mode: 'insensitive' } },
          { descriptionBn: { contains: 'রোবট', mode: 'insensitive' } },
          { sku: { contains: 'রোবট', mode: 'insensitive' } },
        ]),
      );
    });
  });
});
