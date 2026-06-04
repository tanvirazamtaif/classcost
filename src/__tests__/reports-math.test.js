import { describe, it, expect } from 'vitest';
import rm from '../../server/lib/reportsMath.cjs';

const { dedupeBySourceRef, aggregateLedger, meanStdev } = rm;

describe('dedupeBySourceRef', () => {
  it('collapses entries sharing a sourceRef (the double-count fix)', () => {
    const out = dedupeBySourceRef([
      { amountMinor: 100, sourceRef: 'educationfee:1:pay:9' },
      { amountMinor: 100, sourceRef: 'educationfee:1:pay:9' }, // duplicate
      { amountMinor: 50, sourceRef: null },
    ]);
    expect(out).toHaveLength(2);
  });
  it('keeps all entries without a sourceRef', () => {
    const out = dedupeBySourceRef([{ amountMinor: 1 }, { amountMinor: 2 }, { amountMinor: 3 }]);
    expect(out).toHaveLength(3);
  });
});

describe('aggregateLedger', () => {
  const NOW = new Date(2026, 6, 15); // 15 Jul 2026

  it('sums into lifetime + the right scope buckets', () => {
    const entries = [
      { amountMinor: 100000, category: 'education', date: new Date(2026, 6, 10) }, // this month + year
      { amountMinor: 50000, category: 'food', date: new Date(2026, 5, 20) },       // last month + year
      { amountMinor: 30000, category: 'food', date: new Date(2025, 1, 1) },        // older — lifetime only
    ];
    const b = aggregateLedger(entries, NOW);
    expect(b.lifetime.total).toBe(180000);
    expect(b.thisMonth.total).toBe(100000);
    expect(b.lastMonth.total).toBe(50000);
    expect(b.thisYear.total).toBe(150000);
    expect(b.lifetime.byCategory.food).toBe(80000);
    expect(b.thisMonth.byCategory.education).toBe(100000);
  });

  it('does not double-count duplicate sourceRef rows', () => {
    const entries = [
      { amountMinor: 100000, category: 'education', date: new Date(2026, 6, 10), sourceRef: 'x' },
      { amountMinor: 100000, category: 'education', date: new Date(2026, 6, 10), sourceRef: 'x' },
    ];
    expect(aggregateLedger(entries, NOW).lifetime.total).toBe(100000);
  });

  it('ignores non-positive amounts and invalid dates', () => {
    const entries = [
      { amountMinor: 0, category: 'food', date: new Date(2026, 6, 10) },
      { amountMinor: -500, category: 'food', date: new Date(2026, 6, 10) },
      { amountMinor: 100, category: 'food', date: 'not-a-date' },
    ];
    expect(aggregateLedger(entries, NOW).lifetime.total).toBe(0);
  });
});

describe('meanStdev', () => {
  it('handles empty and single', () => {
    expect(meanStdev([])).toEqual({ mean: 0, stdev: 0 });
    expect(meanStdev([500])).toEqual({ mean: 500, stdev: 0 });
  });
  it('computes sample mean and stdev', () => {
    const { mean, stdev } = meanStdev([100, 200, 300]);
    expect(mean).toBe(200);
    expect(Math.round(stdev)).toBe(100); // sample stdev of [100,200,300] = 100
  });
});
