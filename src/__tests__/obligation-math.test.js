import { describe, it, expect } from 'vitest';
import oblMath from '../../server/lib/obligationMath.cjs';

const { effectiveDue, amountRemaining } = oblMath;

describe('obligationMath — NET/GROSS invariant', () => {
  it('engine obligation (NET, waiver 0): due equals amount', () => {
    expect(effectiveDue({ amountMinor: 700000, waiverAmountMinor: 0 })).toBe(700000);
  });

  it('per-obligation waiver (GROSS + waiver): due equals amount minus waiver', () => {
    expect(effectiveDue({ amountMinor: 1000000, waiverAmountMinor: 300000 })).toBe(700000);
  });

  it('BOTH conventions resolve to the same net (Tk7,000)', () => {
    const net = effectiveDue({ amountMinor: 700000, waiverAmountMinor: 0 });
    const gross = effectiveDue({ amountMinor: 1000000, waiverAmountMinor: 300000 });
    expect(net).toBe(gross);
  });

  it('tolerates missing fields', () => {
    expect(effectiveDue({ amountMinor: 500 })).toBe(500);
    expect(effectiveDue({})).toBe(0);
  });

  it('amountRemaining subtracts payments', () => {
    expect(amountRemaining({ amountMinor: 700000, waiverAmountMinor: 0 }, 200000)).toBe(500000);
    expect(amountRemaining({ amountMinor: 1000000, waiverAmountMinor: 300000 }, 700000)).toBe(0);
  });
});
