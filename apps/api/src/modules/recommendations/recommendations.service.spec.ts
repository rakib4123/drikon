import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { OrderModel } from '../../models/order.model';
import { ProductModel } from '../../models/product.model';
import { ProductAssociationRuleModel } from '../../models/product-association-rule.model';
import { RecommendationRunModel } from '../../models/recommendation-run.model';
import { AprioriService } from './apriori.service';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let orders: jest.Mocked<Pick<OrderModel, 'findMany'>>;
  let products: jest.Mocked<Pick<ProductModel, 'findMany'>>;
  let rules: jest.Mocked<Pick<ProductAssociationRuleModel, 'findMany' | 'replaceAll'>>;
  let runs: jest.Mocked<Pick<RecommendationRunModel, 'create' | 'findLatest'>>;
  let apriori: jest.Mocked<Pick<AprioriService, 'computeRules'>>;

  beforeEach(async () => {
    orders = { findMany: jest.fn() };
    products = { findMany: jest.fn() };
    rules = { findMany: jest.fn(), replaceAll: jest.fn() };
    runs = { create: jest.fn(), findLatest: jest.fn() };
    apriori = { computeRules: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: OrderModel, useValue: orders },
        { provide: ProductModel, useValue: products },
        { provide: ProductAssociationRuleModel, useValue: rules },
        { provide: RecommendationRunModel, useValue: runs },
        { provide: AprioriService, useValue: apriori },
      ],
    }).compile();

    service = module.get(RecommendationsService);
  });

  describe('loadBaskets', () => {
    it('queries only qualifying order statuses and returns one product-id Set per order', async () => {
      orders.findMany.mockResolvedValue([
        { items: [{ productId: 'a' }, { productId: 'b' }] },
        { items: [{ productId: 'a' }] },
      ] as any);

      const baskets = await service.loadBaskets();

      expect(orders.findMany).toHaveBeenCalledWith({
        where: { status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } },
        select: { items: { select: { productId: true } } },
      });
      expect(baskets).toEqual([new Set(['a', 'b']), new Set(['a'])]);
    });
  });

  describe('getUserPurchaseHistory', () => {
    it('returns distinct product ids across the user\'s qualifying orders', async () => {
      orders.findMany.mockResolvedValue([
        { items: [{ productId: 'a' }, { productId: 'b' }] },
        { items: [{ productId: 'a' }] },
      ] as any);

      const history = await service.getUserPurchaseHistory('user1');

      expect(orders.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1', status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } },
        select: { items: { select: { productId: true } } },
      });
      expect(history.sort()).toEqual(['a', 'b']);
    });
  });

  describe('recompute', () => {
    it('loads baskets, mines rules, replaces the rule table, and logs a run', async () => {
      orders.findMany.mockResolvedValue([{ items: [{ productId: 'a' }, { productId: 'b' }] }] as any);
      apriori.computeRules.mockReturnValue([
        { antecedentIds: ['a'], antecedentSize: 1, consequentId: 'b', support: 1, confidence: 1, lift: 1 },
      ]);
      runs.create.mockResolvedValue({ id: 'run1', ordersAnalyzed: 1, rulesGenerated: 1, computedAt: new Date() } as any);

      const result = await service.recompute();

      expect(rules.replaceAll).toHaveBeenCalledWith([
        expect.objectContaining({ antecedentIds: ['a'], consequentId: 'b', support: 1, confidence: 1, lift: 1 }),
      ]);
      expect(runs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ ordersAnalyzed: 1, rulesGenerated: 1 }),
      });
      expect(result.rulesGenerated).toBe(1);
    });
  });

  describe('getRecommendations', () => {
    it('returns [] without querying when contextIds is empty', async () => {
      const result = await service.getRecommendations([], [], 6);
      expect(result).toEqual([]);
      expect(rules.findMany).not.toHaveBeenCalled();
    });

    it('filters to rules whose full antecedent is contained in context, excludes given ids, dedupes by consequent, and hydrates products in ranked order', async () => {
      rules.findMany.mockResolvedValue([
        { antecedentIds: ['a', 'x'], consequentId: 'c1', confidence: 0.9 }, // 'x' not in context -> must be dropped
        { antecedentIds: ['a'], consequentId: 'c2', confidence: 0.5 },
        { antecedentIds: ['a'], consequentId: 'c2', confidence: 0.3 }, // lower-ranked duplicate for c2, must be ignored
        { antecedentIds: ['a'], consequentId: 'excluded', confidence: 0.99 },
      ] as any);
      products.findMany.mockResolvedValue([
        { id: 'c2', name: 'Product C2' },
      ] as any);

      const result = await service.getRecommendations(['a'], ['excluded'], 6);

      expect(rules.findMany).toHaveBeenCalledWith({
        where: { antecedentIds: { hasSome: ['a'] } },
        orderBy: [{ antecedentSize: 'desc' }, { confidence: 'desc' }, { lift: 'desc' }],
        take: 500,
      });
      expect(products.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['c2'] }, isActive: true },
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
      });
      expect(result).toEqual([{ id: 'c2', name: 'Product C2' }]);
    });
  });

  describe('getStatus', () => {
    it('combines the latest run with a named preview of the top rules', async () => {
      runs.findLatest.mockResolvedValue({ ordersAnalyzed: 10, rulesGenerated: 3, computedAt: new Date('2026-01-01') } as any);
      rules.findMany.mockResolvedValue([
        { antecedentIds: ['a'], consequentId: 'b', confidence: 0.8, lift: 1.5 },
      ] as any);
      products.findMany.mockResolvedValue([
        { id: 'a', name: 'Product A' },
        { id: 'b', name: 'Product B' },
      ] as any);

      const status = await service.getStatus();

      expect(status.lastRun).toEqual(expect.objectContaining({ ordersAnalyzed: 10, rulesGenerated: 3 }));
      expect(status.rules).toEqual([
        { antecedentNames: ['Product A'], consequentName: 'Product B', confidence: 0.8, lift: 1.5 },
      ]);
    });
  });
});
