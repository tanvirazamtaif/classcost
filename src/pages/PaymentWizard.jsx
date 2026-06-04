import React, { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { GCard, GCardContent, GButton } from '../components/ui';
import {
  finalPayable,
  buildInstallments,
  buildWizardInstallments,
  splitIntoInstallments,
  recomputeFee,
  nextBillingDay,
  todayISO,
  genId,
} from '../lib/universalInstallments';
import {
  CORE_FEE_TYPES,
  feeTypeInfo,
  WAIVER_PRESETS,
  SCHOLARSHIP_LABELS,
  defaultProfile,
} from '../lib/feeTypeConfig';
import { makeFmt } from '../utils/format';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';

const SCHOLARSHIP_ICONS = {
  merit: '🏆',
  'need-based': '🤝',
  dept: '🏛️',
  'ff-quota': '🇧🇩',
  sibling: '👫',
  special: '✨',
};

const INSTALLMENT_PRESETS = [2, 3, 4];

// Full long date, e.g. "10 January 2026"
const fmtFullDate = (iso) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fmtShortDate = (iso) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function ordinalDay(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00').getDate();
  if (d >= 11 && d <= 13) return `${d}th`;
  const last = d % 10;
  return d + ({ 1: 'st', 2: 'nd', 3: 'rd' }[last] || 'th');
}

const newRow = (type) => {
  const info = feeTypeInfo(type);
  return {
    id: genId('b'),
    type,
    label: info.label,
    icon: info.icon,
    amount: 0,
    customName: type === 'custom' ? '' : null,
  };
};

export function PaymentWizard() {
  const { routeParams, navigate, goBack, addToast, user } = useApp();
  const { addFee, updateFee } = useEducationFees();
  const fmt = useMemo(() => makeFmt(user?.profile?.currency || 'BDT'), [user?.profile?.currency]);

  const { entityId, entityName, institutionName, institutionType, term } = routeParams || {};

  const heading = entityName || institutionName || 'Semester';
  const termLabel = term || 'New semester';
  const title = `${heading} · ${termLabel}`;

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState(null); // 'total' | 'breakdown'
  const [total, setTotal] = useState('');
  const [rows, setRows] = useState([]); // breakdown rows
  const [waiverPct, setWaiverPct] = useState(0);
  const [scholarshipType, setScholarshipType] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'full' | 'installments'
  const [count, setCount] = useState(3); // installment count (>=2 when installments)
  const [customCount, setCustomCount] = useState(''); // raw custom input
  const [useCustomCount, setUseCustomCount] = useState(false);
  const [firstAmount, setFirstAmount] = useState('');
  const [firstAmountTouched, setFirstAmountTouched] = useState(false);
  const [firstDate, setFirstDate] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Derived money ──────────────────────────────────────────────────────────
  const original = useMemo(() => {
    if (method === 'total') return Math.max(0, Number(total) || 0);
    return rows.reduce((s, r) => s + Math.round((Number(r.amount) || 0) * 100), 0) / 100;
  }, [method, total, rows]);

  const final = useMemo(
    () => finalPayable(original, waiverPct > 0, waiverPct),
    [original, waiverPct],
  );
  const discount = useMemo(() => Math.max(0, original - final), [original, final]);

  const resolvedCount = useMemo(() => {
    if (paymentMethod === 'full') return 1;
    if (useCustomCount) return Math.min(12, Math.max(2, Number(customCount) || 0));
    return count;
  }, [paymentMethod, useCustomCount, customCount, count]);

  const equalSplitFirst = useMemo(
    () => (resolvedCount > 0 ? splitIntoInstallments(final, resolvedCount)[0] : 0),
    [final, resolvedCount],
  );

  // ── Step navigation ──────────────────────────────────────────────────────────
  const isFull = paymentMethod === 'full';
  const TOTAL_STEPS = 6;

  const stepValid = useCallback(
    (s) => {
      switch (s) {
        case 1:
          return !!method;
        case 2:
          return original > 0;
        case 3:
          return true; // 0% is fine
        case 4:
          if (!paymentMethod) return false;
          if (paymentMethod === 'installments') return resolvedCount >= 2;
          return true;
        case 5: {
          if (final <= 0) return true; // fully waived (100%) — nothing to schedule
          const fa = Number(firstAmount) || 0;
          if (fa <= 0 || fa > final + 1e-9) return false;
          if (!firstDate) return false;
          return true;
        }
        case 6:
          return true;
        default:
          return false;
      }
    },
    [method, original, paymentMethod, resolvedCount, firstAmount, final, firstDate],
  );

  // Prefill step 5 when entering it
  const prefillFirstInstallment = useCallback(() => {
    if (!firstAmountTouched && equalSplitFirst > 0) {
      setFirstAmount(String(equalSplitFirst));
    }
    if (!firstDate) {
      setFirstDate(nextBillingDay(10));
    }
  }, [firstAmountTouched, equalSplitFirst, firstDate]);

  const goToStep = useCallback(
    (n) => {
      if (n === 5) prefillFirstInstallment();
      setStep(n);
    },
    [prefillFirstInstallment],
  );

  const handleBack = useCallback(() => {
    if (step === 1) {
      goBack();
      return;
    }
    // Coming back from review with full payment lands on step 4 (5 was skipped)
    if (step === 6 && isFull) {
      setStep(4);
      return;
    }
    setStep(step - 1);
  }, [step, isFull, goBack]);

  // ── Schedule (installments) ──────────────────────────────────────────────────
  const installments = useMemo(() => {
    if (isFull) {
      return buildInstallments(final, 1, {});
    }
    return buildWizardInstallments(final, resolvedCount, Number(firstAmount) || 0, firstDate);
  }, [isFull, final, resolvedCount, firstAmount, firstDate]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const synthesized = recomputeFee({
        id: genId('f'),
        type: 'custom',
        label: method === 'breakdown' ? 'Semester (itemized)' : 'Semester Fee',
        icon: '🎓',
        note: '',
        originalAmount: original,
        amount: final,
        waiverEligible: waiverPct > 0,
        waiverPctAtCreation: waiverPct,
        breakdown: null,
        itemized: method === 'breakdown' ? rows : null,
        installments,
        addedAt: todayISO(),
      });

      const baseProfile = defaultProfile();
      const profile = {
        ...baseProfile,
        waiverPercent: waiverPct,
        scholarshipType,
        installmentPreference: isFull ? 1 : resolvedCount,
        // The synthesized plan is a 'custom'-type fee with the waiver already
        // baked into its NET amount. Mark 'custom' eligible so the detail page's
        // drift check reads 0 and a later re-plan preserves the net total
        // (otherwise re-plan would revert to the gross amount and wipe the waiver).
        eligibleFeeTypes: waiverPct > 0
          ? Array.from(new Set([...baseProfile.eligibleFeeTypes, 'custom']))
          : baseProfile.eligibleFeeTypes,
      };

      const created = addFee({
        feeType: 'semester_container',
        paymentPattern: 'semester',
        name: title,
        amount: final,
        semesterName: termLabel,
      });

      updateFee(
        created.id,
        {
          amount: final,
          name: title,
          institutionName: institutionName || entityName || null,
          institutionType: institutionType || null,
          semester: {
            ...created.semester,
            semesterName: termLabel,
            totalAmount: final,
            entityId: entityId || null,
            profile,
            fees: [synthesized],
          },
        },
        'Created via wizard',
      );

      navigate('semester-detail', { params: { semesterId: created.id } });
      addToast('Semester plan created', 'success');
    } catch (e) {
      console.error('PaymentWizard save failed:', e);
      addToast('Failed to create plan', 'error');
      setSaving(false);
    }
  }, [
    saving, method, original, final, waiverPct, scholarshipType, rows, installments,
    isFull, resolvedCount, addFee, updateFee, title, termLabel, institutionName,
    entityName, institutionType, entityId, navigate, addToast,
  ]);

  const handleNext = useCallback(async () => {
    if (step === 6) {
      await handleSave();
      return;
    }
    // Skip step 5 (first installment) for full payment
    if (step === 4 && isFull) {
      goToStep(6);
      return;
    }
    goToStep(step + 1);
  }, [step, isFull, goToStep, handleSave]);

  // ── Breakdown row helpers ──────────────────────────────────────────────────
  const addRow = (type) => setRows((prev) => [...prev, newRow(type)]);
  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id));
  const setRowAmount = (id, v) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, amount: Math.max(0, Number(v) || 0) } : r)));
  const setRowName = (id, v) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, customName: v } : r)));

  // ── Step subtitle ──────────────────────────────────────────────────────────
  const stepTitles = {
    1: 'Choose entry method',
    2: method === 'total' ? 'Total cost' : 'Itemize fees',
    3: 'Waiver / scholarship',
    4: 'Payment method',
    5: 'First installment',
    6: 'Review & confirm',
  };

  const nextLabel = step === 6 ? 'Save Plan' : 'Next';

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-8 bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-sm bg-white/90 dark:bg-surface-950/95 border-b border-surface-200 dark:border-surface-800"
      >
        <div className="flex items-center gap-3 px-4 py-3 max-w-md mx-auto">
          <button
            onClick={handleBack}
            aria-label="Back"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition"
          >
            <ArrowLeft size={20} className="text-surface-600 dark:text-surface-300" />
          </button>
          <h1 className="text-lg font-semibold text-surface-900 dark:text-white truncate">{title}</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Intro (step 1 only) */}
        {step === 1 && (
          <div className="rounded-2xl border border-primary-500/30 bg-primary-500/[0.06] p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧙‍♂️</span>
              <div>
                <p className="text-base font-semibold text-surface-900 dark:text-white">Plan your semester payments</p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">
                  Walk through 6 quick steps. We'll calculate your waiver, build your installment schedule, and set up
                  monthly reminders automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <GCard>
          <GCardContent className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => {
                const state = s < step ? 'done' : s === step ? 'active' : 'locked';
                return (
                  <span
                    key={s}
                    className={`h-1.5 rounded-full flex-1 transition-all duration-200 ${
                      state === 'done'
                        ? 'bg-emerald-400'
                        : state === 'active'
                        ? 'bg-primary-500'
                        : 'bg-surface-200 dark:bg-surface-700'
                    }`}
                  />
                );
              })}
            </div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-surface-400 dark:text-surface-500">
              Step {step} of {TOTAL_STEPS} · {stepTitles[step]}
            </p>
          </GCardContent>
        </GCard>

        {/* ─────────── STEP 1 · Method ─────────── */}
        {step === 1 && (
          <GCard>
            <GCardContent className="p-5 space-y-3">
              <p className="text-base font-semibold text-surface-900 dark:text-white">
                How would you like to add your semester cost?
              </p>
              <p className="text-xs text-surface-500 leading-relaxed">Pick one — you can change it later.</p>
              <div className="space-y-2.5 pt-2">
                <PickCard
                  active={method === 'total'}
                  onClick={() => setMethod('total')}
                  icon="💰"
                  titleText="Total Semester Amount"
                  desc="Enter one number for the whole semester. Fastest way."
                />
                <PickCard
                  active={method === 'breakdown'}
                  onClick={() => setMethod('breakdown')}
                  icon="📋"
                  titleText="Fee Breakdown"
                  desc="Itemize tuition, lab, library, dev, exam, registration, custom. More accurate for receipts."
                />
              </div>
            </GCardContent>
          </GCard>
        )}

        {/* ─────────── STEP 2 · Cost ─────────── */}
        {step === 2 && method === 'total' && (
          <GCard>
            <GCardContent className="p-5 space-y-4">
              <div>
                <p className="text-base font-semibold text-surface-900 dark:text-white">What's the total semester cost?</p>
                <p className="text-xs text-surface-500 mt-1">Before any waivers or scholarships.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">
                  Total Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  inputMode="decimal"
                  autoFocus
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="120000"
                  className="w-full px-3 py-3 rounded-xl text-lg font-semibold outline-none border bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:border-primary-500"
                />
              </div>
            </GCardContent>
          </GCard>
        )}

        {step === 2 && method === 'breakdown' && (
          <GCard>
            <GCardContent className="p-5 space-y-4">
              <div>
                <p className="text-base font-semibold text-surface-900 dark:text-white">Add each fee</p>
                <p className="text-xs text-surface-500 mt-1">
                  Tap a fee type below, enter the amount. The total adds up live.
                </p>
              </div>

              <div className="space-y-2">
                {rows.length === 0 ? (
                  <p className="text-xs text-surface-500 italic">No fees added yet. Tap a chip below to add one.</p>
                ) : (
                  rows.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/40"
                    >
                      <span className="text-base shrink-0">{r.icon}</span>
                      {r.customName !== null ? (
                        <input
                          type="text"
                          value={r.customName || ''}
                          placeholder="Custom fee name"
                          onChange={(e) => setRowName(r.id, e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1 rounded text-xs outline-none border bg-white dark:bg-surface-950 border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:border-primary-500"
                        />
                      ) : (
                        <span className="flex-1 min-w-0 text-sm text-surface-900 dark:text-white truncate">{r.label}</span>
                      )}
                      <input
                        type="number"
                        min="0"
                        step="100"
                        inputMode="decimal"
                        value={r.amount || ''}
                        placeholder="0"
                        onChange={(e) => setRowAmount(r.id, e.target.value)}
                        className="w-28 px-2 py-1.5 rounded-lg text-sm font-semibold text-right outline-none border bg-white dark:bg-surface-950 border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:border-primary-500"
                      />
                      <button
                        onClick={() => removeRow(r.id)}
                        aria-label="Remove"
                        className="p-1 rounded text-rose-500 hover:bg-rose-500/10"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Add fee type</p>
                <div className="grid grid-cols-3 gap-2">
                  {CORE_FEE_TYPES.map((type) => {
                    const info = feeTypeInfo(type);
                    return (
                      <Chip key={type} onClick={() => addRow(type)} className="text-xs py-2">
                        {info.icon} {info.label}
                      </Chip>
                    );
                  })}
                  <Chip onClick={() => addRow('custom')} className="text-xs py-2 col-span-3">
                    📦 Custom Fee
                  </Chip>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-200 dark:border-surface-800">
                <span className="text-xs uppercase tracking-wide font-semibold text-surface-400 dark:text-surface-500">
                  Total
                </span>
                <span className="text-lg font-bold text-surface-900 dark:text-white">{fmt(original)}</span>
              </div>
            </GCardContent>
          </GCard>
        )}

        {/* ─────────── STEP 3 · Waiver ─────────── */}
        {step === 3 && (
          <>
            <GCard>
              <GCardContent className="p-5 space-y-4">
                <div>
                  <p className="text-base font-semibold text-surface-900 dark:text-white">Apply a semester waiver?</p>
                  <p className="text-xs text-surface-500 mt-1">
                    Reduces every eligible fee by this percentage. Optional.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-2">
                    Waiver percentage
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {WAIVER_PRESETS.map((p) => (
                      <Chip
                        key={p}
                        active={waiverPct === p}
                        onClick={() => setWaiverPct(p)}
                        className="text-xs py-2"
                      >
                        {p}%
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">
                    Custom percentage
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      inputMode="decimal"
                      value={waiverPct || ''}
                      onChange={(e) =>
                        setWaiverPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                      }
                      placeholder="e.g. 35"
                      className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none border bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:border-primary-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-2">
                    Scholarship type <span className="text-surface-400 dark:text-surface-600">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SCHOLARSHIP_LABELS).map(([key, label]) => (
                      <Chip
                        key={key}
                        active={scholarshipType === key}
                        onClick={() => setScholarshipType(scholarshipType === key ? null : key)}
                        className="text-[13px] text-left"
                      >
                        {SCHOLARSHIP_ICONS[key]} {label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </GCardContent>
            </GCard>

            {/* Live preview */}
            <div className="rounded-2xl border border-primary-500/30 bg-primary-500/[0.06] p-4 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-500 dark:text-surface-400">Original Cost</span>
                <span className="text-surface-900 dark:text-white">{fmt(original)}</span>
              </div>
              {waiverPct > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-500 dark:text-surface-400">
                    Waiver <span className="text-surface-400 dark:text-surface-500">({waiverPct}%)</span>
                  </span>
                  <span className="text-rose-500 dark:text-rose-300">-{fmt(discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-surface-200 dark:border-surface-800">
                <span className="text-primary-600 dark:text-primary-300 font-semibold text-sm">Final Payable</span>
                <span className="text-xl font-bold text-surface-900 dark:text-white">{fmt(final)}</span>
              </div>
            </div>
          </>
        )}

        {/* ─────────── STEP 4 · Payment Method ─────────── */}
        {step === 4 && (
          <>
            <GCard>
              <GCardContent className="p-5 space-y-4">
                <div>
                  <p className="text-base font-semibold text-surface-900 dark:text-white">How will you pay?</p>
                  <p className="text-xs text-surface-500 mt-1">Pick a payment method for your final payable.</p>
                </div>
                <div className="space-y-2.5">
                  <PickCard
                    active={paymentMethod === 'full'}
                    onClick={() => setPaymentMethod('full')}
                    icon="💳"
                    titleText="Pay Full Amount"
                    desc="One payment. We'll create a single pending payment."
                  />
                  <PickCard
                    active={paymentMethod === 'installments'}
                    onClick={() => {
                      setPaymentMethod('installments');
                      if (count < 2) setCount(3);
                    }}
                    icon="📆"
                    titleText="Pay by Installments"
                    desc="Split into 2, 3, 4, or custom installments. Monthly reminders auto-generated."
                  />
                </div>
              </GCardContent>
            </GCard>

            {paymentMethod === 'installments' && (
              <GCard>
                <GCardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">How many installments?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {INSTALLMENT_PRESETS.map((n) => (
                      <Chip
                        key={n}
                        active={!useCustomCount && count === n}
                        onClick={() => {
                          setUseCustomCount(false);
                          setCount(n);
                        }}
                      >
                        {n}
                      </Chip>
                    ))}
                    <Chip active={useCustomCount} onClick={() => setUseCustomCount(true)}>
                      Custom
                    </Chip>
                  </div>
                  {useCustomCount && (
                    <div>
                      <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">
                        Custom count
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="12"
                        step="1"
                        inputMode="numeric"
                        value={customCount}
                        onChange={(e) => setCustomCount(e.target.value)}
                        placeholder="e.g. 6"
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:border-primary-500"
                      />
                      <p className="text-[10px] text-surface-500 mt-1.5">Between 2 and 12 installments.</p>
                    </div>
                  )}
                </GCardContent>
              </GCard>
            )}
          </>
        )}

        {/* ─────────── STEP 5 · First Installment ─────────── */}
        {step === 5 && (
          <GCard>
            <GCardContent className="p-5 space-y-4">
              <div>
                <p className="text-base font-semibold text-surface-900 dark:text-white">First installment</p>
                <p className="text-xs text-surface-500 mt-1">
                  Enter the FIRST one — we'll calculate the rest and auto-schedule them monthly on the same day.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">
                  First installment amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  inputMode="decimal"
                  value={firstAmount}
                  onChange={(e) => {
                    setFirstAmount(e.target.value);
                    setFirstAmountTouched(true);
                  }}
                  placeholder="30000"
                  className="w-full px-3 py-3 rounded-xl text-lg font-semibold outline-none border bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:border-primary-500"
                />
                <p className="text-[10px] text-surface-500 mt-1.5">
                  {resolvedCount} installment{resolvedCount === 1 ? '' : 's'} · equal split would be{' '}
                  {fmt(equalSplitFirst)} each. Enter a different first amount to front-load or back-load.
                </p>
                {Number(firstAmount) > final + 1e-9 && (
                  <p className="text-[10px] text-rose-500 mt-1">First installment can't exceed the final payable.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">
                  First due date
                </label>
                <input
                  type="date"
                  value={firstDate}
                  onChange={(e) => setFirstDate(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl text-base font-semibold outline-none border bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:border-primary-500"
                  style={{ colorScheme: 'dark' }}
                />
                <p className="text-[10px] text-surface-500 mt-1.5">
                  Subsequent installments will fall on the same day each month.
                </p>
              </div>
            </GCardContent>
          </GCard>
        )}

        {/* ─────────── STEP 6 · Review ─────────── */}
        {step === 6 && (
          <>
            <GCard>
              <GCardContent className="p-5 space-y-3">
                <p className="text-base font-semibold text-surface-900 dark:text-white">Review your plan</p>
                <dl className="grid grid-cols-2 gap-2.5 text-sm">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-surface-500">Original Cost</dt>
                    <dd className="text-sm font-semibold text-surface-900 dark:text-white mt-0.5">{fmt(original)}</dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-[10px] uppercase tracking-wide text-surface-500">Waiver</dt>
                    <dd className="text-sm font-semibold text-rose-500 dark:text-rose-300 mt-0.5">
                      {waiverPct > 0 ? `-${fmt(discount)} (${waiverPct}%)` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-surface-500">Final Payable</dt>
                    <dd className="text-sm font-semibold text-primary-600 dark:text-primary-300 mt-0.5">{fmt(final)}</dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-[10px] uppercase tracking-wide text-surface-500">Plan</dt>
                    <dd className="text-sm font-semibold text-surface-900 dark:text-white mt-0.5">
                      {resolvedCount === 1 ? 'Full Payment' : `${resolvedCount} Installments`}
                    </dd>
                  </div>
                </dl>
              </GCardContent>
            </GCard>

            <GCard>
              <GCardContent className="p-5 space-y-2">
                <p className="text-xs uppercase tracking-wide font-semibold text-surface-400 dark:text-surface-500 mb-2">
                  Generated Schedule
                </p>
                <div className="space-y-1.5">
                  {installments.map((inst, i) => (
                    <div
                      key={inst.id}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/40"
                    >
                      <span className="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-800 flex items-center justify-center text-[10px] font-semibold text-surface-600 dark:text-surface-300 shrink-0">
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-900 dark:text-white">{fmtFullDate(inst.dueDate)}</p>
                        <p className="text-[10px] text-surface-500">Reminder · Payment Due</p>
                      </div>
                      <p className="text-sm font-semibold text-surface-900 dark:text-white">{fmt(inst.amount)}</p>
                    </div>
                  ))}
                </div>
              </GCardContent>
            </GCard>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 space-y-2">
              <p className="text-xs uppercase tracking-wide font-semibold text-emerald-600 dark:text-emerald-300">
                🔔 Reminders
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-200/90 leading-relaxed">
                {resolvedCount === 1
                  ? `You'll get one reminder on ${fmtFullDate(installments[0]?.dueDate)} for the full payment.`
                  : `${resolvedCount} monthly reminders will fire on the ${ordinalDay(
                      installments[0]?.dueDate,
                    )} of each month — starting ${fmtShortDate(installments[0]?.dueDate)} and ending ${fmtShortDate(
                      installments[installments.length - 1]?.dueDate,
                    )}. Reminders for each installment stop once that installment is marked paid.`}
              </p>
            </div>
          </>
        )}

        {/* Nav */}
        <div className="flex items-center gap-2 pt-2">
          <GButton variant="secondary" fullWidth onClick={handleBack} disabled={step === 1}>
            Back
          </GButton>
          <GButton fullWidth onClick={handleNext} disabled={!stepValid(step) || saving} loading={saving && step === 6}>
            {nextLabel}
          </GButton>
        </div>
      </div>
    </div>
  );
}

// ── Reusable presentational pieces ────────────────────────────────────────────
function PickCard({ active, onClick, icon, titleText, desc }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-[1.125rem] rounded-2xl border transition-all ${
        active
          ? 'border-primary-500 bg-primary-500/10'
          : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 hover:border-surface-300 dark:hover:border-surface-600'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-surface-900 dark:text-white">{titleText}</p>
          <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-1">{desc}</p>
        </div>
      </div>
    </button>
  );
}

function Chip({ active, onClick, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
        active
          ? 'border-primary-500 bg-primary-500/15 text-primary-700 dark:text-primary-200'
          : 'border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-white hover:border-surface-300 dark:hover:border-surface-600'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default PaymentWizard;
