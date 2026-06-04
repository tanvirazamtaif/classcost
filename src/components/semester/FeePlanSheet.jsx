import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { BottomSheet, GButton } from '../ui';
import {
  finalPayable,
  buildInstallments,
  splitIntoInstallments,
  generateBillingDates,
  toPaisa,
  genId,
  todayISO,
  recomputeFee,
} from '../../lib/universalInstallments';
import { feeTypeInfo, PLAN_OPTIONS, DEFAULT_CREDIT_RATE } from '../../lib/feeTypeConfig';
import { makeFmt } from '../../utils/format';
import { useApp } from '../../contexts/AppContext';

/**
 * 3-step Add-Fee bottom sheet (universal installment system).
 *
 * Step 1 — Fee details: tuition shows Credit Price + Credits (originalAmount =
 *   creditPrice * credits); everything else is a single Amount input. Custom fees
 *   also get an editable Name. Optional Note.
 * Step 2 — Review: read-only waiver eligibility (driven by the semester profile,
 *   editable via the Manage link → onManageWaiver) + the Fee Total card showing the
 *   original and the final payable after the waiver.
 * Step 3 — Schedule: plan chips (1/2/3/4/custom) defaulting to the semester
 *   installmentPreference. Fixed plans recompute amounts automatically (read-only
 *   rows); custom plans allow editable amounts + add/remove rows with live
 *   validation that the sum exactly equals the final payable.
 *
 * Amounts are stored POST-waiver (NET) so receipts never silently re-price.
 */
