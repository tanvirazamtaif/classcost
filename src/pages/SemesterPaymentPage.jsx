import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, AlertCircle, Camera } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { SEMESTER_NAMES, SEMESTERS, CONSTANTS } from '../types/educationFees';
import { GButton } from '../components/ui';
import { SuccessCheck } from '../components/ui/SuccessCheck';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { ReceiptScanner, isMobileDevice } from '../components/education/ReceiptScanner';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const FEE_COMPONENTS = [
  { key: 'tuition', label: 'Tuition', icon: '📘' },
  { key: 'lab', label: 'Lab', icon: '🔬' },
  { key: 'exam', label: 'Exam', icon: '📝' },
  { key: 'library', label: 'Library', icon: '📚' },
  { key: 'development', label: 'Development', icon: '🏗️' },
  { key: 'session', label: 'Session', icon: '📅' },
  { key: 'other', label: 'Other', icon: '📦' },
  { key: 'fine', label: 'Fine', icon: '⚠️' },
  { key: 'scholarship', label: 'Scholarship / Waiver', icon: '🎓', isNegative: true },
];

const PAYMENT_STYLES = [
  { id: 'full', label: 'Full Payment', desc: 'Pay entire semester' },
  { id: 'installment', label: 'Installment', desc: 'Split into parts' },
  { id: 'partial', label: 'Partial', desc: 'Pay what you can' },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function sanitize(value) {
  return value.replace(/[^0-9.]/g, '');
}

function toNum(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function getAutoSemester() {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  if (m >= 1 && m <= 4) return `Spring ${y}`;
  if (m >= 5 && m <= 8) return `Summer ${y}`;
  return `Fall ${y}`;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const SemesterPaymentPage = () => {
  const { navigate, addToast, theme } = useApp();
  const { institutionName } = useUserProfile();
  const { addSemesterFee, activeFees } = useEducationFees();
  const d = theme === 'dark';
  const isMobile = isMobileDevice();

  // ── State ──────────────────────────────────────────────────

  // Context
  const [universityName, setUniversityName] = useState(institutionName || '');
  const [semesterName, setSemesterName] = useState(getAutoSemester);

  // Payment style
  const [paymentStyle, setPaymentStyle] = useState('full');

  // ENTRY MODE — the core of this redesign
  const [entryMode, setEntryMode] = useState('total'); // 'total' | 'breakdown'

  // Total mode state
  const [amountPaid, setAmountPaid] = useState('');
  const [includedTags, setIncludedTags] = useState(new Set());

  // Breakdown mode state
  const [selectedComponents, setSelectedComponents] = useState(new Set());
  const [componentAmounts, setComponentAmounts] = useState({});

  // Shared
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installments, setInstallments] = useState([]);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Derived ────────────────────────────────────────────────

  // The final amount depends on entry mode
  const finalAmount = useMemo(() => {
    if (entryMode === 'total') return toNum(amountPaid);
    // Breakdown mode: sum selected component amounts
    return FEE_COMPONENTS.reduce((sum, item) => {
      if (!selectedComponents.has(item.key)) return sum;
      const val = toNum(componentAmounts[item.key] || '');
      return item.isNegative ? sum - val : sum + val;
    }, 0);
  }, [entryMode, amountPaid, selectedComponents, componentAmounts]);

  const breakdownItems = useMemo(() => {
    if (entryMode === 'total') {
      // Tags only, no amounts
      return Array.from(includedTags).map(key => ({
        component: key,
        amount: null,
        isNegative: FEE_COMPONENTS.find(c => c.key === key)?.isNegative || false,
      }));
    }
    // Breakdown mode: include amounts
    return FEE_COMPONENTS
      .filter(item => selectedComponents.has(item.key) && toNum(componentAmounts[item.key] || '') > 0)
      .map(item => ({
        component: item.key,
        amount: toNum(componentAmounts[item.key] || ''),
        isNegative: item.isNegative || false,
      }));
  }, [entryMode, includedTags, selectedComponents, componentAmounts]);

  const installmentsTotal = useMemo(() => {
    return installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
  }, [installments]);

  const existingPayment = useMemo(() => {
    if (!semesterName || duplicateDismissed) return null;
    return activeFees.find(fee =>
      (fee.feeType === 'semester_fee' || fee.paymentIntent === 'semester_payment') &&
      fee.semester?.semesterName === semesterName
    );
  }, [activeFees, semesterName, duplicateDismissed]);

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => {
    if (institutionName && !universityName) setUniversityName(institutionName);
  }, [institutionName]);

  // Generate installment schedule from finalAmount
  useEffect(() => {
    if (paymentStyle !== 'installment' || finalAmount <= 0) {
      setInstallments([]);
      return;
    }
    const eq = Math.floor(finalAmount / installmentCount);
    const rem = finalAmount - (eq * installmentCount);
    const sem = SEMESTERS.find(s => semesterName?.toLowerCase().includes(s.label.toLowerCase()));
    const yr = new Date().getFullYear();

    setInstallments(Array.from({ length: installmentCount }, (_, i) => {
      let dt;
      if (sem && sem.defaultMonths[i]) dt = new Date(yr, sem.defaultMonths[i] - 1, 15);
      else if (dueDate) { dt = new Date(dueDate); dt.setMonth(dt.getMonth() + i); }
      else { dt = new Date(); dt.setMonth(dt.getMonth() + i); }
      return { part: i + 1, amount: eq + (i === 0 ? rem : 0), dueDate: dt.toISOString().split('T')[0], isPaid: false };
    }));
  }, [paymentStyle, installmentCount, finalAmount, dueDate, semesterName]);

  // ── Handlers ───────────────────────────────────────────────

  const switchEntryMode = (mode) => {
    if (mode === entryMode) return;
    haptics.medium();
    setEntryMode(mode);
    setErrors({});
    // Clean reset when switching to prevent stale data
    if (mode === 'total') {
      setSelectedComponents(new Set());
      setComponentAmounts({});
    } else {
      setAmountPaid('');
      setIncludedTags(new Set());
    }
  };

  const toggleIncludedTag = (key) => {
    haptics.light();
    setIncludedTags(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleBreakdownComponent = (key) => {
    haptics.light();
    setSelectedComponents(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setComponentAmounts(a => { const { [key]: _, ...rest } = a; return rest; });
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const validate = () => {
    const errs = {};
    if (finalAmount <= 0) errs.amount = 'Enter a payment amount';
    else if (finalAmount > 50000000) errs.amount = 'Amount seems too high';
    if (entryMode === 'breakdown' && selectedComponents.size === 0) errs.amount = 'Select at least one component';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { haptics.error(); return; }
    haptics.medium();
    setSaving(true);
    try {
      addSemesterFee({
        feeType: 'semester_fee',
        paymentIntent: 'semester_payment',
        name: universityName || 'Semester Payment',
        icon: '🎓',
        semesterName,
        paymentPattern: paymentStyle === 'installment' ? 'installment' : 'semester',
        paymentStyle,
        entryMode,
        amount: finalAmount,
        totalExpectedAmount: finalAmount,
        dueDate: dueDate || null,
        note: note || null,
        breakdown: breakdownItems.length > 0 ? breakdownItems : null,
        isInstallment: paymentStyle === 'installment',
        installmentData: paymentStyle === 'installment' ? installments : null,
        isPaid: paymentStyle === 'full',
        paidAt: paymentStyle === 'full' ? new Date().toISOString() : null,
        initialPayment: paymentStyle !== 'installment' ? { amount: finalAmount, method: null, paidAt: new Date().toISOString() } : null,
      });
      haptics.success();
      setSaved(true);
    } catch (e) {
      console.error('Failed to save:', e);
      haptics.error();
      addToast('Failed to save payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setAmountPaid(''); setDueDate(''); setNote('');
    setPaymentStyle('full'); setEntryMode('total');
    setIncludedTags(new Set()); setSelectedComponents(new Set()); setComponentAmounts({});
    setInstallmentCount(3); setInstallments([]);
    setDuplicateDismissed(false); setErrors({}); setSaved(false);
  };

  // ── Shared styles ──────────────────────────────────────────

  const inputCls = `w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
    d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
  }`;

  // ══════════════════════════════════════════════════════════════
  // RENDER: SUCCESS
  // ══════════════════════════════════════════════════════════════

  if (saved) {
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="flex justify-center mb-6"><SuccessCheck size={80} /></div>
          <h2 className={`text-xl font-bold mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>Payment added to {semesterName}</h2>
          <p className="text-surface-500 text-sm mb-8">৳{finalAmount.toLocaleString()} recorded successfully</p>
          <div className="flex gap-3 w-full max-w-xs mx-auto">
            <GButton variant="secondary" fullWidth onClick={() => navigate('education-fees')}>View payment</GButton>
            <GButton fullWidth onClick={handleReset}>Add another</GButton>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER: FORM
  // ══════════════════════════════════════════════════════════════

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-28 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => { haptics.light(); navigate('education-fees'); }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Semester Payment</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">

        {/* ══════════════════════════════════════════════════════════
             STEP 1: CONTEXT (always visible)
             ══════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              University Name
              {institutionName
                ? <span className="text-surface-400 font-normal ml-1">(from profile)</span>
                : <span className="text-surface-400 font-normal ml-1">(optional)</span>
              }
            </label>
            <input type="text" placeholder="e.g., North South University" value={universityName} onChange={(e) => setUniversityName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Semester</label>
            <select value={semesterName} onChange={(e) => { haptics.light(); setSemesterName(e.target.value); }} className={inputCls}>
              {SEMESTER_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Duplicate detection */}
        {existingPayment && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${d ? 'bg-amber-900/15 border-amber-800/40' : 'bg-amber-50 border-amber-200'}`}>
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${d ? 'text-amber-300' : 'text-amber-800'}`}>You may already have a payment for {semesterName}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => navigate('education-fees')} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">View previous</button>
                <span className="text-surface-400">|</span>
                <button onClick={() => setDuplicateDismissed(true)} className="text-xs font-medium text-surface-500 hover:underline">Continue anyway</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
             STEP 2: PAYMENT STYLE (always visible)
             ══════════════════════════════════════════════════════════ */}
        <div>
          <label className={`text-sm font-medium mb-3 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Payment Style</label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_STYLES.map(s => {
              const sel = paymentStyle === s.id;
              return (
                <motion.button key={s.id} whileTap={{ scale: 0.95 }} onClick={() => { haptics.light(); setPaymentStyle(s.id); }}
                  className={`relative p-3 rounded-xl text-center transition-all ${sel ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : d ? 'bg-surface-800' : 'bg-surface-100'}`}>
                  <p className={`text-xs font-semibold leading-tight ${sel ? 'text-primary-700 dark:text-primary-300' : d ? 'text-surface-300' : 'text-surface-700'}`}>{s.label}</p>
                  <p className={`text-[10px] mt-1 leading-tight ${sel ? 'text-primary-500 dark:text-primary-400' : 'text-surface-400'}`}>{s.desc}</p>
                  {sel && <motion.div layoutId="psInd" className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></motion.div>}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
             STEP 3: ENTRY METHOD (always visible)
             ══════════════════════════════════════════════════════════ */}
        <div>
          <label className={`text-sm font-medium mb-3 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>How do you want to enter?</label>
          <div className={`flex rounded-xl overflow-hidden border ${d ? 'border-surface-700' : 'border-surface-200'}`}>
            {[
              { id: 'total', label: 'Total Amount', desc: 'Enter one amount' },
              { id: 'breakdown', label: 'Detailed Breakdown', desc: 'Enter per component' },
            ].map(mode => {
              const sel = entryMode === mode.id;
              return (
                <button key={mode.id} onClick={() => switchEntryMode(mode.id)}
                  className={`flex-1 py-3.5 px-3 text-center transition-all ${
                    sel ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-400 hover:bg-surface-750' : 'bg-surface-50 text-surface-600 hover:bg-surface-100'
                  }`}>
                  <p className="text-xs font-semibold">{mode.label}</p>
                  <p className={`text-[10px] mt-0.5 ${sel ? 'text-white/70' : 'text-surface-400'}`}>{mode.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
             STEP 4: AMOUNT SOURCE (conditional on entry method)
             ══════════════════════════════════════════════════════════ */}

        {/* ── TOTAL ENTRY ── */}
        {entryMode === 'total' && (
          <motion.div key="total-mode" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Receipt scanner (mobile, total mode only) */}
            {isMobile && (
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowScanner(true)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition ${
                  d ? 'bg-gradient-to-r from-primary-900/40 to-surface-800 border border-primary-800/50' : 'bg-gradient-to-r from-primary-50 to-surface-50 border border-primary-200'
                }`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${d ? 'bg-primary-600/20' : 'bg-primary-100'}`}>
                  <Camera className="w-4 h-4 text-primary-600" />
                </div>
                <div className="text-left flex-1">
                  <p className={`text-xs font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Scan fee receipt</p>
                  <p className="text-[10px] text-surface-500">Auto-fill from photo</p>
                </div>
              </motion.button>
            )}

            {/* Amount input */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount Paid *</label>
              <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${
                errors.amount ? 'border-danger-500' : `${d ? 'border-surface-800' : 'border-surface-200'} focus-within:border-primary-500`
              } ${d ? 'bg-surface-900' : 'bg-white'}`}>
                <span className="text-xl text-surface-400 mr-2">৳</span>
                <input type="text" inputMode="decimal" placeholder="0" value={amountPaid}
                  onChange={(e) => { setAmountPaid(sanitize(e.target.value)); if (errors.amount) setErrors({}); }}
                  className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`} />
              </div>
              {errors.amount && <p className="text-xs text-danger-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.amount}</p>}
            </div>

            {/* What's included — tags only */}
            <div>
              <label className={`text-sm font-medium mb-3 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                What's included?
                <span className="text-surface-400 font-normal ml-1">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {FEE_COMPONENTS.map(item => {
                  const active = includedTags.has(item.key);
                  return (
                    <motion.button key={item.key} whileTap={{ scale: 0.95 }} onClick={() => toggleIncludedTag(item.key)}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? item.isNegative
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-400 dark:ring-emerald-600'
                            : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-400 dark:ring-primary-600'
                          : d ? 'bg-surface-800 text-surface-400 hover:bg-surface-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                      }`}>
                      {active && <Check className="w-3.5 h-3.5" />}
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── BREAKDOWN ENTRY ── */}
        {entryMode === 'breakdown' && (
          <motion.div key="breakdown-mode" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Component selector */}
            <div>
              <label className={`text-sm font-medium mb-3 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Select fee components</label>
              <div className="flex flex-wrap gap-2">
                {FEE_COMPONENTS.map(item => {
                  const active = selectedComponents.has(item.key);
                  return (
                    <motion.button key={item.key} whileTap={{ scale: 0.95 }} onClick={() => toggleBreakdownComponent(item.key)}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? item.isNegative
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-400 dark:ring-emerald-600'
                            : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-400 dark:ring-primary-600'
                          : d ? 'bg-surface-800 text-surface-400 hover:bg-surface-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                      }`}>
                      {active && <Check className="w-3.5 h-3.5" />}
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
              {errors.amount && selectedComponents.size === 0 && (
                <p className="text-xs text-danger-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.amount}</p>
              )}
            </div>

            {/* Amount inputs — only for selected components */}
            {selectedComponents.size > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`p-4 rounded-xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
                {FEE_COMPONENTS.filter(item => selectedComponents.has(item.key)).map(item => (
                  <div key={item.key} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-28 shrink-0">
                      <span className="text-sm">{item.icon}</span>
                      <label className={`text-sm ${item.isNegative ? 'text-emerald-600 dark:text-emerald-400' : d ? 'text-surface-300' : 'text-surface-700'}`}>{item.label}</label>
                    </div>
                    <div className={`flex-1 flex items-center border rounded-lg px-3 py-2.5 transition focus-within:border-primary-500 ${d ? 'border-surface-700 bg-surface-800' : 'border-surface-200 bg-surface-50'}`}>
                      <span className="text-surface-400 mr-1 text-sm">৳</span>
                      <input type="text" inputMode="decimal" placeholder="0"
                        value={componentAmounts[item.key] || ''}
                        onChange={(e) => { setComponentAmounts(prev => ({ ...prev, [item.key]: sanitize(e.target.value) })); if (errors.amount) setErrors({}); }}
                        className={`w-full bg-transparent outline-none text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`} />
                    </div>
                  </div>
                ))}
                <div className={`pt-3 border-t ${d ? 'border-surface-700' : 'border-surface-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>Calculated Total</span>
                    <span className={`text-xl font-bold ${finalAmount > 0 ? 'text-primary-600' : 'text-surface-400'}`}>৳{finalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {errors.amount && selectedComponents.size > 0 && finalAmount <= 0 && (
              <p className="text-xs text-danger-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.amount}</p>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
             STEP 5: INSTALLMENT SPLIT (only after total is resolved)
             ══════════════════════════════════════════════════════════ */}
        {paymentStyle === 'installment' && finalAmount > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border space-y-4 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Split ৳{finalAmount.toLocaleString()} into parts</p>
                <p className="text-xs text-surface-500 mt-0.5">Choose number of installments</p>
              </div>
              <div className="flex gap-2">
                {[2, 3, 4].map(n => (
                  <button key={n} onClick={() => { haptics.light(); setInstallmentCount(n); }}
                    className={`w-11 h-11 rounded-xl text-sm font-semibold transition ${installmentCount === n ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'}`}>{n}</button>
                ))}
              </div>
            </div>

            {installments.length > 0 && (
              <>
                <div className={`h-px ${d ? 'bg-surface-800' : 'bg-surface-200'}`} />
                <div className="space-y-2.5">
                  {installments.map((inst, i) => (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl ${d ? 'bg-surface-800/50' : 'bg-surface-50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${d ? 'bg-surface-700 text-surface-300' : 'bg-surface-200 text-surface-600'}`}>{inst.part}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>৳{inst.amount.toLocaleString()}</p>
                      </div>
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => {
                          setInstallments(prev => prev.map((item, idx) =>
                            idx === i ? { ...item, dueDate: e.target.value } : item
                          ));
                        }}
                        className={`w-32 border rounded-lg px-2 py-1.5 text-xs shrink-0 ${d ? 'border-surface-700 bg-surface-800 text-white' : 'border-surface-200 bg-surface-50 text-surface-900'}`}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
             STEP 6: META (only after total is resolved)
             ══════════════════════════════════════════════════════════ */}
        {finalAmount > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {paymentStyle !== 'installment' && (
              <div>
                <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                  Due Date <span className="text-surface-400 font-normal ml-1">(optional)</span>
                </label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </div>
            )}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Note <span className="text-surface-400 font-normal ml-1">(optional)</span>
              </label>
              <input type="text" placeholder="e.g., Paid via bKash" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </div>
          </motion.div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════
           SAVE BUTTON (only after total is resolved)
           ══════════════════════════════════════════════════════════ */}
      {finalAmount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-t border-surface-200 dark:border-surface-800">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <span className="text-sm text-surface-500">
                  {paymentStyle === 'full' ? 'Full Payment' : paymentStyle === 'installment' ? `${installmentCount} Installments` : 'Partial Payment'}
                </span>
                <span className="text-xs text-surface-400 ml-1.5">· {entryMode === 'breakdown' ? 'breakdown' : 'total'}</span>
              </div>
              <span className="text-lg font-bold text-primary-600">৳{finalAmount.toLocaleString()}</span>
            </div>
            <GButton fullWidth size="lg" onClick={handleSave} loading={saving} disabled={saving}>Save Payment</GButton>
          </div>
        </div>
      )}

      {/* Receipt Scanner */}
      {isMobile && (
        <ReceiptScanner isOpen={showScanner} onClose={() => setShowScanner(false)}
          onAmountSelect={(amt) => { setAmountPaid(String(amt)); addToast(`Amount set: ৳${amt.toLocaleString()}`, 'success'); }} />
      )}
    </motion.div>
  );
};

export default SemesterPaymentPage;
