import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrderModel } from '../../models/order.model';
import { ProductModel } from '../../models/product.model';
import { ProductAssociationRuleModel } from '../../models/product-association-rule.model';
import { RecommendationRunModel } from '../../models/recommendation-run.model';
import { AprioriService } from './apriori.service';

const QUALIFYING_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];
const DEFAULT_LIMIT = 6;

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly orders: OrderModel,
    private readonly products: ProductModel,
    private readonly rules: ProductAssociationRuleModel,
    private readonly runs: RecommendationRunModel,
    private readonly apriori: AprioriService,
  ) {}

  async loadBaskets(): Promise<Set<string>[]> {
    const orders = await this.orders.findMany({
      where: { status: { in: QUALIFYING_STATUSES } },
      select: { items: { select: { productId: true } } },
    });
    return orders.map((o) => new Set(o.items.map((i) => i.productId)));
  }

  async getUserPurchaseHistory(userId: string): Promise<string[]> {
    const orders = await this.orders.findMany({
      where: { userId, status: { in: QUALIFYING_STATUSES } },
      select: { items: { select: { productId: true } } },
    });
    const ids = new Set<string>();
    for (const o of orders) for (const i of o.items) ids.add(i.productId);
    return [...ids];
  }

  async recompute() {
    const baskets = await this.loadBaskets();
    const computed = this.apriori.computeRules(baskets);
    const computedAt = new Date();

    await this.rules.replaceAll(
      computed.map((r) => ({
        antecedentIds: r.antecedentIds,
        antecedentSize: r.antecedentSize,
        consequentId: r.consequentId,
        support: r.support,
        confidence: r.confidence,
        lift: r.lift,
        computedAt,
      })),
    );

    const run = await this.runs.create({
      data: { ordersAnalyzed: baskets.length, rulesGenerated: computed.length, computedAt },
    });
    return { ordersAnalyzed: run.ordersAnalyzed, rulesGenerated: run.rulesGenerated, computedAt: run.computedAt };
  }

  /** Top recommended products whose triggering rule's antecedent is fully covered by `contextIds`. */
  async getRecommendations(contextIds: string[], excludeIds: string[], limit: number = DEFAULT_LIMIT) {
    if (contextIds.length === 0) return [];

    const candidates = await this.rules.findMany({
      where: { antecedentIds: { hasSome: contextIds } },
      orderBy: [{ antecedentSize: 'desc' }, { confidence: 'desc' }, { lift: 'desc' }],
    });

    const exclude = new Set(excludeIds);
    const bestByConsequent = new Map<string, (typeof candidates)[number]>();
    for (const rule of candidates) {
      if (exclude.has(rule.consequentId)) continue;
      if (bestByConsequent.has(rule.consequentId)) continue;
      if (!rule.antecedentIds.every((id) => contextIds.includes(id))) continue;
      bestByConsequent.set(rule.consequentId, rule);
    }

    const rankedIds = [...bestByConsequent.keys()].slice(0, limit);
    if (rankedIds.length === 0) return [];

    const productRows = await this.products.findMany({
      where: { id: { in: rankedIds }, isActive: true },
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });
    const byId = new Map(productRows.map((p) => [p.id, p]));
    return rankedIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  }

  async getStatus() {
    const lastRun = await this.runs.findLatest();
    const topRules = await this.rules.findMany({
      orderBy: [{ confidence: 'desc' }, { lift: 'desc' }],
      take: 50,
    });

    const involvedIds = new Set<string>();
    for (const r of topRules) {
      for (const a of r.antecedentIds) involvedIds.add(a);
      involvedIds.add(r.consequentId);
    }
    const products = await this.products.findMany({
      where: { id: { in: [...involvedIds] } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    return {
      lastRun: lastRun
        ? { computedAt: lastRun.computedAt, ordersAnalyzed: lastRun.ordersAnalyzed, rulesGenerated: lastRun.rulesGenerated }
        : null,
      rules: topRules.map((r) => ({
        antecedentNames: r.antecedentIds.map((id) => nameById.get(id) ?? 'Unknown product'),
        consequentName: nameById.get(r.consequentId) ?? 'Unknown product',
        confidence: r.confidence,
        lift: r.lift,
      })),
    };
  }
}
