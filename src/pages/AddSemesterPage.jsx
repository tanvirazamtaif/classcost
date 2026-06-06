import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useUniversalSemesters } from '../contexts/UniversalSemesterContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { DEFAULT_ELIGIBLE_TYPES } from '../lib/installmentEngine';
import {
  splitIntoInstallments, sumPaisa, fmt, todayISO, toISO, clampDay,
  generateMonthlyFrom, fmtFullDate, fmtShortDate, dayOrdinal,
} from '../lib/installmentEngine';

// ═══════════════════════════════════════════════════════════════
// SEMESTER PAYMENT PLANNING WIZARD  (ported from
// semester-payment-wizard-v1.html — replaces the old 3-step add)
// ═══════════════════════════════════════════════════════════════

const FEE_TYPES = {
  tuition:      { icon: '🎓', label: 'Tuition Fee' },
  lab:          { icon: '🔬', label: 'Lab Fee' },
  library:      { icon: '📚', label: 'Library Fee' },
  dev:          { icon: '🏗️', label: 'Development Fee' },
  exam:         { icon: '📝', label: 'Exam Fee' },
  registration: { icon: '📋', label: 'Registration Fee' },
  custom:       { icon: '📦', label: 'Custom Fee', editable: true },
};
const SCHOLARSHIPS = [
  { id: 'merit', label: '🏆 Merit' },
  { id: 'need-based', label: '🤝 Need-Based' },
  { id: 'dept', label: '🏛️ Department' },
  { id: 'ff-quota', label: '🇧🇩 FF Quota' },
  { id: 'sibling', label: '👫 Sibling' },
  { id: 'special', label: '✨ Special Grant' },
];

function getAutoSemester() {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  if (m >= 1 && m <= 4) return `Spring ${y}`;
  if (m >= 5 && m <= 8) return `Summer ${y}`;
  return `Fall ${y}`;
}

