import { describe, it, expect } from 'vitest';
import sc from '../../server/lib/storyCard.cjs';
import cp from '../../server/lib/circlePresets.cjs';

const { buildStoryCard } = sc;
const { presetPermissions, canMarkPaid, PRIVATE_FLOOR } = cp;

const fmt = (m) => `Tk${(m / 100).toFixed(2)}`;

describe('buildStoryCard', () => {
  it('includes a waiver line only when there is a waiver', () => {
    const withWaiver = buildStoryCard({ label: 'Fall 2026', grossMinor: 1000000, waiverMinor: 300000, netMinor: 700000, paidMinor: 700000 }, fmt);
    expect(withWaiver.stats.some((s) => s.key === 'waiver')).toBe(true);

    const noWaiver = buildStoryCard({ label: 'Fall 2026', grossMinor: 700000, waiverMinor: 0, netMinor: 700000, paidMinor: 700000 }, fmt);
    expect(noWaiver.stats.some((s) => s.key === 'waiver')).toBe(false);
  });

  it('surfaces outstanding and refundable when present', () => {
    const card = buildStoryCard({
      label: 'Cadet College', closureReason: 'completed',
      grossMinor: 2000000, waiverMinor: 0, netMinor: 2000000,
      paidMinor: 1800000, outstandingMinor: 200000, refundableMinor: 1500000,
    }, fmt);
    expect(card.stats.find((s) => s.key === 'outstanding').amountMinor).toBe(200000);
    expect(card.stats.find((s) => s.key === 'refundable').amountMinor).toBe(1500000);
    expect(card.narrative.join(' ')).toContain('refundable');
  });

  it('renders the reason label', () => {
    expect(buildStoryCard({ label: 'X', closureReason: 'moved_out' }, fmt).reason).toBe('Moved out');
    expect(buildStoryCard({ label: 'X', closureReason: 'promoted' }, fmt).reason).toBe('Promoted');
  });

  it('formats narrative with the supplied formatter', () => {
    const card = buildStoryCard({ label: 'Fall', grossMinor: 1000000, waiverMinor: 300000, netMinor: 700000, paidMinor: 700000 }, fmt);
    expect(card.narrative.join(' ')).toContain('Tk10000.00');
    expect(card.narrative.join(' ')).toContain('Tk3000.00');
  });
});

describe('circle presets', () => {
  it('fee_buddy sees fees/forecast/reminders, not money-sensitive sections', () => {
    const perms = presetPermissions('fee_buddy');
    const visible = perms.filter((p) => p.visibility === 'visible').map((p) => p.section);
    expect(visible).toEqual(expect.arrayContaining(['fees', 'forecast', 'reminders']));
    expect(visible).not.toContain('food');
  });

  it('full_picture never exposes the private floor (food/transit/other)', () => {
    const perms = presetPermissions('full_picture');
    for (const s of PRIVATE_FLOOR) {
      expect(perms.find((p) => p.section === s).visibility).toBe('hidden');
    }
    expect(perms.find((p) => p.section === 'institutions').visibility).toBe('visible');
  });

  it('custom starts fully hidden (opt-in)', () => {
    const perms = presetPermissions('custom');
    expect(perms.every((p) => p.visibility === 'hidden')).toBe(true);
  });

  it('only custodian may mark payments', () => {
    expect(canMarkPaid('custodian')).toBe(true);
    expect(canMarkPaid('fee_buddy')).toBe(false);
    expect(canMarkPaid('full_picture')).toBe(false);
  });

  it('every preset returns a permission for every section', () => {
    for (const preset of ['fee_buddy', 'full_picture', 'custodian', 'custom']) {
      expect(presetPermissions(preset)).toHaveLength(8);
    }
  });
});
