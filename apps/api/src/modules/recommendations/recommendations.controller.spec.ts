import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let recommendations: jest.Mocked<Pick<RecommendationsService, 'getRecommendations' | 'getUserPurchaseHistory'>>;

  beforeEach(async () => {
    recommendations = {
      getRecommendations: jest.fn(),
      getUserPurchaseHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationsController, { provide: RecommendationsService, useValue: recommendations }],
    }).compile();

    controller = module.get(RecommendationsController);
  });

  describe('forProduct', () => {
    it('uses the viewed product as both context and exclude', async () => {
      recommendations.getRecommendations.mockResolvedValue([]);

      await controller.forProduct('p1');

      expect(recommendations.getRecommendations).toHaveBeenCalledWith(['p1'], ['p1'], 6);
    });
  });

  describe('forCart', () => {
    it('uses cart contents as both context and exclude', async () => {
      recommendations.getRecommendations.mockResolvedValue([]);

      await controller.forCart({ productIds: ['a', 'b'] });

      expect(recommendations.getRecommendations).toHaveBeenCalledWith(['a', 'b'], ['a', 'b'], 6);
    });
  });

  describe('forMe', () => {
    it("uses purchase history as context but does NOT exclude it", async () => {
      recommendations.getUserPurchaseHistory.mockResolvedValue(['x', 'y']);
      recommendations.getRecommendations.mockResolvedValue([]);

      await controller.forMe('user1');

      expect(recommendations.getUserPurchaseHistory).toHaveBeenCalledWith('user1');
      expect(recommendations.getRecommendations).toHaveBeenCalledWith(['x', 'y'], [], 6);
    });

    it('returns [] immediately without calling getRecommendations when purchase history is empty', async () => {
      recommendations.getUserPurchaseHistory.mockResolvedValue([]);

      const result = await controller.forMe('user1');

      expect(result).toEqual([]);
      expect(recommendations.getRecommendations).not.toHaveBeenCalled();
    });
  });
});