export const AddSemesterPage = () => {
  const { navigate, addToast, theme } = useApp();
  const { createSemester } = useUniversalSemesters();
  const { institutionName } = useUserProfile();
  const d = theme !== 'light';

  // ── Wizard state ───────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState(null);           // 'total' | 'breakdown'
  const [total, setTotal] = useState('');
  const [breakdown, setBreakdown] = useState([]);       // [{id,type,label,icon,amount,customName}]
  const [waiverPct, setWaiverPct] = useState(0);
  const [scholarshipType, setScholarshipType] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'full' | 'installments'
  const [installmentCount, setInstallmentCount] = useState(3); // number | 'custom'
  const [customCount, setCustomCount] = useState(6);
  const [firstAmount, setFirstAmount] = useState('');
  const [firstDate, setFirstDate] = useState('');
  const semesterName = useMemo(getAutoSemester, []);
  const universityName = institutionName || '';

  const breakdownIdRef = useRef(0);

  // ── Derived ────────────────────────────────────────────────────
  const computeOriginal = () =>
    method === 'total'
      ? Math.max(0, Number(total) || 0)
      : sumPaisa(breakdown.map((b) => b.amount)) / 100;
  const original = computeOriginal();
  const computeFinal = () => Math.max(0, original * (1 - waiverPct / 100));
  const final = computeFinal();
  const getCount = () => {
    if (paymentMethod === 'full') return 1;
    if (installmentCount === 'custom') return Math.min(12, Math.max(2, Number(customCount) || 2));
    return Number(installmentCount) || 2;
  };

  const generateSchedule = () => {
    const n = getCount();
    if (n === 1) {
      return [{ n: 1, amount: final, dueDate: firstDate || todayISO() }];
    }
    const first = Number(firstAmount) || splitIntoInstallments(final, n)[0];
    const tail = splitIntoInstallments(Math.max(0, final - first), n - 1);
    const dates = generateMonthlyFrom(firstDate || todayISO(), n);
    const out = [{ n: 1, amount: first, dueDate: dates[0] }];
    for (let i = 0; i < tail.length; i++) {
      out.push({ n: i + 2, amount: tail[i], dueDate: dates[i + 1] || '' });
    }
    return out;
  };

  // Default first installment + date when entering step 5
  useEffect(() => {
    if (step !== 5) return;
    const n = getCount();
    if (!firstAmount && n > 0 && final > 0) {
      setFirstAmount(String(splitIntoInstallments(final, n)[0]));
    }
    if (!firstDate) {
      const t = new Date();
      let y = t.getFullYear(), m = t.getMonth();
      let dt = new Date(y, m, clampDay(y, m, 10));
      if (dt < t) { m += 1; if (m > 11) { m = 0; y += 1; } dt = new Date(y, m, clampDay(y, m, 10)); }
      setFirstDate(toISO(dt));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Validation per step ────────────────────────────────────────
  const isStepValid = (s) => {
    if (s === 1) return !!method;
    if (s === 2) return original > 0;
    if (s === 3) return true;
    if (s === 4) {
      if (!paymentMethod) return false;
      if (paymentMethod === 'installments') return getCount() >= 2;
      return true;
    }
    if (s === 5) {
      const fa = Number(firstAmount) || 0;
      if (fa <= 0 || fa > final) return false;
      if (!firstDate) return false;
      return true;
    }
    return true;
  };

  const goNext = () => {
    haptics.light();
    if (step === 6) return commit();
    if (step === 4 && paymentMethod === 'full') return setStep(6);
    setStep(step + 1);
  };
  const goBack = () => {
    haptics.light();
    if (step === 1) { navigate('semester-landing'); return; }
    if (step === 6 && paymentMethod === 'full') return setStep(4);
    setStep(step - 1);
  };

  // ── Breakdown editing ──────────────────────────────────────────
  const addBreakdownRow = (type) => {
    haptics.light();
    const conf = FEE_TYPES[type];
    breakdownIdRef.current += 1;
    setBreakdown((b) => [...b, {
      id: 'b_' + breakdownIdRef.current,
      type, label: conf.label, icon: conf.icon, amount: '',
      customName: type === 'custom' ? '' : null,
    }]);
  };
  const updateBreakdown = (id, patch) =>
    setBreakdown((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeBreakdown = (id) => setBreakdown((b) => b.filter((x) => x.id !== id));

  // ── Commit → create universal semester ─────────────────────────
  const commit = () => {
    const n = getCount();
    const billingDay = firstDate ? new Date(firstDate).getDate() : 10;
    const eligibleSet = new Set(DEFAULT_ELIGIBLE_TYPES);
    let fees;

    if (method === 'breakdown' && breakdown.length > 0) {
      fees = breakdown.map((b) => {
        const orig = Math.max(0, Number(b.amount) || 0);
        const eligible = waiverPct > 0; // wizard applies waiver to the whole cost
        const feeFinal = eligible ? orig * (1 - waiverPct / 100) : orig;
        const amounts = splitIntoInstallments(feeFinal, n);
        const dates = generateMonthlyFrom(firstDate || todayISO(), n);
        if (eligible) eligibleSet.add(b.type);
        return {
          type: b.type,
          label: b.customName || b.label,
          icon: b.icon,
          originalAmount: orig,
          waiverEligible: eligible,
          waiverPctAtCreation: eligible ? waiverPct : 0,
          installments: amounts.map((amt, i) => ({ amount: amt, dueDate: dates[i] || '' })),
        };
      });
    } else {
      const schedule = generateSchedule();
      const eligible = waiverPct > 0;
      if (eligible) eligibleSet.add('tuition');
      fees = [{
        type: 'tuition',
        label: universityName ? `${universityName} — Semester Cost` : 'Semester Cost',
        icon: '🎓',
        originalAmount: original,
        waiverEligible: eligible,
        waiverPctAtCreation: eligible ? waiverPct : 0,
        installments: schedule.map((s) => ({ amount: s.amount, dueDate: s.dueDate || '' })),
      }];
    }

    const record = createSemester({
      universityName,
      semesterName,
      profile: {
        waiverPercent: waiverPct,
        scholarshipType,
        billingDay,
        installmentPreference: paymentMethod === 'full' ? 1 : (installmentCount === 'custom' ? 'custom' : n),
        eligibleFeeTypes: [...eligibleSet],
      },
      fees,
    });

    haptics.success();
    addToast('Semester plan created', 'success');
    navigate('universal-semester', { params: { semesterId: record.id } });
  };

  // ── Style helpers (theme-aware) ────────────────────────────────
  const page = d ? 'bg-surface-950' : 'bg-surface-50';
  const card = d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200';
  const titleC = d ? 'text-white' : 'text-surface-900';
  const muted = d ? 'text-surface-400' : 'text-surface-500';
  const inputCls = `w-full px-3 py-3 rounded-xl text-sm outline-none border focus:border-primary-500 transition ${
    d ? 'bg-surface-900 border-surface-700 text-white placeholder-surface-600' : 'bg-white border-surface-200 text-surface-900'
  }`;
  const chip = (active) =>
    `px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${
      active
        ? 'border-primary-500 bg-primary-500/15 text-primary-500'
        : d ? 'border-surface-700 bg-surface-800 text-white hover:border-surface-600'
            : 'border-surface-200 bg-surface-100 text-surface-700 hover:border-surface-300'
    }`;
  const pickCard = (active) =>
    `w-full text-left p-4 rounded-2xl border transition ${
      active
        ? 'border-primary-500 bg-primary-500/10'
        : d ? 'border-surface-800 bg-surface-900 hover:border-surface-700' : 'border-surface-200 bg-white hover:border-surface-300'
    }`;

  const stepTitles = {
    1: 'Choose entry method',
    2: method === 'total' ? 'Total cost' : 'Itemize fees',
    3: 'Waiver / scholarship',
    4: 'Payment method',
    5: 'First installment',
    6: 'Review & confirm',
  };

  const schedule = step === 6 ? generateSchedule() : [];

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-28 ${page}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-sm border-b ${d ? 'bg-surface-950/95 border-surface-800' : 'bg-white/95 border-surface-200'}`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={goBack} className={`w-10 h-10 flex items-center justify-center rounded-full transition ${d ? 'hover:bg-surface-800' : 'hover:bg-surface-100'}`} aria-label="Back">
            <ArrowLeft className={`w-5 h-5 ${d ? 'text-surface-300' : 'text-surface-700'}`} />
          </button>
          <h1 className={`text-lg font-semibold ${titleC}`}>
            {universityName ? `${universityName} · ${semesterName}` : `Add Semester · ${semesterName}`}
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Intro (step 1 only) */}
        {step === 1 && (
          <div className="rounded-2xl border border-primary-500/30 bg-primary-500/[0.06] p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧙‍♂️</span>
              <div>
                <p className={`text-base font-semibold ${titleC}`}>Plan your semester payments</p>
                <p className={`text-xs mt-1 leading-relaxed ${muted}`}>
                  Walk through a few quick steps. We'll calculate your waiver, build your installment
                  schedule, and set up monthly reminders automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className={`rounded-2xl border px-4 py-3 ${card}`}>
          <div className="flex items-center gap-1.5 mb-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} className="h-1.5 flex-1 rounded-full transition-all"
                style={{ background: i < step ? '#34a853' : i === step ? '#4285f4' : (d ? '#3c4043' : '#e8eaed') }} />
            ))}
          </div>
          <p className={`text-[11px] uppercase tracking-wide font-semibold ${muted}`}>
            Step {step} of 6 · {stepTitles[step]}
          </p>
        </div>

        {/* ── STEP 1 · Method ── */}
        {step === 1 && (
          <div className={`rounded-2xl border p-5 space-y-3 ${card}`}>
            <p className={`text-base font-semibold ${titleC}`}>How would you like to add your semester cost?</p>
            <p className={`text-xs ${muted}`}>Pick one — you can change it later.</p>
            <div className="space-y-2.5 pt-2">
              <button className={pickCard(method === 'total')} onClick={() => { haptics.light(); setMethod('total'); }}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">💰</span>
                  <div>
                    <p className={`text-sm font-semibold ${titleC}`}>Total Semester Amount</p>
                    <p className={`text-[11px] mt-1 ${muted}`}>Enter one number for the whole semester. Fastest way.</p>
                  </div>
                </div>
              </button>
              <button className={pickCard(method === 'breakdown')} onClick={() => { haptics.light(); setMethod('breakdown'); }}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">📋</span>
                  <div>
                    <p className={`text-sm font-semibold ${titleC}`}>Fee Breakdown</p>
                    <p className={`text-[11px] mt-1 ${muted}`}>Itemize tuition, lab, library, dev, exam, registration, custom.</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 · Cost ── */}
        {step === 2 && method === 'total' && (
          <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
            <div>
              <p className={`text-base font-semibold ${titleC}`}>What's the total semester cost?</p>
              <p className={`text-xs mt-1 ${muted}`}>Before any waivers or scholarships.</p>
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${muted}`}>Total Amount (৳)</label>
              <input type="number" min="0" step="100" placeholder="120000" value={total}
                onChange={(e) => setTotal(e.target.value)} className={`${inputCls} text-lg font-semibold`} autoFocus />
            </div>
          </div>
        )}
        {step === 2 && method === 'breakdown' && (
          <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
            <div>
              <p className={`text-base font-semibold ${titleC}`}>Add each fee</p>
              <p className={`text-xs mt-1 ${muted}`}>Tap a fee type, enter the amount. The total adds up live.</p>
            </div>
            <div className="space-y-2">
              {breakdown.length === 0 && <p className={`text-xs italic ${muted}`}>No fees added yet. Tap a chip below.</p>}
              {breakdown.map((b) => (
                <div key={b.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${d ? 'border-surface-800 bg-surface-950/40' : 'border-surface-200 bg-surface-50'}`}>
                  <span className="text-base shrink-0">{b.icon}</span>
                  {b.customName !== null ? (
                    <input type="text" value={b.customName} placeholder="Custom fee name"
                      onChange={(e) => updateBreakdown(b.id, { customName: e.target.value })}
                      className={`flex-1 min-w-0 px-2 py-1 rounded text-xs outline-none border ${d ? 'bg-surface-950 border-surface-700 text-white' : 'bg-white border-surface-200'}`} />
                  ) : (
                    <span className={`flex-1 min-w-0 text-sm truncate ${titleC}`}>{b.label}</span>
                  )}
                  <input type="number" min="0" step="100" placeholder="0" value={b.amount}
                    onChange={(e) => updateBreakdown(b.id, { amount: e.target.value })}
                    className={`w-28 px-2 py-1.5 rounded-lg text-sm font-semibold text-right outline-none border ${d ? 'bg-surface-950 border-surface-700 text-white' : 'bg-white border-surface-200'}`} />
                  <button onClick={() => removeBreakdown(b.id)} className="p-1 rounded text-rose-400 hover:bg-rose-900/20" aria-label="Remove">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div>
              <p className={`text-xs font-medium mb-2 ${muted}`}>Add fee type</p>
              <div className="grid grid-cols-3 gap-2">
                {['tuition', 'lab', 'library', 'dev', 'exam', 'registration'].map((t) => (
                  <button key={t} className={`${chip(false)} text-xs py-2`} onClick={() => addBreakdownRow(t)}>
                    {FEE_TYPES[t].icon} {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
                <button className={`${chip(false)} text-xs py-2 col-span-3`} onClick={() => addBreakdownRow('custom')}>📦 Custom Fee</button>
              </div>
            </div>
            <div className={`flex items-center justify-between pt-3 border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
              <span className={`text-xs uppercase tracking-wide font-semibold ${muted}`}>Total</span>
              <span className={`text-lg font-bold ${titleC}`}>{fmt(original)}</span>
            </div>
          </div>
        )}

        {/* ── STEP 3 · Waiver ── */}
        {step === 3 && (
          <>
            <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
              <div>
                <p className={`text-base font-semibold ${titleC}`}>Apply a semester waiver?</p>
                <p className={`text-xs mt-1 ${muted}`}>Reduces every eligible fee by this percentage. Optional.</p>
              </div>
              <div>
                <label className={`text-xs font-medium block mb-2 ${muted}`}>Waiver percentage</label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 25, 50, 75, 100].map((p) => (
                    <button key={p} className={`${chip(waiverPct === p)} text-xs py-2`} onClick={() => { haptics.light(); setWaiverPct(p); }}>{p}%</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium block mb-1.5 ${muted}`}>Custom percentage</label>
                <div className="relative">
                  <input type="number" min="0" max="100" step="0.5" placeholder="e.g. 35" value={waiverPct || ''}
                    onChange={(e) => setWaiverPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    className={`${inputCls} pr-10`} />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${muted}`}>%</span>
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium block mb-2 ${muted}`}>Scholarship type <span className="opacity-60">(optional)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {SCHOLARSHIPS.map((s) => (
                    <button key={s.id} className={`${chip(scholarshipType === s.id)} text-[13px] text-left`}
                      onClick={() => { haptics.light(); setScholarshipType(scholarshipType === s.id ? null : s.id); }}>{s.label}</button>
                  ))}
                </div>
              </div>
            </div>
            {/* Live preview */}
            <div className="rounded-2xl border border-primary-500/30 bg-primary-500/[0.06] p-4 space-y-1.5">
              <div className="flex items-center justify-between text-sm"><span className={muted}>Original Cost</span><span className={titleC}>{fmt(original)}</span></div>
              {waiverPct > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className={muted}>Waiver ({waiverPct}%)</span>
                  <span className="text-rose-400">-{fmt(original - final)}</span>
                </div>
              )}
              <div className={`flex items-center justify-between pt-2 mt-1 border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
                <span className="text-primary-500 font-semibold text-sm">Final Payable</span>
                <span className={`text-xl font-bold ${titleC}`}>{fmt(final)}</span>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 4 · Payment method ── */}
        {step === 4 && (
          <>
            <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
              <div>
                <p className={`text-base font-semibold ${titleC}`}>How will you pay?</p>
                <p className={`text-xs mt-1 ${muted}`}>Pick a payment method for your final payable.</p>
              </div>
              <div className="space-y-2.5">
                <button className={pickCard(paymentMethod === 'full')} onClick={() => { haptics.light(); setPaymentMethod('full'); setInstallmentCount(1); }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">💳</span>
                    <div><p className={`text-sm font-semibold ${titleC}`}>Pay Full Amount</p><p className={`text-[11px] mt-1 ${muted}`}>One payment. We'll create a single pending payment.</p></div>
                  </div>
                </button>
                <button className={pickCard(paymentMethod === 'installments')} onClick={() => { haptics.light(); setPaymentMethod('installments'); if (installmentCount === 1) setInstallmentCount(3); }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📆</span>
                    <div><p className={`text-sm font-semibold ${titleC}`}>Pay by Installments</p><p className={`text-[11px] mt-1 ${muted}`}>Split into 2, 3, 4, or custom. Monthly reminders auto-generated.</p></div>
                  </div>
                </button>
              </div>
            </div>
            {paymentMethod === 'installments' && (
              <div className={`rounded-2xl border p-5 space-y-3 ${card}`}>
                <p className={`text-sm font-semibold ${titleC}`}>How many installments?</p>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 'custom'].map((c) => (
                    <button key={c} className={chip(installmentCount === c)} onClick={() => { haptics.light(); setInstallmentCount(c); }}>
                      {c === 'custom' ? 'Custom' : c}
                    </button>
                  ))}
                </div>
                {installmentCount === 'custom' && (
                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${muted}`}>Custom count</label>
                    <input type="number" min="2" max="12" step="1" placeholder="e.g. 6" value={customCount}
                      onChange={(e) => setCustomCount(Math.min(12, Math.max(2, Number(e.target.value) || 2)))} className={inputCls} />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── STEP 5 · First installment ── */}
        {step === 5 && (
          <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
            <div>
              <p className={`text-base font-semibold ${titleC}`}>First installment</p>
              <p className={`text-xs mt-1 ${muted}`}>Enter the FIRST one — we'll calculate the rest and auto-schedule them monthly.</p>
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${muted}`}>First installment amount (৳)</label>
              <input type="number" min="0" step="100" placeholder="30000" value={firstAmount}
                onChange={(e) => setFirstAmount(e.target.value)} className={`${inputCls} text-lg font-semibold`} />
              <p className={`text-[10px] mt-1.5 ${muted}`}>
                {getCount()} installments · equal split would be {fmt(splitIntoInstallments(final, getCount())[0] || 0)} each.
              </p>
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${muted}`}>First due date</label>
              <input type="date" value={firstDate} onChange={(e) => setFirstDate(e.target.value)}
                className={`${inputCls} text-base font-semibold`} style={{ colorScheme: d ? 'dark' : 'light' }} />
              <p className={`text-[10px] mt-1.5 ${muted}`}>Subsequent installments fall on the same day each month.</p>
            </div>
          </div>
        )}

        {/* ── STEP 6 · Review ── */}
        {step === 6 && (
          <>
            <div className={`rounded-2xl border p-5 space-y-3 ${card}`}>
              <p className={`text-base font-semibold ${titleC}`}>Review your plan</p>
              <dl className="grid grid-cols-2 gap-2.5 text-sm">
                <div><dt className={`text-[10px] uppercase tracking-wide ${muted}`}>Original Cost</dt><dd className={`text-sm font-semibold mt-0.5 ${titleC}`}>{fmt(original)}</dd></div>
                <div className="text-right"><dt className={`text-[10px] uppercase tracking-wide ${muted}`}>Waiver</dt><dd className="text-sm font-semibold text-rose-400 mt-0.5">{waiverPct > 0 ? `-${fmt(original - final)} (${waiverPct}%)` : '—'}</dd></div>
                <div><dt className={`text-[10px] uppercase tracking-wide ${muted}`}>Final Payable</dt><dd className="text-sm font-semibold text-primary-500 mt-0.5">{fmt(final)}</dd></div>
                <div className="text-right"><dt className={`text-[10px] uppercase tracking-wide ${muted}`}>Plan</dt><dd className={`text-sm font-semibold mt-0.5 ${titleC}`}>{getCount() === 1 ? 'Full Payment' : `${getCount()} Installments`}</dd></div>
              </dl>
            </div>
            <div className={`rounded-2xl border p-5 space-y-2 ${card}`}>
              <p className={`text-xs uppercase tracking-wide font-semibold mb-2 ${muted}`}>Generated Schedule</p>
              <div className="space-y-1.5">
                {schedule.map((s) => (
                  <div key={s.n} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${d ? 'border-surface-800 bg-surface-950/40' : 'border-surface-200 bg-surface-50'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${d ? 'bg-surface-800 text-surface-300' : 'bg-surface-200 text-surface-600'}`}>#{s.n}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${titleC}`}>{fmtFullDate(s.dueDate)}</p>
                      <p className={`text-[10px] ${muted}`}>Reminder · Payment Due</p>
                    </div>
                    <p className={`text-sm font-semibold ${titleC}`}>{fmt(s.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 space-y-2">
              <p className="text-xs uppercase tracking-wide font-semibold text-emerald-400">🔔 Reminders</p>
              <p className="text-[11px] text-emerald-500/90 leading-relaxed">
                {getCount() === 1
                  ? `You'll get one reminder on ${fmtFullDate(schedule[0]?.dueDate)} for the full payment.`
                  : `${getCount()} monthly reminders on the ${dayOrdinal(new Date(schedule[0]?.dueDate || todayISO()).getDate())} — starting ${fmtShortDate(schedule[0]?.dueDate)} and ending ${fmtShortDate(schedule[schedule.length - 1]?.dueDate)}. Each stops once that installment is marked paid.`}
              </p>
            </div>
          </>
        )}
      </main>

      {/* Sticky nav */}
      <div className={`fixed bottom-0 inset-x-0 max-w-md mx-auto px-4 py-3 border-t ${d ? 'bg-surface-950/95 border-surface-800' : 'bg-white/95 border-surface-200'} backdrop-blur-sm`}>
        <div className="flex items-center gap-2">
          <button onClick={goBack} className={`flex-1 py-3 rounded-xl text-sm font-medium transition active:scale-[0.98] ${d ? 'text-surface-300 bg-surface-800 hover:bg-surface-700' : 'text-surface-700 bg-surface-100 hover:bg-surface-200'}`}>
            Back
          </button>
          <button onClick={goNext} disabled={!isStepValid(step)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition active:scale-[0.98] ${isStepValid(step) ? 'bg-primary-600 hover:bg-primary-500' : 'bg-primary-700/40 cursor-not-allowed'}`}>
            {step === 6 ? 'Save Plan' : 'Next'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AddSemesterPage;
