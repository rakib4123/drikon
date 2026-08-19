import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../modules/prisma/prisma.service';
import { ProductAssociationRuleModel } from './product-association-rule.model';

describe('ProductAssociationRuleModel', () => {
  let model: ProductAssociationRuleModel;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      productAssociationRule: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductAssociationRuleModel, { provide: PrismaService, useValue: prisma }],
    }).compile();

    model = module.get(ProductAssociationRuleModel);
  });

  it('findMany delegates to prisma.productAssociationRule.findMany', async () => {
    prisma.productAssociationRule.findMany.mockResolvedValue([{ id: 'r1' }]);
    const args = { where: { consequentId: 'p1' } };
    await expect(model.findMany(args as any)).resolves.toEqual([{ id: 'r1' }]);
    expect(prisma.productAssociationRule.findMany).toHaveBeenCalledWith(args);
  });

  it('replaceAll deletes all rows then bulk-inserts the new set, in one transaction', async () => {
    prisma.productAssociationRule.deleteMany.mockResolvedValue({ count: 5 });
    prisma.productAssociationRule.createMany.mockResolvedValue({ count: 2 });
    const rules = [
      { antecedentIds: ['a'], antecedentSize: 1, consequentId: 'b', support: 0.5, confidence: 0.5, lift: 1, computedAt: new Date() },
    ];
    await model.replaceAll(rules as any);
    expect(prisma.productAssociationRule.deleteMany).toHaveBeenCalledWith({});
    expect(prisma.productAssociationRule.createMany).toHaveBeenCalledWith({ data: rules });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
