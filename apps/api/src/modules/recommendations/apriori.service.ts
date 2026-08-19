import { Injectable } from '@nestjs/common';
import { MIN_SUPPORT, MIN_CONFIDENCE, MAX_ITEMSET_SIZE } from './apriori.constants';

export interface AssociationRule {
  antecedentIds: string[];
  antecedentSize: number;
  consequentId: string;
  support: number;
  confidence: number;
  lift: number;
}

/** Canonical, order-independent key for an itemset. */
function key(ids: string[]): string {
  return [...ids].sort().join(' ');
}

function unkey(k: string): string[] {
  return k.split(' ');
}

function countSupport(ids: string[], baskets: Set<string>[]): number {
  let count = 0;
  for (const basket of baskets) {
    if (ids.every((id) => basket.has(id))) count += 1;
  }
  return count;
}

@Injectable()
export class AprioriService {
  /**
   * Level-wise Apriori: mine frequent itemsets up to MAX_ITEMSET_SIZE using the
   * downward-closure property (a candidate's every subset must already be
   * frequent), then generate single-consequent association rules from them.
   */
  computeRules(baskets: Set<string>[]): AssociationRule[] {
    const totalBaskets = baskets.length;
    if (totalBaskets === 0) return [];

    const itemCounts = new Map<string, number>();
    for (const basket of baskets) {
      for (const item of basket) {
        itemCounts.set(item, (itemCounts.get(item) ?? 0) + 1);
      }
    }

    let currentLevel = new Map<string, number>();
    for (const [item, count] of itemCounts) {
      if (count >= MIN_SUPPORT) currentLevel.set(key([item]), count);
    }

    const allFrequent = new Map<string, number>(currentLevel);

    let size = 1;
    while (currentLevel.size > 0 && size < MAX_ITEMSET_SIZE) {
      const candidates = this.generateCandidates(currentLevel, size);
      const nextLevel = new Map<string, number>();
      for (const candidateKey of candidates) {
        const support = countSupport(unkey(candidateKey), baskets);
        if (support >= MIN_SUPPORT) nextLevel.set(candidateKey, support);
      }
      for (const [k, v] of nextLevel) allFrequent.set(k, v);
      currentLevel = nextLevel;
      size += 1;
    }

    return this.generateRules(allFrequent, totalBaskets);
  }

  /** Joins same-size frequent itemsets and prunes any candidate with an infrequent subset. */
  private generateCandidates(prevLevel: Map<string, number>, size: number): Set<string> {
    const prevItemsets = [...prevLevel.keys()].map(unkey);
    const candidates = new Set<string>();

    for (let i = 0; i < prevItemsets.length; i++) {
      for (let j = i + 1; j < prevItemsets.length; j++) {
        const union = new Set([...prevItemsets[i], ...prevItemsets[j]]);
        if (union.size !== size + 1) continue;

        const candidateIds = [...union].sort();
        const allSubsetsFrequent = candidateIds.every((_, idx) => {
          const subset = candidateIds.filter((_, i2) => i2 !== idx);
          return prevLevel.has(key(subset));
        });
        if (allSubsetsFrequent) candidates.add(key(candidateIds));
      }
    }
    return candidates;
  }

  /** For every frequent itemset of size >= 2, one rule per choice of single-item consequent. */
  private generateRules(allFrequent: Map<string, number>, totalBaskets: number): AssociationRule[] {
    const rules: AssociationRule[] = [];

    for (const [itemsetKey, itemsetSupport] of allFrequent) {
      const ids = unkey(itemsetKey);
      if (ids.length < 2) continue;

      for (const consequentId of ids) {
        const antecedentIds = ids.filter((id) => id !== consequentId).sort();
        // Downward closure guarantees this subset was already found frequent.
        const antecedentSupport = allFrequent.get(key(antecedentIds))!;
        const confidence = itemsetSupport / antecedentSupport;
        if (confidence < MIN_CONFIDENCE) continue;

        const consequentSupport = allFrequent.get(key([consequentId]))!;
        const lift = confidence / (consequentSupport / totalBaskets);

        rules.push({
          antecedentIds,
          antecedentSize: antecedentIds.length,
          consequentId,
          support: itemsetSupport / totalBaskets,
          confidence,
          lift,
        });
      }
    }
    return rules;
  }
}
