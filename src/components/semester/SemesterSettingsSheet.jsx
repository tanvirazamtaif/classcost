import React, { useMemo, useState } from 'react';
import { BottomSheet, GButton } from '../ui';
import {
  FEE_TYPES,
  SCHOLARSHIP_LABELS,
  WAIVER_PRESETS,
  BILLING_DAY_PRESETS,
  PLAN_OPTIONS,
} from '../../lib/feeTypeConfig';
import { useApp } from '../../contexts/AppContext';
import { isEligible } from '../../lib/universalInstallments';

const ordinal = (n) => {
  const v = Number(n) || 0;
  if (v >= 11 && v <= 13) return `${v}th`;
  return `${v}${({ 1: 'st', 2: 'nd', 3: 'rd' }[v % 10] || 'th')}`;
};

const SCHOLARSHIP_ICONS = {
  merit: '🏆',
  'need-based': '🤝',
  dept: '🏛️',
  'ff-quota': '🇧🇩',
  sibling: '👫',
  special: '✨',
};

export function SemesterSettingsSheet({ isOpen, onClose, profile, fees = [], currency, onSave }) {
  const { theme } = useApp();
  const d = theme === 'dark';

  const [draft, setDraft] = useState(() => seed(profile));

  // Re-seed the local draft each time the sheet transitions closed → open.
  // React-sanctioned "store previous value in state and adjust during render"
  // pattern — avoids the cascading re-render of seeding inside an effect while
  // still applying the fresh profile on the very first open frame.
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setDraft(seed(profile));
  }

  // ── Amber warning: how many existing fees with unpaid installments will be
  // re-planned given the pending draft vs. the current saved profile. ──────────
  const replanCount = useMemo(() => {
    return (fees || []).filter((fee) => {
      const insts = fee.installments || [];
      const hasUnpaid = insts.some((i) => !i.paid);
      if (!hasUnpaid) return false;

      const wasEligible = isEligible(fee, profile);
      const willBeEligible = isEligible(fee, draft);

      // Eligibility flipped → installments must be re-planned.
      if (wasEligible !== willBeEligible) return true;

      // Still eligible but the waiver % drifted from what the fee was created at.
      if (willBeEligible && (fee.waiverPctAtCreation ?? 0) !== (draft.waiverPercent ?? 0)) return true;

      return false;
    }).length;
  }, [fees, profile, draft]);

  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const toggleFeeType = (type) => {
    setDraft((prev) => {
      const has = (prev.eligibleFeeTypes || []).includes(type);
      const eligibleFeeTypes = has
        ? prev.eligibleFeeTypes.filter((t) => t !== type)
        : [...(prev.eligibleFeeTypes || []), type];
      return { ...prev, eligibleFeeTypes };
    });
  };

  const handleSave = () => {
    onSave({
      waiverPercent: clampPct(draft.waiverPercent),
      scholarshipType: draft.scholarshipType || null,
      billingDay: clampDay(draft.billingDay),
      installmentPreference: draft.installmentPreference,
      semesterEndDate: draft.semesterEndDate || '',
      eligibleFeeTypes: draft.eligibleFeeTypes || [],
    });
    onClose();
  };

  // ── Shared classes ───────────────────────────────────────────────────────────
  const sectionLabel = 'text-[11px] uppercase tracking-wide font-semibold text-primary-500 dark:text-primary-400 mb-2.5';
  const hint = 'text-[10px] leading-relaxed mb-2 ' + (d ? 'text-surface-500' : 'text-surface-400');
  const chipBase = 'rounded-xl border text-sm font-semibold transition-colors active:scale-[0.97]';
  const chipOn = 'border-primary-500 bg-primary-500/15 text-primary-600 dark:text-primary-200';
  const chipOff = d
    ? 'border-surface-700 bg-surface-800 text-surface-200 hover:border-surface-600'
    : 'border-surface-200 bg-white text-surface-700 hover:border-surface-300';
  const numInput =
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none border transition-colors focus:border-primary-500 ' +
    (d
      ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-500'
      : 'bg-surface-50 border-surface-200 text-surface-900 placeholder-surface-400');

  const customWaiverMatchesPreset = WAIVER_PRESETS.includes(Number(draft.waiverPercent));
  const customDayMatchesPreset = BILLING_DAY_PRESETS.includes(Number(draft.billingDay));

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Semester Settings">
      <p className={`text-xs -mt-2 mb-5 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
        Billing &amp; reminder profile · applies to every new fee
      </p>

      <div className="space-y-6">
        {/* ① Waiver % ───────────────────────────────────────────────────────── */}
        <section>
          <p className={sectionLabel}>① Waiver Percentage</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {WAIVER_PRESETS.map((p) => {
              const active = Number(draft.waiverPercent) === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => set({ waiverPercent: p })}
                  className={`px-2 py-2.5 ${p === 100 ? 'col-span-4' : ''} ${chipBase} ${active ? chipOn : chipOff}`}
                >
                  {p === 100 ? '100% Full Waiver' : `${p}%`}
                </button>
              );
            })}
          </div>
          <label className={`block text-xs font-medium mb-1.5 ${d ? 'text-surface-400' : 'text-surface-500'}`}>
            Custom Percentage
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              inputMode="decimal"
              placeholder="e.g. 35"
              value={customWaiverMatchesPreset ? '' : draft.waiverPercent ?? ''}
              onChange={(e) => set({ waiverPercent: clampPct(e.target.value) })}
              className={`${numInput} pr-9`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-surface-400">%</span>
          </div>
        </section>

        {/* ② Monthly Billing Date ──────────────────────────────────────────── */}
        <section>
          <p className={sectionLabel}>② Monthly Billing Date</p>
          <p className={hint}>
            Each installment becomes a reminder on this day every month — e.g. {ordinal(draft.billingDay)} Jul,{' '}
            {ordinal(draft.billingDay)} Aug, until the fee is fully paid.
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {BILLING_DAY_PRESETS.map((day) => {
              const active = Number(draft.billingDay) === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => set({ billingDay: day })}
                  className={`px-1 py-2 text-xs ${chipBase} ${active ? chipOn : chipOff}`}
                >
                  {ordinal(day)}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label className={`text-xs shrink-0 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Custom day:</label>
            <input
              type="number"
              min={1}
              max={28}
              step={1}
              inputMode="numeric"
              placeholder="1-28"
              value={customDayMatchesPreset ? '' : draft.billingDay ?? ''}
              onChange={(e) => set({ billingDay: clampDay(e.target.value) })}
              className={`${numInput} flex-1`}
            />
          </div>
        </section>

        {/* ③ Default Payment Plan ──────────────────────────────────────────── */}
        <section>
          <p className={sectionLabel}>③ Default Payment Plan</p>
          <p className={hint}>Every new fee uses this plan automatically. Override per-fee when adding a fee.</p>
          <div className="grid grid-cols-3 gap-2">
            {PLAN_OPTIONS.map((opt) => {
              const active = String(draft.installmentPreference) === String(opt.value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => set({ installmentPreference: opt.value })}
                  className={`px-2 py-2.5 ${opt.value === 'custom' ? 'col-span-2' : ''} ${chipBase} ${active ? chipOn : chipOff}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ④ Semester End Date ─────────────────────────────────────────────── */}
        <section>
          <p className={sectionLabel}>
            ④ Semester End Date <span className="normal-case font-normal text-surface-400">(optional)</span>
          </p>
          <p className={hint}>Reminders stop generating past this date.</p>
          <input
            type="date"
            value={draft.semesterEndDate || ''}
            onChange={(e) => set({ semesterEndDate: e.target.value })}
            style={{ colorScheme: d ? 'dark' : 'light' }}
            className={numInput}
          />
        </section>

        {/* ⑤ Scholarship Type ──────────────────────────────────────────────── */}
        <section>
          <p className={sectionLabel}>
            ⑤ Scholarship Type <span className="normal-case font-normal text-surface-400">(optional)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SCHOLARSHIP_LABELS).map(([type, label]) => {
              const active = draft.scholarshipType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => set({ scholarshipType: active ? null : type })}
                  className={`px-3 py-2.5 text-left text-[13px] rounded-xl border transition-colors active:scale-[0.97] ${
                    active ? chipOn : chipOff
                  }`}
                >
                  <span className="mr-1.5">{SCHOLARSHIP_ICONS[type]}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ⑥ Eligibility grid ──────────────────────────────────────────────── */}
        <section>
          <p className={sectionLabel}>⑥ Apply Waiver To These Fee Types</p>
          <p className={hint}>Set once. New fees of these types are automatically discounted by the waiver %.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(FEE_TYPES).map(([type, conf]) => {
              const checked = (draft.eligibleFeeTypes || []).includes(type);
              return (
                <label
                  key={type}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    checked ? chipOn : chipOff
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFeeType(type)}
                    className="w-4 h-4 accent-primary-500 shrink-0"
                  />
                  <span className="text-base leading-none">{conf.icon}</span>
                  <span className="text-[13px] font-medium truncate">{conf.label}</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Amber warning banner ─────────────────────────────────────────────── */}
        {replanCount > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">Existing fees will re-plan</p>
            <p className="text-[11px] mt-0.5 text-amber-700/80 dark:text-amber-200/80">
              {replanCount} existing fee{replanCount === 1 ? '' : 's'} will be re-planned (paid installments stay frozen).
            </p>
          </div>
        )}
      </div>

      {/* Footer ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-5 mt-1">
        <GButton variant="secondary" fullWidth onClick={onClose}>
          Cancel
        </GButton>
        <GButton fullWidth onClick={handleSave}>
          Save
        </GButton>
      </div>
    </BottomSheet>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function seed(profile) {
  const p = profile || {};
  return {
    waiverPercent: p.waiverPercent ?? 0,
    scholarshipType: p.scholarshipType ?? null,
    billingDay: p.billingDay ?? 10,
    installmentPreference: p.installmentPreference ?? 1,
    semesterEndDate: p.semesterEndDate ?? '',
    eligibleFeeTypes: Array.isArray(p.eligibleFeeTypes) ? [...p.eligibleFeeTypes] : [],
  };
}

function clampPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function clampDay(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(28, Math.max(1, n));
}