export function FeePlanSheet({ isOpen, onClose, feeType, profile, currency, onSubmit, onManageWaiver }) {
  const { theme } = useApp();
  const d = theme === 'dark';
  const fmt = useMemo(() => makeFmt(currency), [currency]);

  const info = feeTypeInfo(feeType);
  const isTuition = info.sheet === 'tuition';
  const isCustomName = !!info.editableName;
  const billingDay = profile?.billingDay || 10;

  // ── Step 1 inputs ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [creditPrice, setCreditPrice] = useState('');
  const [credits, setCredits] = useState('');
  const [amount, setAmount] = useState('');
  const [customName, setCustomName] = useState('');
  const [note, setNote] = useState('');

  // ── Step 3 plan ──────────────────────────────────────────────────────────
  const [plan, setPlan] = useState(profile?.installmentPreference || 1);
  const [customRows, setCustomRows] = useState([{ amount: '', dueDate: '' }]);

  // Reset everything when the fee type changes or the sheet (re)opens.
  useEffect(() => {
    setStep(1);
    setCreditPrice(isTuition ? String(DEFAULT_CREDIT_RATE) : '');
    setCredits('');
    setAmount('');
    setCustomName('');
    setNote('');
    setPlan(profile?.installmentPreference || 1);
    setCustomRows([{ amount: '', dueDate: '' }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeType, isOpen]);

  // ── Derived money ──────────────────────────────────────────────────────────
  const originalAmount = isTuition
    ? Math.max(0, Number(creditPrice) || 0) * Math.max(0, Number(credits) || 0)
    : Math.max(0, Number(amount) || 0);

  const eligible = (profile?.eligibleFeeTypes || []).includes(feeType);
  const waiverPct = profile?.waiverPercent || 0;
  const final = finalPayable(originalAmount, eligible, waiverPct);

  const breakdown = isTuition
    ? { creditPrice: Math.max(0, Number(creditPrice) || 0), credits: Math.max(0, Number(credits) || 0) }
    : null;

  // ── Custom-plan validation ──────────────────────────────────────────────────
  const isCustomPlan = plan === 'custom';
  const customSumP = customRows.reduce((s, r) => s + toPaisa(r.amount), 0);
  const finalP = toPaisa(final);
  const diffP = customSumP - finalP; // >0 over, <0 short
  const customMatches = diffP === 0;

  // Seed custom rows (equal split + monthly billing dates) the first time the user
  // switches to the custom plan while the rows are still empty.
  const selectPlan = (next) => {
    if (next === 'custom') {
      const allEmpty = customRows.every((r) => r.amount === '' || r.amount == null);
      if (allEmpty && final > 0) {
        const n = 3;
        const amounts = splitIntoInstallments(final, n);
        const dates = generateBillingDates(n, billingDay);
        setCustomRows(amounts.map((amt, i) => ({ amount: amt, dueDate: dates[i] || '' })));
      }
    }
    setPlan(next);
  };

  const updateCustomRow = (idx, field, value) => {
    setCustomRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };
  const addCustomRow = () => setCustomRows((rows) => [...rows, { amount: '', dueDate: '' }]);
  const removeCustomRow = (idx) =>
    setCustomRows((rows) => {
      const next = rows.filter((_, i) => i !== idx);
      return next.length ? next : [{ amount: '', dueDate: '' }];
    });

  // Rows to render in step 3: fixed plans are recomputed from `final`; custom
  // plans render the editable customRows.
  const fixedInstallments = useMemo(() => {
    if (isCustomPlan) return [];
    return buildInstallments(final, plan, { billingDay });
  }, [isCustomPlan, plan, final, billingDay]);

  const scheduleRows = isCustomPlan
    ? customRows.map((r, i) => ({ n: i + 1, amount: r.amount, dueDate: r.dueDate }))
    : fixedInstallments.map((inst, i) => ({ n: i + 1, amount: inst.amount, dueDate: inst.dueDate }));

  // ── Step gating ──────────────────────────────────────────────────────────
  const nameOk = !isCustomName || customName.trim().length > 0;
  const step1Valid = originalAmount > 0 && nameOk;
  // Validity keys off originalAmount (step1), not `final` — a fully-waived fee
  // (100% waiver → final 0) is still a legitimate fee to record/track.
  const step2Valid = step1Valid;
  const customValid =
    customRows.length > 0 &&
    customRows.every((r) => (Number(r.amount) || 0) >= 0) &&
    customMatches;
  const step3Valid = step2Valid && (isCustomPlan ? customValid : true);
  const canSubmit = step3Valid;

  const goNext = () => setStep((s) => Math.min(3, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = () => {
    if (!canSubmit) return;
    const label = isCustomName && customName.trim() ? customName.trim() : info.label;
    const installments = isCustomPlan
      ? buildInstallments(final, 'custom', { billingDay, customRows })
      : buildInstallments(final, plan, { billingDay });

    const fee = recomputeFee({
      id: genId('f'),
      type: feeType,
      label,
      icon: info.icon,
      note: note.trim() || '',
      originalAmount,
      amount: final,
      waiverEligible: eligible,
      waiverPctAtCreation: eligible ? waiverPct : 0,
      breakdown: breakdown || null,
      installments,
      addedAt: todayISO(),
    });
    onSubmit(fee);
  };

  // ── Style tokens (match the mockup's dark sheet + light fallback) ───────────
  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm outline-none border transition ${
    d
      ? 'bg-surface-900 border-surface-700 text-white placeholder-surface-600 focus:border-primary-500'
      : 'bg-white border-surface-300 text-surface-900 placeholder-surface-400 focus:border-primary-500'
  }`;
  const labelCls = `text-xs font-medium block mb-1.5 ${d ? 'text-surface-400' : 'text-surface-600'}`;
  const subtle = 'text-surface-500';

  const STEP_TITLES = { 1: 'Fee details', 2: 'Review total', 3: 'Payment schedule' };

  const chipCls = (active) =>
    `px-3 py-2 rounded-xl text-sm font-semibold border transition ${
      active
        ? 'border-primary-500 bg-primary-500/15 text-primary-300'
        : d
          ? 'border-surface-700 bg-surface-800 text-white hover:border-surface-600'
          : 'border-surface-300 bg-white text-surface-700 hover:border-surface-400'
    }`;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={'Add ' + info.label}>
      {/* Step indicator */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step
                  ? 'bg-emerald-400'
                  : i === step
                    ? 'bg-primary-500'
                    : d
                      ? 'bg-surface-700'
                      : 'bg-surface-200'
              }`}
            />
          ))}
        </div>
        <p className={`text-[10px] uppercase tracking-wide font-semibold ${subtle}`}>
          Step {step} of 3 · {STEP_TITLES[step]}
        </p>
      </div>

      {/* ─────────── STEP 1 · Fee details ─────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {isTuition ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Credit Price</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  inputMode="decimal"
                  value={creditPrice}
                  onChange={(e) => setCreditPrice(e.target.value)}
                  placeholder={String(DEFAULT_CREDIT_RATE)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Credits</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  placeholder="15"
                  className={inputCls}
                />
              </div>
            </div>
          ) : (
            <>
              {isCustomName && (
                <div>
                  <label className={labelCls}>Fee Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Hostel Deposit"
                    className={inputCls}
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>Amount</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className={`${inputCls} text-lg font-semibold`}
                />
              </div>
            </>
          )}

          <div>
            <label className={labelCls}>
              Note <span className={subtle}>(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder=""
              className={inputCls}
            />
          </div>

          {originalAmount > 0 && (
            <p className={`text-xs ${subtle}`}>
              Fee total: <span className={d ? 'text-white font-semibold' : 'text-surface-900 font-semibold'}>{fmt(originalAmount)}</span>
            </p>
          )}
        </div>
      )}

      {/* ─────────── STEP 2 · Review total ─────────── */}
      {step === 2 && (
        <div className="space-y-3">
          {/* Eligibility status (read-only — set in Semester Waiver settings) */}
          <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${d ? 'border-surface-800 bg-surface-900/60' : 'border-surface-200 bg-surface-50'}`}>
            <span className="text-base mt-0.5">{eligible ? '🎓' : '🚫'}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${eligible ? 'text-primary-300' : d ? 'text-surface-200' : 'text-surface-700'}`}>
                {eligible
                  ? waiverPct > 0
                    ? `${waiverPct}% waiver applies`
                    : 'Waiver-eligible'
                  : 'Not waiver-eligible'}
              </p>
              <p className={`text-[10px] mt-0.5 ${subtle}`}>
                {eligible
                  ? 'This fee type is included in your semester waiver'
                  : 'Pays full amount · set eligible types in Waiver Settings'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onManageWaiver?.()}
              className="text-[10px] font-medium text-primary-300 hover:text-primary-200 transition shrink-0"
            >
              Manage
            </button>
          </div>

          {/* Fee Total card */}
          <div className="rounded-2xl border border-primary-500/20 bg-primary-500/[0.06] p-4">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wide font-semibold text-primary-400">Fee Total</span>
              {eligible && waiverPct > 0 && originalAmount > 0 && (
                <span className={`text-[10px] ${subtle}`}>Original (pre-waiver)</span>
              )}
            </div>
            <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>{fmt(originalAmount)}</p>
            {eligible && waiverPct > 0 && originalAmount > 0 && (
              <p className="text-[11px] text-primary-300 mt-1">
                Final payable after {waiverPct}% waiver: {fmt(final)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─────────── STEP 3 · Payment schedule ─────────── */}
      {step === 3 && (
        <div className="space-y-3">
          {/* Plan chips (default = semester preference) */}
          <div>
            <label className={labelCls}>Payment Plan</label>
            <div className="grid grid-cols-5 gap-2">
              {PLAN_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => selectPlan(opt.value)}
                  className={chipCls(String(plan) === String(opt.value))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className={`text-[10px] mt-2 ${subtle}`}>
              Default from Semester Settings · billed on the {billingDay}
              {billingDay === 1 ? 'st' : billingDay === 2 ? 'nd' : billingDay === 3 ? 'rd' : 'th'} of every month
            </p>
          </div>

          {/* Schedule editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className={labelCls + ' mb-0'}>Installment Schedule</p>
              <span className={`text-[11px] ${isCustomPlan ? (customMatches ? 'text-emerald-400' : 'text-rose-400') : subtle}`}>
                {isCustomPlan
                  ? customMatches
                    ? 'matches final ✓'
                    : diffP > 0
                      ? `over by ${fmt(Math.abs(diffP) / 100)}`
                      : `${fmt(Math.abs(diffP) / 100)} short`
                  : final > 0
                    ? `Total: ${fmt(final)} across ${scheduleRows.length} installment${scheduleRows.length === 1 ? '' : 's'}`
                    : ''}
              </span>
            </div>

            <div className="space-y-1.5">
              {scheduleRows.map((row, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${d ? 'border-surface-800 bg-surface-900/60' : 'border-surface-200 bg-white'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-500'}`}>
                    #{row.n}
                  </div>
                  <input
                    type="date"
                    value={row.dueDate || ''}
                    onChange={(e) => isCustomPlan && updateCustomRow(idx, 'dueDate', e.target.value)}
                    readOnly={!isCustomPlan}
                    style={{ colorScheme: d ? 'dark' : 'light' }}
                    className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-xs outline-none border ${
                      d ? 'bg-surface-950 border-surface-700 text-surface-300' : 'bg-surface-50 border-surface-300 text-surface-700'
                    } focus:border-primary-500 ${!isCustomPlan ? 'cursor-default' : ''}`}
                  />
                  {isCustomPlan ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={row.amount === '' ? '' : row.amount}
                      onChange={(e) => updateCustomRow(idx, 'amount', e.target.value)}
                      placeholder="0"
                      className={`w-28 px-2.5 py-1.5 rounded-lg text-sm text-right outline-none border ${
                        d ? 'bg-surface-950 border-surface-700 text-white' : 'bg-surface-50 border-surface-300 text-surface-900'
                      } focus:border-primary-500`}
                    />
                  ) : (
                    <span className={`text-sm font-semibold w-28 text-right ${d ? 'text-white' : 'text-surface-900'}`}>
                      {fmt(row.amount)}
                    </span>
                  )}
                  {isCustomPlan && (
                    <button
                      type="button"
                      onClick={() => removeCustomRow(idx)}
                      className="p-1 rounded text-rose-400 hover:bg-rose-900/30 transition shrink-0"
                      aria-label="Remove installment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isCustomPlan && (
              <button
                type="button"
                onClick={addCustomRow}
                className="w-full py-2 rounded-lg text-xs font-medium text-primary-300 border border-dashed border-primary-500/30 hover:bg-primary-500/10 transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add installment
              </button>
            )}

            {isCustomPlan && !customValid && (
              <p className="text-xs text-rose-400">
                {customRows.some((r) => (Number(r.amount) || 0) <= 0)
                  ? 'Each installment must be greater than 0'
                  : customMatches
                    ? ''
                    : `Installments sum to ${fmt(customSumP / 100)} but final payable is ${fmt(final)} (${diffP > 0 ? 'over by ' + fmt(Math.abs(diffP) / 100) : fmt(Math.abs(diffP) / 100) + ' short'})`}
              </p>
            )}
            {isCustomPlan && customMatches && customValid && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Installments match the final payable
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`flex items-center gap-2 pt-5 mt-2 border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
        {step > 1 ? (
          <GButton variant="secondary" fullWidth onClick={goBack}>
            Back
          </GButton>
        ) : (
          <GButton variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </GButton>
        )}
        {step < 3 ? (
          <GButton fullWidth disabled={step === 1 ? !step1Valid : !step2Valid} onClick={goNext}>
            Continue
          </GButton>
        ) : (
          <GButton fullWidth disabled={!canSubmit} onClick={handleSubmit}>
            Add Fee
          </GButton>
        )}
      </div>
    </BottomSheet>
  );
}

export default FeePlanSheet;
