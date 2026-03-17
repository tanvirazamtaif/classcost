import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown, ChevronUp, AlertCircle, Camera } from 'lucide-react';
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
// BREAKDOWN COMPONENTS
// ═══════════════════════════════════════════════════════════════

const BREAKDOWN_ITEMS = [
  { key: 'tuition', label: 'Tuition' },
  { key: 'lab', label: 'Lab' },
  { key: 'exam', label: 'Exam' },
  { key: 'library', label: 'Library' },
  { key: 'development', label: 'Development' },
  { key: 'session', label: 'Session' },
  { key: 'other', label: 'Other' },
  { key: 'fine', label: 'Fine' },
  { key: 'scholarship', label: 'Scholarship / Waiver', isNegative: true },
];

const PAYMENT_STYLES = [
  { id: 'full', label: 'Full Payment', desc: 'Pay entire semester at once' },
  { id: 'installment', label: 'Installment', desc: 'Split into 2-4 parts' },
  { id: 'partial', label: 'Partial', desc: 'Pay what you can now' },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function sanitizeAmount(value) {
  return value.replace(/[^0-9.]/g, '');
}

function parseAmount(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function getAutoSemester() {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  if (month >= 1 && month <= 4) return `Spring ${year}`;
  if (month >= 5 && month <= 8) return `Summer ${year}`;
  return `Fall ${year}`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const SemesterPaymentPage = () => {
  const { navigate, addToast, theme } = useApp();
  const { institutionName } = useUserProfile();
  const { addSemesterFee, addFee, activeFees } = useEducationFees();
  const d = theme === 'dark';
  const isMobile = isMobileDevice();

  // ═══════════════════════════════════════════════════════════════
  // FORM STATE
  // ═══════════════════════════════════════════════════════════════

  // Section A: Context
  const [universityName, setUniversityName] = useState(institutionName || '');
  const [semesterName, setSemesterName] = useState(getAutoSemester);

  // Section B: Payment Style
  const [paymentStyle, setPaymentStyle] = useState('full');

  // Section C: Payment Info
  const [amountPaid, setAmountPaid] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  // Installment
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installments, setInstallments] = useState([]);

  // Section D: Breakdown
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState(() =>
    Object.fromEntries(BREAKDOWN_ITEMS.map(item => [item.key, '']))
  );

  // Section E: Duplicate detection
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // Receipt scanner
  const [showScanner, setShowScanner] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════

  // Sync institution name when profile loads
  useEffect(() => {
    if (institutionName && !universityName) setUniversityName(institutionName);
  }, [institutionName]);

  // Generate installment schedule
  useEffect(() => {
    if (paymentStyle !== 'installment') return;
    const total = parseAmount(amountPaid);
    if (total <= 0) {
      setInstallments([]);
      return;
    }

    const equalAmount = Math.floor(total / installmentCount);
    const remainder = total - (equalAmount * installmentCount);

    const semester = SEMESTERS.find(s => semesterName?.toLowerCase().includes(s.label.toLowerCase()));
    const baseYear = new Date().getFullYear();

    const newInstallments = Array.from({ length: installmentCount }, (_, i) => {
      let instDate;
      if (semester && semester.defaultMonths[i]) {
        instDate = new Date(baseYear, semester.defaultMonths[i] - 1, 15);
      } else if (dueDate) {
        instDate = new Date(dueDate);
        instDate.setMonth(instDate.getMonth() + i);
      } else {
        instDate = new Date();
        instDate.setMonth(instDate.getMonth() + i);
      }
      return {
        part: i + 1,
        amount: equalAmount + (i === 0 ? remainder : 0),
        dueDate: instDate.toISOString().split('T')[0],
        isPaid: false,
      };
    });
    setInstallments(newInstallments);
  }, [paymentStyle, installmentCount, amountPaid, dueDate, semesterName]);

  // ═══════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════

  const finalAmount = useMemo(() => parseAmount(amountPaid), [amountPaid]);

  const breakdownSum = useMemo(() => {
    return BREAKDOWN_ITEMS.reduce((sum, item) => {
      const val = parseAmount(breakdown[item.key]);
      return item.isNegative ? sum - val : sum + val;
    }, 0);
  }, [breakdown]);

  const hasBreakdownValues = useMemo(() => {
    return BREAKDOWN_ITEMS.some(item => parseAmount(breakdown[item.key]) > 0);
  }, [breakdown]);

  const breakdownItems = useMemo(() => {
    return BREAKDOWN_ITEMS
      .filter(item => parseAmount(breakdown[item.key]) > 0)
      .map(item => ({
        component: item.key,
        amount: parseAmount(breakdown[item.key]),
        isNegative: item.isNegative || false,
      }));
  }, [breakdown]);

  const installmentsTotal = useMemo(() => {
    return installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
  }, [installments]);

  const installmentsMismatch = useMemo(() => {
    if (paymentStyle !== 'installment' || installments.length === 0 || finalAmount <= 0) return false;
    return Math.abs(installmentsTotal - finalAmount) > CONSTANTS.INSTALLMENT_TOLERANCE;
  }, [paymentStyle, installments, installmentsTotal, finalAmount]);

  // Section E: Duplicate detection
  const existingPayment = useMemo(() => {
    if (!semesterName || duplicateDismissed) return null;
    return activeFees.find(fee =>
      (fee.feeType === 'semester_fee' || fee.paymentIntent === 'semester_payment') &&
      fee.semester?.semesterName === semesterName
    );
  }, [activeFees, semesterName, duplicateDismissed]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleAmountChange = (value) => {
    setAmountPaid(sanitizeAmount(value));
    if (errors.amount) setErrors(prev => ({ ...prev, amount: null }));
  };

  const handleBreakdownChange = (key, value) => {
    setBreakdown(prev => ({ ...prev, [key]: sanitizeAmount(value) }));
  };

  const validate = () => {
    const newErrors = {};

    if (finalAmount <= 0) {
      newErrors.amount = 'Amount is required';
    } else if (finalAmount > 50000000) {
      newErrors.amount = 'Amount seems too high';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      haptics.error();
      return;
    }
    haptics.medium();
    setSaving(true);

    try {
      const feeData = {
        feeType: 'semester_fee',
        paymentIntent: 'semester_payment',
        name: universityName || 'Semester Payment',
        icon: '\uD83C\uDF93',
        semesterName,
        paymentPattern: paymentStyle === 'installment' ? 'installment' : 'semester',
        paymentStyle,
        amount: finalAmount,
        totalExpectedAmount: parseAmount(totalCost) || finalAmount,
        dueDate: dueDate || null,
        note: note || null,
        breakdown: breakdownItems.length > 0 ? breakdownItems : null,
        isInstallment: paymentStyle === 'installment',
        installmentData: paymentStyle === 'installment' ? installments : null,
        isPaid: paymentStyle === 'full',
        paidAt: paymentStyle === 'full' ? new Date().toISOString() : null,
        initialPayment: paymentStyle !== 'installment' ? {
          amount: finalAmount,
          method: null,
          paidAt: new Date().toISOString(),
        } : null,
      };

      addSemesterFee(feeData);
      haptics.success();
      setSaved(true);
    } catch (error) {
      console.error('Failed to save payment:', error);
      haptics.error();
      addToast('Failed to save payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setAmountPaid('');
    setTotalCost('');
    setDueDate('');
    setNote('');
    setPaymentStyle('full');
    setInstallmentCount(3);
    setInstallments([]);
    setShowBreakdown(false);
    setBreakdown(Object.fromEntries(BREAKDOWN_ITEMS.map(item => [item.key, ''])));
    setDuplicateDismissed(false);
    setErrors({});
    setSaved(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: SUCCESS STATE
  // ═══════════════════════════════════════════════════════════════

  if (saved) {
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="flex justify-center mb-6">
            <SuccessCheck size={80} />
          </div>
          <h2 className={`text-xl font-bold mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>
            Payment added to {semesterName}
          </h2>
          <p className="text-surface-500 text-sm mb-8">
            {'\u09F3'}{finalAmount.toLocaleString()} recorded successfully
          </p>
          <div className="flex gap-3 w-full max-w-xs mx-auto">
            <GButton
              variant="secondary"
              fullWidth
              onClick={() => navigate('education-fees')}
            >
              View payment
            </GButton>
            <GButton
              fullWidth
              onClick={handleReset}
            >
              Add another
            </GButton>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: FORM
  // ═══════════════════════════════════════════════════════════════

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-28 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => { haptics.light(); navigate('education-fees'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>
            Semester Payment
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">

        {/* ═══ SECTION A: CONTEXT ═══ */}
        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              University Name
              {institutionName ? (
                <span className="text-surface-400 font-normal ml-1">(from profile)</span>
              ) : (
                <span className="text-surface-400 font-normal ml-1">(optional)</span>
              )}
            </label>
            <input
              type="text"
              placeholder="e.g., North South University"
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              className={`w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
                d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
              }`}
            />
          </div>

          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Semester</label>
            <select
              value={semesterName}
              onChange={(e) => { haptics.light(); setSemesterName(e.target.value); }}
              className={`w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 ${
                d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
              }`}
            >
              {SEMESTER_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* ═══ RECEIPT SCANNER (mobile only) ═══ */}
        {isMobile && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowScanner(true)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition ${
              d ? 'bg-gradient-to-r from-primary-900/40 to-surface-800 border border-primary-800/50' : 'bg-gradient-to-r from-primary-50 to-surface-50 border border-primary-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d ? 'bg-primary-600/20' : 'bg-primary-100'}`}>
              <Camera className="w-5 h-5 text-primary-600" />
            </div>
            <div className="text-left flex-1">
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
                Scan fee receipt
              </p>
              <p className="text-xs text-surface-500">
                Take a photo to auto-fill amount
              </p>
            </div>
          </motion.button>
        )}

        {/* ═══ SECTION B: PAYMENT STYLE ═══ */}
        <div>
          <label className={`text-sm font-medium mb-3 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Payment Style</label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_STYLES.map(style => {
              const isSelected = paymentStyle === style.id;
              return (
                <motion.button
                  key={style.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { haptics.light(); setPaymentStyle(style.id); }}
                  className={`relative p-3 rounded-xl text-center transition-all ${
                    isSelected
                      ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : `${d ? 'bg-surface-800 hover:bg-surface-750' : 'bg-surface-100 hover:bg-surface-150'}`
                  }`}
                >
                  <p className={`text-xs font-semibold leading-tight ${
                    isSelected
                      ? 'text-primary-700 dark:text-primary-300'
                      : d ? 'text-surface-300' : 'text-surface-700'
                  }`}>
                    {style.label}
                  </p>
                  <p className={`text-[10px] mt-1 leading-tight ${
                    isSelected ? 'text-primary-500 dark:text-primary-400' : 'text-surface-400'
                  }`}>
                    {style.desc}
                  </p>
                  {isSelected && (
                    <motion.div
                      layoutId="paymentStyleIndicator"
                      className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ═══ SECTION E: DUPLICATE DETECTION ═══ */}
        {existingPayment && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              d ? 'bg-amber-900/15 border-amber-800/40' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${d ? 'text-amber-300' : 'text-amber-800'}`}>
                You may already have a payment for {semesterName}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => navigate('education-fees')}
                  className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                  View previous
                </button>
                <span className="text-surface-400">|</span>
                <button
                  onClick={() => setDuplicateDismissed(true)}
                  className="text-xs font-medium text-surface-500 hover:underline"
                >
                  Continue anyway
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ SECTION C: PAYMENT INFO ═══ */}
        <div className="space-y-4">
          {/* Amount Paid */}
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              Amount Paid *
            </label>
            <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${
              errors.amount ? 'border-danger-500' : `${d ? 'border-surface-800' : 'border-surface-200'} focus-within:border-primary-500`
            } ${d ? 'bg-surface-900' : 'bg-white'}`}>
              <span className="text-xl text-surface-400 mr-2">{'\u09F3'}</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amountPaid}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-danger-500 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors.amount}
              </p>
            )}
          </div>

          {/* Total Semester Cost (for installment & partial) */}
          {(paymentStyle === 'installment' || paymentStyle === 'partial') && (
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Total Semester Cost
                <span className="text-surface-400 font-normal ml-1">(optional)</span>
              </label>
              <div className={`flex items-center border rounded-xl px-4 py-2.5 transition ${
                d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'
              } focus-within:border-primary-500`}>
                <span className="text-surface-400 mr-2">{'\u09F3'}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={totalCost}
                  onChange={(e) => setTotalCost(sanitizeAmount(e.target.value))}
                  className={`bg-transparent outline-none w-full text-sm ${d ? 'text-white' : 'text-surface-900'}`}
                />
              </div>
              {parseAmount(totalCost) > 0 && finalAmount > 0 && (
                <p className="text-xs text-surface-500 mt-1.5">
                  Remaining: {'\u09F3'}{Math.max(0, parseAmount(totalCost) - finalAmount).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Due Date */}
          {(paymentStyle === 'installment' || paymentStyle === 'partial') && (
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Due Date
                <span className="text-surface-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full p-3.5 border rounded-xl text-sm outline-none transition focus:border-primary-500 ${
                  d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
                }`}
              />
            </div>
          )}

          {paymentStyle === 'full' && (
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Due Date
                <span className="text-surface-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full p-3.5 border rounded-xl text-sm outline-none transition focus:border-primary-500 ${
                  d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
                }`}
              />
            </div>
          )}

          {/* Note */}
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              Note
              <span className="text-surface-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Paid via bKash"
              maxLength={100}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
                d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
              }`}
            />
            {note.length > 80 && (
              <p className="text-xs text-surface-400 mt-1 text-right">{note.length}/100</p>
            )}
          </div>
        </div>

        {/* ═══ INSTALLMENT SCHEDULE ═══ */}
        {paymentStyle === 'installment' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`p-4 rounded-xl border space-y-4 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>Number of parts</p>
              <div className="flex gap-2">
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => { haptics.light(); setInstallmentCount(n); }}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                      installmentCount === n ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {installments.length > 0 && (
              <div className="space-y-3">
                {installments.map((inst, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-surface-500 w-14">Part {inst.part}</span>
                    <div className={`flex-1 flex items-center border rounded-lg px-3 py-2 ${d ? 'border-surface-700 bg-surface-800' : 'border-surface-200 bg-surface-50'}`}>
                      <span className="text-surface-400 mr-1 text-sm">{'\u09F3'}</span>
                      <input
                        type="number"
                        value={inst.amount}
                        readOnly
                        className={`w-full bg-transparent outline-none text-sm text-surface-400 ${d ? 'text-surface-400' : 'text-surface-500'}`}
                      />
                    </div>
                    <input
                      type="date"
                      value={inst.dueDate}
                      readOnly
                      className={`w-28 border rounded-lg px-2 py-2 text-xs ${d ? 'border-surface-700 bg-surface-800 text-white' : 'border-surface-200 bg-surface-50 text-surface-900'}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {installments.length > 0 && (
              <div className={`pt-3 border-t ${installmentsMismatch ? 'border-danger-200' : d ? 'border-surface-800' : 'border-surface-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500">Total</span>
                  <span className={`font-medium ${installmentsMismatch ? 'text-danger-500' : d ? 'text-white' : 'text-surface-900'}`}>
                    {'\u09F3'}{installmentsTotal.toLocaleString()}
                  </span>
                </div>
                {installmentsMismatch && (
                  <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Installment total differs from amount paid
                  </p>
                )}
                {!installmentsMismatch && installments.length > 0 && (
                  <p className="text-xs text-success-500 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Amounts match
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ SECTION D: BREAKDOWN ═══ */}
        <div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { haptics.light(); setShowBreakdown(!showBreakdown); }}
            className={`w-full flex items-center justify-between p-4 rounded-xl transition ${
              d ? 'bg-surface-800' : 'bg-surface-100'
            }`}
          >
            <span className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              Add breakdown (optional)
            </span>
            {showBreakdown ? (
              <ChevronUp className="w-4 h-4 text-surface-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-surface-400" />
            )}
          </motion.button>

          {showBreakdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`mt-2 p-4 rounded-xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}
            >
              {BREAKDOWN_ITEMS.map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  <label className={`text-sm w-28 shrink-0 ${
                    item.isNegative
                      ? 'text-success-600 dark:text-success-400'
                      : d ? 'text-surface-300' : 'text-surface-700'
                  }`}>
                    {item.isNegative ? '- ' : ''}{item.label}
                  </label>
                  <div className={`flex-1 flex items-center border rounded-lg px-3 py-2 ${d ? 'border-surface-700 bg-surface-800' : 'border-surface-200 bg-surface-50'}`}>
                    <span className="text-surface-400 mr-1 text-sm">{'\u09F3'}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={breakdown[item.key]}
                      onChange={(e) => handleBreakdownChange(item.key, e.target.value)}
                      className={`w-full bg-transparent outline-none text-sm ${d ? 'text-white' : 'text-surface-900'}`}
                    />
                  </div>
                </div>
              ))}

              {hasBreakdownValues && (
                <div className={`pt-3 border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-500">Breakdown Total</span>
                    <span className={`font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>
                      {'\u09F3'}{breakdownSum.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>

      {/* ═══ SAVE BUTTON ═══ */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-t border-surface-200 dark:border-surface-800">
        <div className="max-w-md mx-auto">
          {finalAmount > 0 && (
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm text-surface-500">
                {paymentStyle === 'full' ? 'Full Payment' : paymentStyle === 'installment' ? 'Installment' : 'Partial Payment'}
              </span>
              <span className="text-lg font-bold text-primary-600">{'\u09F3'}{finalAmount.toLocaleString()}</span>
            </div>
          )}
          <GButton
            fullWidth
            size="lg"
            onClick={handleSave}
            loading={saving}
            disabled={saving || finalAmount <= 0}
          >
            Save Payment
          </GButton>
        </div>
      </div>

      {/* Receipt Scanner (mobile only) */}
      {isMobile && (
        <ReceiptScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onAmountSelect={(amt) => {
            setAmountPaid(String(amt));
            addToast(`Amount set: \u09F3${amt.toLocaleString()}`, 'success');
          }}
        />
      )}
    </motion.div>
  );
};

export default SemesterPaymentPage;
