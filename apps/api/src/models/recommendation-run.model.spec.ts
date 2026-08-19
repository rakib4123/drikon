import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RecommendationRunModel } from './recommendation-run.model';

describe('RecommendationRunModel', () => {
  let model: RecommendationRunModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      recommendationRun: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationRunModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(RecommendationRunModel);
  });

  it('create delegates to prisma.recommendationRun.create', async () => {
    prisma.recommendationRun.create.mockResolvedValue({ id: 'run1' });
    const args = { data: { ordersAnalyzed: 10, rulesGenerated: 20 } };
    await expect(model.create(args as any)).resolves.toEqual({ id: 'run1' });
    expect(prisma.recommendationRun.create).toHaveBeenCalledWith(args);
  });

  it('findLatest orders by computedAt desc and takes the first', async () => {
    prisma.recommendationRun.findFirst.mockResolvedValue({ id: 'run1' });
    await expect(model.findLatest()).resolves.toEqual({ id: 'run1' });
    expect(prisma.recommendationRun.findFirst).toHaveBeenCalledWith({ orderBy: { computedAt: 'desc' } });
  });
});
