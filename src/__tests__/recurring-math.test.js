import { describe, it, expect } from 'vitest';
import rec from '../../server/lib/recurringMath.cjs';

const { periodKey, addMonths, clampDay, dueDateFor, comparePeriods, planSlots, advanceCoverage } = rec;

describe('period helpers', () => {
  it('periodKey formats YYYY-MM', () => {
    expect(periodKey(new Date(2026, 6, 15))).toBe('2026-07');
  });
  it('addMonths rolls over years', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('clampDay handles short months', () => {
    expect(clampDay(2026, 1, 31)).toBe(28); // Feb 2026
    expect(clampDay(2024, 1, 31)).toBe(29); // Feb 2024 (leap)
    expect(clampDay(2026, 0, 15)).toBe(15);
  });
  it('dueDateFor clamps the billing day', () => {
    const d = dueDateFor('2026-02', 31);
    expect(d.getMonth()).toBe(1); // Feb
    expect(d.getDate()).toBe(28);
  });
  it('comparePeriods orders chronologically', () => {
    expect(comparePeriods('2026-03', '2026-07')).toBe(-1);
    expect(comparePeriods('2026-07', '2026-07')).toBe(0);
    expect(comparePeriods('2027-01', '2026-12')).toBe(1);
  });
});

describe('planSlots — idempotent materialization', () => {
  const sched = (over = {}) => ({
    cadence: 'MONTHLY', dueDay: 10, amountMinor: 1500000,
    startDate: new Date(2026, 2, 1), endDate: null, ...over,
  });

  it('materializes from start through the lookahead horizon', () => {
    // today Mar, lookahead 1 → expect Mar + Apr
    const slots = planSlots(sched(), [], new Date(2026, 2, 20), 1);
    expect(slots.map((s) => s.period)).toEqual(['2026-03', '2026-04']);
    expect(slots[0].expectedMinor).toBe(1500000);
  });

  it('skips periods that already have a slot (idempotent re-run)', () => {
    const slots = planSlots(sched(), ['2026-03'], new Date(2026, 2, 20), 1);
    expect(slots.map((s) => s.period)).toEqual(['2026-04']);
  });

  it('returns nothing when everything up to horizon exists', () => {
    const slots = planSlots(sched(), ['2026-03', '2026-04'], new Date(2026, 2, 20), 1);
    expect(slots).toEqual([]);
  });

  it('stops at endDate', () => {
    const slots = planSlots(sched({ endDate: new Date(2026, 3, 1) }), [], new Date(2026, 6, 1), 1);
    expect(slots.map((s) => s.period)).toEqual(['2026-03', '2026-04']);
  });

  it('steps by quarter for QUARTERLY cadence', () => {
    const slots = planSlots(sched({ cadence: 'QUARTERLY' }), [], new Date(2026, 8, 1), 0);
    expect(slots.map((s) => s.period)).toEqual(['2026-03', '2026-06', '2026-09']);
  });

  it('due dates honor the billing day with short-month clamp', () => {
    const slots = planSlots(sched({ dueDay: 31 }), [], new Date(2026, 2, 1), 0);
    expect(slots[0].dueDate.getDate()).toBe(31); // March has 31
  });
});

describe('advanceCoverage — paisa-exact, remainder on last', () => {
  it('covers N consecutive months from startPeriod', () => {
    const { periods, endPeriod } = advanceCoverage(9000000, 6, '2026-07');
    expect(periods).toEqual(['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
    expect(endPeriod).toBe('2026-12');
  });

  it('per-period sums exactly to the total, remainder on the last', () => {
    const { perPeriod } = advanceCoverage(1000, 3, '2026-07');
    expect(perPeriod).toEqual([333, 333, 334]);
    expect(perPeriod.reduce((s, x) => s + x, 0)).toBe(1000);
  });
});
