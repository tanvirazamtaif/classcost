import { describe, it, expect } from 'vitest';
import engine from '../../server/services/semesterEngine.cjs';

const { resolveWaivers } = engine;

// Minimal builders matching the shapes resolveWaivers reads.
const fee = (id, amountMinor, feeCategory = 'tuition', extra = {}) =>
  ({ id, amountMinor, feeCategory, isActive: true, ...extra });
const waiver = (o) => ({ isActive: true, conditionMet: true, priority: 0, ...o });

describe('resolveWaivers — paisa-exact NET money engine', () => {
  it('no waivers → net equals gross, zero waiver', () => {
    const r = resolveWaivers([fee('a', 1000000)], []);
    expect(r.grossMinor).toBe(1000000);
    expect(r.netMinor).toBe(1000000);
    expect(r.totalWaiverMinor).toBe(0);
  });

  it('total percentage waiver reduces net correctly (Tk10,000 @ 30% → Tk7,000)', () => {
    const r = resolveWaivers(
      [fee('a', 1000000)],
      [waiver({ id: 'w', appliesTo: 'total', waiverType: 'percentage', percentage: 30 })]
    );
    expect(r.netMinor).toBe(700000);
    expect(r.totalWaiverMinor).toBe(300000);
  });

  it('floors fractional paisa on percentage (333 @ 50% → 166 reduction)', () => {
    const r = resolveWaivers(
      [fee('a', 333)],
      [waiver({ id: 'w', appliesTo: 'total', waiverType: 'percentage', percentage: 50 })]
    );
    // Math.floor(333 * 50 / 100) = floor(166.5) = 166
    expect(r.totalWaiverMinor).toBe(166);
    expect(r.netMinor).toBe(167);
  });

  it('flat waiver caps at available — never goes negative', () => {
    const r = resolveWaivers(
      [fee('a', 100000)],
      [waiver({ id: 'w', appliesTo: 'total', waiverType: 'flat', amountMinor: 500000 })]
    );
    expect(r.netMinor).toBe(0);
    expect(r.totalWaiverMinor).toBe(100000);
  });

  it('stacking order: percentage applied before flat at total scope', () => {
    // gross 10000: 50% → 5000 off (net 5000), then flat 1000 → net 4000
    const r = resolveWaivers(
      [fee('a', 1000000)],
      [
        waiver({ id: 'flat', appliesTo: 'total', waiverType: 'flat', amountMinor: 100000 }),
        waiver({ id: 'pct', appliesTo: 'total', waiverType: 'percentage', percentage: 50 }),
      ]
    );
    expect(r.netMinor).toBe(400000);
    expect(r.totalWaiverMinor).toBe(600000);
  });

  it('fee-item scoped waiver only reduces that item', () => {
    const r = resolveWaivers(
      [fee('a', 600000), fee('b', 400000)],
      [waiver({ id: 'w', appliesTo: 'fee_item', feeItemId: 'a', waiverType: 'percentage', percentage: 50 })]
    );
    // 50% of 6000 = 3000 off → net 7000
    expect(r.netMinor).toBe(700000);
    expect(r.totalWaiverMinor).toBe(300000);
  });

  it('fee-category scoped waiver reduces only that category', () => {
    const r = resolveWaivers(
      [fee('a', 600000, 'tuition'), fee('b', 400000, 'lab')],
      [waiver({ id: 'w', appliesTo: 'fee_category', feeCategory: 'lab', waiverType: 'percentage', percentage: 25 })]
    );
    // 25% of 4000 lab = 1000 off → net 9000
    expect(r.netMinor).toBe(900000);
    expect(r.totalWaiverMinor).toBe(100000);
  });

  it('inactive waivers and unmet conditions are ignored', () => {
    const r = resolveWaivers(
      [fee('a', 1000000)],
      [
        waiver({ id: 'off', isActive: false, appliesTo: 'total', waiverType: 'percentage', percentage: 50 }),
        waiver({ id: 'unmet', conditionMet: false, appliesTo: 'total', waiverType: 'percentage', percentage: 50 }),
      ]
    );
    expect(r.netMinor).toBe(1000000);
    expect(r.totalWaiverMinor).toBe(0);
  });

  it('inactive fee items are excluded from gross', () => {
    const r = resolveWaivers(
      [fee('a', 1000000), fee('b', 500000, 'lab', { isActive: false })],
      []
    );
    expect(r.grossMinor).toBe(1000000);
  });

  it('negative adjustment items reduce the gross', () => {
    const r = resolveWaivers(
      [fee('a', 1000000), fee('adj', -200000, 'tuition')],
      []
    );
    expect(r.grossMinor).toBe(800000);
    expect(r.netMinor).toBe(800000);
  });

  it('INVARIANT: net is never negative and waiver never exceeds gross', () => {
    const r = resolveWaivers(
      [fee('a', 100000)],
      [
        waiver({ id: 'w1', appliesTo: 'total', waiverType: 'percentage', percentage: 80 }),
        waiver({ id: 'w2', appliesTo: 'total', waiverType: 'flat', amountMinor: 999999 }),
      ]
    );
    expect(r.netMinor).toBeGreaterThanOrEqual(0);
    expect(r.totalWaiverMinor).toBeLessThanOrEqual(r.grossMinor);
    expect(r.grossMinor).toBe(r.netMinor + r.totalWaiverMinor);
  });

  it('INVARIANT: gross == net + waiver (conservation) across mixed waivers', () => {
    const r = resolveWaivers(
      [fee('a', 650000, 'tuition'), fee('b', 450000, 'lab'), fee('c', 120000, 'library')],
      [
        waiver({ id: 'w1', appliesTo: 'fee_item', feeItemId: 'a', waiverType: 'percentage', percentage: 25 }),
        waiver({ id: 'w2', appliesTo: 'fee_category', feeCategory: 'lab', waiverType: 'flat', amountMinor: 50000 }),
        waiver({ id: 'w3', appliesTo: 'total', waiverType: 'percentage', percentage: 10 }),
      ]
    );
    expect(r.grossMinor).toBe(r.netMinor + r.totalWaiverMinor);
    expect(r.netMinor).toBeGreaterThanOrEqual(0);
  });
});
