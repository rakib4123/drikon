import { AprioriService } from './apriori.service';

describe('AprioriService', () => {
  let service: AprioriService;

  beforeEach(() => {
    service = new AprioriService();
  });

  it('returns no rules for zero baskets', () => {
    expect(service.computeRules([])).toEqual([]);
  });

  it('mines correct frequent-pair rules with exact support/confidence/lift', () => {
    const baskets: Set<string>[] = [
      new Set(['A', 'B']),
      new Set(['A', 'B']),
      new Set(['A', 'C']),
      new Set(['B', 'C']),
      new Set(['A', 'B', 'C']),
    ];

    const rules = service.computeRules(baskets);

    // {A,B,C} occurs once (< MIN_SUPPORT=2) so it must never be frequent —
    // no rule should have a 2-item antecedent.
    expect(rules.every((r) => r.antecedentSize === 1)).toBe(true);
    expect(rules).toHaveLength(6);

    const aToB = rules.find((r) => r.antecedentIds[0] === 'A' && r.consequentId === 'B')!;
    expect(aToB.support).toBeCloseTo(3 / 5, 5);
    expect(aToB.confidence).toBeCloseTo(3 / 4, 5);
    expect(aToB.lift).toBeCloseTo(0.75 / 0.8, 5);

    const cToA = rules.find((r) => r.antecedentIds[0] === 'C' && r.consequentId === 'A')!;
    expect(cToA.confidence).toBeCloseTo(2 / 3, 5);
  });

  it('excludes items below MIN_SUPPORT from every rule', () => {
    const baskets: Set<string>[] = [
      new Set(['A', 'B']),
      new Set(['A', 'B']),
      new Set(['A', 'D']), // D appears only once — must never be frequent
    ];

    const rules = service.computeRules(baskets);

    expect(rules.some((r) => r.antecedentIds.includes('D') || r.consequentId === 'D')).toBe(false);
  });

  it('mines a frequent 3-itemset into three 2-antecedent rules when support allows', () => {
    // {A,B,C} now occurs twice — clears MIN_SUPPORT=2.
    const baskets: Set<string>[] = [
      new Set(['A', 'B', 'C']),
      new Set(['A', 'B', 'C']),
      new Set(['A', 'B']),
    ];

    const rules = service.computeRules(baskets);
    const tripleRules = rules.filter((r) => r.antecedentSize === 2);
    expect(tripleRules).toHaveLength(3);

    const abToC = tripleRules.find(
      (r) => r.consequentId === 'C' && r.antecedentIds.sort().join() === ['A', 'B'].sort().join(),
    )!;
    // support({A,B,C})=2/3, support({A,B})=3/3=1 -> confidence = (2/3)/1 = 2/3
    expect(abToC.confidence).toBeCloseTo(2 / 3, 5);
  });
});
