import { describe, it, expect } from 'vitest';
import instMath from '../../server/lib/installmentMath.cjs';

const { splitEqual, planRedistribution } = instMath;

describe('splitEqual — paisa-exact', () => {
  it('splits evenly when divisible', () => {
    expect(splitEqual(900000, 3)).toEqual([300000, 300000, 300000]);
  });
  it('puts the remainder on the first part', () => {
    expect(splitEqual(1000, 3)).toEqual([334, 333, 333]); // sum 1000
  });
  it('sum always equals the total', () => {
    const parts = splitEqual(100001, 7);
    expect(parts.reduce((s, x) => s + x, 0)).toBe(100001);
  });
  it('handles n=1 and zero', () => {
    expect(splitEqual(500, 1)).toEqual([500]);
    expect(splitEqual(0, 3)).toEqual([0, 0, 0]);
  });
});

describe('planRedistribution — preserve custom, split the rest', () => {
  const auto = (id, amt) => ({ id, amountMinor: amt, customAmount: false });
  const custom = (id, amt) => ({ id, amountMinor: amt, customAmount: true });

  it('reproduces even split when nothing is custom (back-compat)', () => {
    const updates = planRedistribution(900000, 0, [auto('a', 0), auto('b', 0), auto('c', 0)]);
    expect(updates).toEqual([
      { id: 'a', amountMinor: 300000 },
      { id: 'b', amountMinor: 300000 },
      { id: 'c', amountMinor: 300000 },
    ]);
  });

  it('subtracts already-paid before splitting', () => {
    const updates = planRedistribution(900000, 300000, [auto('a', 0), auto('b', 0)]);
    // remainingDue 600000 split over 2 → 300000 each
    expect(updates).toEqual([
      { id: 'a', amountMinor: 300000 },
      { id: 'b', amountMinor: 300000 },
    ]);
  });

  it('preserves a custom installment and splits the remainder onto auto ones', () => {
    // net 900000, custom 'a' fixed at 500000 → 400000 left for b & c
    const updates = planRedistribution(900000, 0, [custom('a', 500000), auto('b', 0), auto('c', 0)]);
    // custom 'a' is NOT in updates (untouched); b & c get 200000 each
    expect(updates.find((u) => u.id === 'a')).toBeUndefined();
    expect(updates).toEqual([
      { id: 'b', amountMinor: 200000 },
      { id: 'c', amountMinor: 200000 },
    ]);
  });

  it('returns no updates when every installment is custom', () => {
    expect(planRedistribution(900000, 0, [custom('a', 400000), custom('b', 500000)])).toEqual([]);
  });

  it('never produces negative amounts when custom exceeds what is owed', () => {
    const updates = planRedistribution(300000, 0, [custom('a', 500000), auto('b', 0)]);
    expect(updates).toEqual([{ id: 'b', amountMinor: 0 }]);
  });

  it('empty unpaid list yields no updates', () => {
    expect(planRedistribution(900000, 0, [])).toEqual([]);
  });
});
