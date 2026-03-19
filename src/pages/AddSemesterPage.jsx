import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { SEMESTER_NAMES, SEMESTERS } from '../types/educationFees';
import { GButton } from '../components/ui';
import { SuccessCheck } from '../components/ui/SuccessCheck';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { sanitizeAmount, parseAmount } from '../core/transactions';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PAYMENT_STYLES = [
  { id: 'full', label: 'Full Payment', desc: 'Pay entire semester at once', icon: '💳' },
  { id: 'installment', label: 'Installment', desc: 'Split into parts', icon: '📅' },
  { id: 'partial', label: 'Partial', desc: 'Pay what you can now', icon: '✂️' },
];

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

export const AddSemesterPage = () => {
  const { navigate, goBack, addToast, theme } = useApp();
  const { addSemesterFee, activeFees } = useEducationFees();
  const { institutionName } = useUserProfile();
  const d = theme === 'dark';

  // ── State ──────────────────────────────────────────────────
  const [step, setStep] = useState('setup'); // 'setup' | 'payment' | 'success'
  const [semesterName, setSemesterName] = useState(getAutoSemester);
  const [universityName, setUniversityName] = useState(institutionName || '');
  const [paymentStyle, setPaymentStyle] = useState('full');

  // Full / Partial
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Installment
  const [installmentCount, setInstallmentCount] = useState(3);
  const [firstInstallmentAmount, setFirstInstallmentAmount] = useState('');

  // UI
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [createdFeeId, setCreatedFeeId] = useState(null);

  // Sync institution name from profile
  useEffect(() => {
    if (institutionName && !universityName) setUniversityName(institutionName);
  }, [institutionName]);

  // Track the latest fee to get its ID after creation
  const prevFeeCountRef = useRef(activeFees.length);
  useEffect(() => {
    if (step === 'success' && activeFees.length > prevFeeCountRef.current) {
      const latest = activeFees[activeFees.length - 1];
      if (latest) setCreatedFeeId(latest.id);
    }
  }, [activeFees, step]);

  // ── Shared styles ──────────────────────────────────────────

  const inputCls = `w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
    d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
  }`;

  // ── Validation ─────────────────────────────────────────────

  const validateSetup = () => {
    // Setup step doesn't need strict validation, just paymentStyle selection
    return true;
  };

  const validatePayment = () => {
    const errs = {};
    if (paymentStyle === 'installment') {
      if (parseAmount(firstInstallmentAmount) <= 0) errs.amount = 'Enter first installment amount';
    } else {
      if (parseAmount(amount) <= 0) errs.amount = 'Enter a payment amount';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validatePayment()) { haptics.error(); return; }
    haptics.medium();
    setSaving(true);
    prevFeeCountRef.current = activeFees.length;

    try {
      if (paymentStyle === 'installment') {
        const firstAmount = parseAmount(firstInstallmentAmount);
        const installmentData = Array.from({ length: installmentCount }, (_, i) => ({
          part: i + 1,
          amount: i === 0 ? firstAmount : 0,
          dueDate: i === 0 ? new Date().toISOString().split('T')[0] : '',
          isPaid: i === 0,
          paidAt: i === 0 ? new Date().toISOString() : null,
        }));

        const created = addSemesterFee({
          feeType: 'semester_fee',
          paymentIntent: 'semester_payment',
          name: universityName || 'Semester Payment',
          icon: '🎓',
          semesterName,
          paymentPattern: 'installment',
          paymentStyle: 'installment',
          amount: firstAmount,
          totalExpectedAmount: firstAmount,
          isInstallment: true,
          installmentData,
          isPaid: false,
          initialPayment: { amount: firstAmount, method: null, paidAt: new Date().toISOString() },
          note: note || null,
        });
        if (created?.id) setCreatedFeeId(created.id);
      } else {
        const finalAmount = parseAmount(amount);
        const created = addSemesterFee({
          feeType: 'semester_fee',
          paymentIntent: 'semester_payment',
          name: universityName || 'Semester Payment',
          icon: '🎓',
          semesterName,
          paymentPattern: 'semester',
          paymentStyle,
          amount: finalAmount,
          totalExpectedAmount: finalAmount,
          isPaid: paymentStyle === 'full',
          paidAt: paymentStyle === 'full' ? new Date().toISOString() : null,
          initialPayment: { amount: finalAmount, method: null, paidAt: new Date().toISOString() },
          note: note || null,
        });
        if (created?.id) setCreatedFeeId(created.id);
      }
      haptics.success();
      setStep('success');
    } catch (e) {
      console.error('Failed to save semester:', e);
      haptics.error();
      addToast('Failed to save semester', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER: SUCCESS
  // ══════════════════════════════════════════════════════════════

  if (step === 'success') {
    const isInstallment = paymentStyle === 'installment';
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="flex justify-center mb-6"><SuccessCheck size={80} /></div>
          <h2 className={`text-xl font-bold mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>
            {isInstallment ? '1st installment paid!' : 'Semester created!'}
          </h2>
          <p className="text-surface-500 text-sm mb-2">{semesterName}</p>
          <p className={`text-sm mb-8 ${d ? 'text-surface-400' : 'text-surface-500'}`}>
            ৳{(isInstallment ? parseAmount(firstInstallmentAmount) : parseAmount(amount)).toLocaleString()} recorded successfully
          </p>
          <div className="flex gap-3 w-full max-w-xs mx-auto">
            <GButton
              variant="secondary"
              fullWidth
              onClick={() => {
                haptics.light();
                navigate('semester-detail', { params: { semesterId: createdFeeId } });
              }}
            >
              View Semester
            </GButton>
            <GButton
              fullWidth
              onClick={() => { haptics.light(); navigate('semester-landing'); }}
            >
              Done
            </GButton>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER: STEP SETUP
  // ══════════════════════════════════════════════════════════════

  const renderSetup = () => (
    <motion.div
      key="setup"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      {/* University name */}
      <div>
        <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
          University Name
          {institutionName
            ? <span className="text-surface-400 font-normal ml-1">(from profile)</span>
            : <span className="text-surface-400 font-normal ml-1">(optional)</span>
          }
        </label>
        <input
          type="text"
          placeholder="e.g., North South University"
          value={universityName}
          onChange={(e) => setUniversityName(e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Semester dropdown */}
      <div>
        <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Semester</label>
        <select
          value={semesterName}
          onChange={(e) => { haptics.light(); setSemesterName(e.target.value); }}
          className={inputCls}
        >
          {SEMESTER_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Payment style selector */}
      <div>
        <label className={`text-sm font-medium mb-3 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>How will you pay?</label>
        <div className="space-y-2.5">
          {PAYMENT_STYLES.map(s => {
            const sel = paymentStyle === s.id;
            return (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => { haptics.light(); setPaymentStyle(s.id); }}
                className={`w-full flex items-center gap-3.5 p-4 rounded-xl text-left transition-all ${
                  sel
                    ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : d ? 'bg-surface-900 border border-surface-800' : 'bg-white border border-surface-200'
                }`}
              >
                <span className="text-xl">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${sel ? 'text-primary-700 dark:text-primary-300' : d ? 'text-white' : 'text-surface-900'}`}>
                    {s.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${sel ? 'text-primary-500 dark:text-primary-400' : 'text-surface-400'}`}>
                    {s.desc}
                  </p>
                </div>
                {sel && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Next button */}
      <div className="pt-2">
        <GButton
          fullWidth
          size="lg"
          onClick={() => {
            if (validateSetup()) {
              haptics.medium();
              setStep('payment');
              setErrors({});
            }
          }}
        >
          Next
        </GButton>
      </div>
    </motion.div>
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER: STEP PAYMENT
  // ══════════════════════════════════════════════════════════════

  const renderPayment = () => (
    <motion.div
      key="payment"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Context reminder */}
      <div className={`p-3 rounded-xl ${d ? 'bg-surface-900 border border-surface-800' : 'bg-surface-100 border border-surface-200'}`}>
        <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
          {semesterName} {universityName ? `- ${universityName}` : ''}
        </p>
        <p className={`text-xs font-semibold mt-0.5 ${
          paymentStyle === 'full' ? (d ? 'text-emerald-400' : 'text-emerald-600') :
          paymentStyle === 'installment' ? (d ? 'text-primary-400' : 'text-primary-600') :
          d ? 'text-amber-400' : 'text-amber-600'
        }`}>
          {paymentStyle === 'full' ? 'Full Payment' : paymentStyle === 'installment' ? 'Installment Plan' : 'Partial Payment'}
        </p>
      </div>

      {/* ── FULL PAYMENT ── */}
      {paymentStyle === 'full' && (
        <div className="space-y-5">
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount *</label>
            <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${
              errors.amount ? 'border-danger-500' : `${d ? 'border-surface-800' : 'border-surface-200'} focus-within:border-primary-500`
            } ${d ? 'bg-surface-900' : 'bg-white'}`}>
              <span className="text-xl text-surface-400 mr-2">৳</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => { setAmount(sanitizeAmount(e.target.value)); if (errors.amount) setErrors({}); }}
                className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`}
              />
            </div>
            {errors.amount && <p className="text-xs text-danger-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.amount}</p>}
          </div>
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              Note <span className="text-surface-400 font-normal ml-1">(optional)</span>
            </label>
            <input type="text" placeholder="e.g., Paid via bKash" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </div>
          <GButton fullWidth size="lg" onClick={handleSave} loading={saving} disabled={saving}>
            Save Payment
          </GButton>
        </div>
      )}

      {/* ── INSTALLMENT ── */}
      {paymentStyle === 'installment' && (
        <div className="space-y-5">
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>First Installment *</label>
            <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${
              errors.amount ? 'border-danger-500' : `${d ? 'border-surface-800' : 'border-surface-200'} focus-within:border-primary-500`
            } ${d ? 'bg-surface-900' : 'bg-white'}`}>
              <span className="text-xl text-surface-400 mr-2">৳</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={firstInstallmentAmount}
                onChange={(e) => { setFirstInstallmentAmount(sanitizeAmount(e.target.value)); if (errors.amount) setErrors({}); }}
                className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`}
              />
            </div>
            {errors.amount && <p className="text-xs text-danger-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.amount}</p>}
          </div>

          {/* Date — auto-filled, read-only styled */}
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Date</label>
            <div className={`p-3.5 rounded-xl text-sm ${d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-600'}`}>
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* Installment count selector */}
          <div>
            <label className={`text-sm font-medium mb-3 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Total Installments</label>
            <div className="flex gap-2">
              {[2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => { haptics.light(); setInstallmentCount(n); }}
                  className={`flex-1 h-12 rounded-xl text-sm font-semibold transition ${
                    installmentCount === n
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                      : d ? 'bg-surface-800 text-surface-300 border border-surface-700' : 'bg-surface-100 text-surface-700 border border-surface-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className={`p-3 rounded-xl text-xs leading-relaxed ${d ? 'bg-primary-900/15 text-primary-300 border border-primary-800/30' : 'bg-primary-50 text-primary-700 border border-primary-200'}`}>
            First installment will be marked as paid. You can set up remaining installments later.
          </div>

          {/* Note */}
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              Note <span className="text-surface-400 font-normal ml-1">(optional)</span>
            </label>
            <input type="text" placeholder="e.g., Paid via bKash" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </div>

          <GButton fullWidth size="lg" onClick={handleSave} loading={saving} disabled={saving}>
            Save & Pay 1st Installment
          </GButton>
        </div>
      )}

      {/* ── PARTIAL ── */}
      {paymentStyle === 'partial' && (
        <div className="space-y-5">
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount *</label>
            <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${
              errors.amount ? 'border-danger-500' : `${d ? 'border-surface-800' : 'border-surface-200'} focus-within:border-primary-500`
            } ${d ? 'bg-surface-900' : 'bg-white'}`}>
              <span className="text-xl text-surface-400 mr-2">৳</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => { setAmount(sanitizeAmount(e.target.value)); if (errors.amount) setErrors({}); }}
                className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`}
              />
            </div>
            {errors.amount && <p className="text-xs text-danger-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.amount}</p>}
          </div>
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              Note <span className="text-surface-400 font-normal ml-1">(optional)</span>
            </label>
            <input type="text" placeholder="e.g., Paid via bKash" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </div>
          <GButton fullWidth size="lg" onClick={handleSave} loading={saving} disabled={saving}>
            Save Payment
          </GButton>
        </div>
      )}

      {/* Back to setup */}
      <button
        onClick={() => { haptics.light(); setStep('setup'); setErrors({}); }}
        className={`w-full text-center text-sm py-2 ${d ? 'text-surface-400 hover:text-surface-300' : 'text-surface-500 hover:text-surface-700'} transition`}
      >
        Back to setup
      </button>
    </motion.div>
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER: MAIN
  // ══════════════════════════════════════════════════════════════

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-28 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => {
              haptics.light();
              if (step === 'payment') { setStep('setup'); setErrors({}); }
              else navigate('semester-landing');
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <div>
            <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Add Semester</h1>
            <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
              {step === 'setup' ? 'Step 1 of 2 — Setup' : 'Step 2 of 2 — Payment'}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className={`h-0.5 ${d ? 'bg-surface-800' : 'bg-surface-200'}`}>
          <motion.div
            className="h-full bg-primary-500"
            initial={{ width: '50%' }}
            animate={{ width: step === 'setup' ? '50%' : '100%' }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <AnimatePresence mode="wait">
          {step === 'setup' && renderSetup()}
          {step === 'payment' && renderPayment()}
        </AnimatePresence>
      </main>
    </motion.div>
  );
};

export default AddSemesterPage;
