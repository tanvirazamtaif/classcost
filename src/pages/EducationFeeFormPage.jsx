import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Bell, Calculator, Plus, Check, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { EDUCATION_FEE_TYPES, PAYMENT_PATTERNS, PAYMENT_METHODS, SEMESTER_NAMES, SEMESTERS, MONTHS, CONSTANTS, getFeeTypeConfig } from '../types/educationFees';
import { validateInstallmentsTotal, calculatePerCreditTotal } from '../types/educationFeeSchema';
import { GButton } from '../components/ui';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export const EducationFeeFormPage = () => {
  const { navigate, addToast, routeParams, theme } = useApp();
  const { institutionName } = useUserProfile();
  const { addFee, addSemesterFee, savedCreditRates, setSavedCreditRates } = useEducationFees();
  const d = theme === 'dark';

  const feeType = routeParams?.feeType;
  const typeConfig = feeType?.id ? (getFeeTypeConfig(feeType.id) || feeType) : feeType;

  // ═══════════════════════════════════════════════════════════════
  // FORM STATE
  // ═══════════════════════════════════════════════════════════════

  const isTutor = typeConfig?.id === 'private_tutor';
  const [name, setName] = useState(isTutor ? '' : institutionName);
  const [amount, setAmount] = useState('');

  // Private Tutor specific
  const [tutorName, setTutorName] = useState('');
  const [tutorSubject, setTutorSubject] = useState('');

  // Recurring
  const [dueDay, setDueDay] = useState(CONSTANTS.DEFAULT_DUE_DAY);
  const [reminderDays, setReminderDays] = useState(CONSTANTS.DEFAULT_REMINDER_DAYS);
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  // Per-class
  const [paymentMode, setPaymentMode] = useState('monthly');
  const [ratePerClass, setRatePerClass] = useState('');

  // Semester
  // Auto-select current semester based on date
  const [semesterName, setSemesterName] = useState(() => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    if (month >= 1 && month <= 4) return `Spring ${year}`;
    if (month >= 5 && month <= 8) return `Summer ${year}`;
    return `Fall ${year}`;
  });
  const [dueDate, setDueDate] = useState('');

  // Per-credit
  const [usePerCredit, setUsePerCredit] = useState(false);
  const [regularRate, setRegularRate] = useState(String(savedCreditRates.regular || CONSTANTS.DEFAULT_CREDIT_RATE));
  const [regularCredits, setRegularCredits] = useState('');
  const [labRate, setLabRate] = useState(String(savedCreditRates.lab || CONSTANTS.DEFAULT_LAB_RATE));
  const [labCredits, setLabCredits] = useState('');
  const [showLabCredits, setShowLabCredits] = useState(false);

  // Installments
  const [useInstallments, setUseInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installments, setInstallments] = useState([]);
  const [customInstallmentAmounts, setCustomInstallmentAmounts] = useState(false);

  // Yearly
  const [dueMonth, setDueMonth] = useState(1);

  // One-time
  const [isPaid, setIsPaid] = useState(false);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState(null);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════

  const isRecurring = typeConfig?.defaultPattern === PAYMENT_PATTERNS.RECURRING;
  const isSemester = typeConfig?.defaultPattern === PAYMENT_PATTERNS.SEMESTER;
  const isYearly = typeConfig?.defaultPattern === PAYMENT_PATTERNS.YEARLY;
  const isOneTime = typeConfig?.defaultPattern === PAYMENT_PATTERNS.ONE_TIME;
  const supportsPerCredit = typeConfig?.supportsPerCredit;
  const supportsInstallments = typeConfig?.supportsInstallments;
  const supportsPerClass = typeConfig?.allowedPatterns?.includes(PAYMENT_PATTERNS.PER_CLASS);

  const perCreditTotal = useMemo(() => {
    if (!usePerCredit) return 0;
    return calculatePerCreditTotal({
      regular: { rate: Number(regularRate) || 0, credits: Number(regularCredits) || 0 },
      lab: showLabCredits ? { rate: Number(labRate) || 0, credits: Number(labCredits) || 0 } : null,
    });
  }, [usePerCredit, regularRate, regularCredits, labRate, labCredits, showLabCredits]);

  const finalAmount = useMemo(() => {
    if (usePerCredit) return perCreditTotal;
    if (paymentMode === 'per_class') return Number(ratePerClass) || 0;
    return Number(amount) || 0;
  }, [usePerCredit, perCreditTotal, paymentMode, ratePerClass, amount]);

  const installmentsTotal = useMemo(() => {
    return installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
  }, [installments]);

  const installmentsMismatch = useInstallments && customInstallmentAmounts &&
    !validateInstallmentsTotal(installments, finalAmount);

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════

  // Sync institution name when user data loads after mount
  useEffect(() => {
    if (institutionName && !name) setName(institutionName);
  }, [institutionName]);

  useEffect(() => {
    if (!useInstallments || customInstallmentAmounts) return;
    const total = finalAmount;
    if (total <= 0) return;

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
        isPaid: i === 0 && alreadyPaid,
      };
    });
    setInstallments(newInstallments);
  }, [useInstallments, installmentCount, finalAmount, dueDate, alreadyPaid, semesterName, customInstallmentAmounts]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const updateInstallment = (index, field, value) => {
    setInstallments(prev => prev.map((inst, i) =>
      i === index ? { ...inst, [field]: field === 'amount' ? Number(value) || 0 : value } : inst
    ));
  };

  const validate = () => {
    const newErrors = {};
    if (finalAmount <= 0) newErrors.amount = 'Amount is required';
    if (finalAmount > CONSTANTS.MAX_FEE_AMOUNT) newErrors.amount = 'Amount seems too high';
    if (useInstallments && installmentsMismatch) newErrors.installments = `Total mismatch: ৳${installmentsTotal.toLocaleString()} ≠ ৳${finalAmount.toLocaleString()}`;
    if ((isSemester || isOneTime) && !dueDate && !useInstallments) newErrors.dueDate = 'Due date is required';
    if (isTutor && !tutorName.trim()) newErrors.tutorName = "Tutor's name is required";
    if (isTutor && !tutorSubject.trim()) newErrors.subject = 'Subject is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { haptics.error(); return; }
    haptics.success();
    setSaving(true);

    try {
      if (usePerCredit) setSavedCreditRates({ regular: Number(regularRate), lab: Number(labRate) });

      let paymentPattern = typeConfig.defaultPattern;
      if (paymentMode === 'per_class') paymentPattern = PAYMENT_PATTERNS.PER_CLASS;
      if (useInstallments) paymentPattern = PAYMENT_PATTERNS.INSTALLMENT;

      const feeData = {
        feeType: typeConfig.id,
        name: isTutor ? `${tutorName} (${tutorSubject})` : (name || typeConfig.label),
        icon: typeConfig.icon,
        ...(isTutor ? { tutorName, subject: tutorSubject } : {}),
        paymentPattern,
        amount: finalAmount,
        dueDay, reminderDays,
        alreadyPaidThisMonth: alreadyPaid && !useInstallments,
        ratePerClass: paymentMode === 'per_class' ? Number(ratePerClass) : null,
        semesterName, dueDate,
        isPerCredit: usePerCredit,
        creditBreakdown: usePerCredit ? {
          regular: { rate: Number(regularRate), credits: Number(regularCredits), subtotal: Number(regularRate) * Number(regularCredits) },
          lab: showLabCredits ? { rate: Number(labRate), credits: Number(labCredits), subtotal: Number(labRate) * Number(labCredits) } : null,
        } : null,
        isInstallment: useInstallments,
        installmentData: useInstallments ? installments : null,
        dueMonth,
        isPaid, paidAt: isPaid ? paidDate : null,
        initialPayment: (alreadyPaid || isPaid) && !useInstallments ? {
          amount: finalAmount, method: paymentMethod,
          paidAt: isPaid ? paidDate : new Date().toISOString(),
        } : null,
      };

      if (useInstallments || isSemester) {
        addSemesterFee(feeData);
      } else {
        addFee(feeData);
      }

      addToast(`${typeConfig.label} saved`, 'success');
      navigate('dashboard');
    } catch (error) {
      console.error('Failed to save fee:', error);
      haptics.error();
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  if (!typeConfig) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <div className="text-center">
          <p className="text-surface-500 mb-4">Fee type not found</p>
          <GButton onClick={() => navigate('education-fees')}>Go back</GButton>
        </div>
      </div>
    );
  }

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
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{typeConfig.label}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Icon & Description */}
        <div className="text-center py-4">
          <span className="text-5xl">{typeConfig.icon}</span>
          <p className="text-sm text-surface-500 mt-2">{typeConfig.desc}</p>
        </div>

        {/* ═══ NAME / TUTOR FIELDS ═══ */}
        {isTutor ? (
          <>
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Tutor's Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Mr. Rahman, Fatema Apa"
                value={tutorName}
                onChange={(e) => { setTutorName(e.target.value); setName(e.target.value); }}
                className={`w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
                  d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
                }`}
              />
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Subject *
              </label>
              <input
                type="text"
                placeholder="e.g., Math, Physics, English"
                value={tutorSubject}
                onChange={(e) => setTutorSubject(e.target.value)}
                className={`w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
                  d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
                }`}
              />
            </div>
          </>
        ) : (
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              {isRecurring ? 'School/Institution Name' : isSemester ? 'University Name' : 'Name'}
              {institutionName ? (
                <span className="text-surface-400 font-normal ml-1">(from profile)</span>
              ) : (
                <span className="text-surface-400 font-normal ml-1">(optional)</span>
              )}
            </label>
            <input
              type="text"
              placeholder={`e.g., ${isRecurring ? 'Dhaka College' : isSemester ? 'North South University' : 'Enter name'}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
                d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
              }`}
            />
          </div>
        )}

        {/* ═══ SEMESTER NAME ═══ */}
        {isSemester && (
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Semester</label>
            <select
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              className={`w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 ${
                d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
              }`}
            >
              {SEMESTER_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {/* ═══ PER-CLASS TOGGLE ═══ */}
        {supportsPerClass && (
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Payment Type</label>
            <div className="flex gap-2">
              {[
                { id: 'monthly', label: '📅 Monthly' },
                { id: 'per_class', label: '🎯 Per Class' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { haptics.light(); setPaymentMode(opt.id); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
                    paymentMode === opt.id ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PER-CREDIT TOGGLE ═══ */}
        {supportsPerCredit && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { haptics.light(); setUsePerCredit(!usePerCredit); }}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition ${
              usePerCredit
                ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                : `${d ? 'bg-surface-800' : 'bg-surface-100'} border-2 border-transparent`
            }`}
          >
            <Calculator className={`w-5 h-5 ${usePerCredit ? 'text-primary-600' : 'text-surface-400'}`} />
            <div className="text-left flex-1">
              <p className={`text-sm font-medium ${usePerCredit ? 'text-primary-700 dark:text-primary-300' : d ? 'text-surface-300' : 'text-surface-700'}`}>
                Calculate by credits
              </p>
              <p className="text-xs text-surface-500">For per-credit universities</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              usePerCredit ? 'border-primary-600 bg-primary-600' : 'border-surface-300'
            }`}>
              {usePerCredit && <Check className="w-3 h-3 text-white" />}
            </div>
          </motion.button>
        )}

        {/* ═══ PER-CREDIT CALCULATOR ═══ */}
        {usePerCredit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`p-4 rounded-xl border space-y-4 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}
          >
            <div>
              <p className={`text-sm font-medium mb-2 ${d ? 'text-surface-300' : 'text-surface-700'}`}>Regular Credits</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-surface-500 mb-1 block">Rate/credit</label>
                  <div className={`flex items-center border rounded-lg px-3 py-2.5 ${d ? 'border-surface-700 bg-surface-800' : 'border-surface-200 bg-surface-50'}`}>
                    <span className="text-surface-400 mr-1">৳</span>
                    <input type="number" value={regularRate} onChange={(e) => setRegularRate(e.target.value)}
                      className={`w-full bg-transparent outline-none text-sm ${d ? 'text-white' : 'text-surface-900'}`} />
                  </div>
                </div>
                <div className="w-24">
                  <label className="text-xs text-surface-500 mb-1 block">Credits</label>
                  <input type="number" value={regularCredits} onChange={(e) => setRegularCredits(e.target.value)} placeholder="0"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none ${d ? 'border-surface-700 bg-surface-800 text-white' : 'border-surface-200 bg-surface-50 text-surface-900'}`} />
                </div>
              </div>
              {regularRate && regularCredits && (
                <p className="text-xs text-surface-500 mt-1.5">= ৳{(Number(regularRate) * Number(regularCredits)).toLocaleString()}</p>
              )}
            </div>

            {!showLabCredits ? (
              <button onClick={() => setShowLabCredits(true)} className="text-sm text-primary-600 font-medium flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Lab Credits
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>Lab Credits</p>
                  <button onClick={() => { setShowLabCredits(false); setLabCredits(''); }} className="text-xs text-danger-500 font-medium">Remove</button>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-surface-500 mb-1 block">Rate/credit</label>
                    <div className={`flex items-center border rounded-lg px-3 py-2.5 ${d ? 'border-surface-700 bg-surface-800' : 'border-surface-200 bg-surface-50'}`}>
                      <span className="text-surface-400 mr-1">৳</span>
                      <input type="number" value={labRate} onChange={(e) => setLabRate(e.target.value)}
                        className={`w-full bg-transparent outline-none text-sm ${d ? 'text-white' : 'text-surface-900'}`} />
                    </div>
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-surface-500 mb-1 block">Credits</label>
                    <input type="number" value={labCredits} onChange={(e) => setLabCredits(e.target.value)} placeholder="0"
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none ${d ? 'border-surface-700 bg-surface-800 text-white' : 'border-surface-200 bg-surface-50 text-surface-900'}`} />
                  </div>
                </div>
                {labRate && labCredits && (
                  <p className="text-xs text-surface-500 mt-1.5">= ৳{(Number(labRate) * Number(labCredits)).toLocaleString()}</p>
                )}
              </div>
            )}

            <div className={`pt-4 border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Total</span>
                <span className="text-xl font-bold text-primary-600">৳{perCreditTotal.toLocaleString()}</span>
              </div>
              <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Rates saved for next semester
              </p>
            </div>
          </motion.div>
        )}

        {/* ═══ AMOUNT INPUT ═══ */}
        {!usePerCredit && (
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              {paymentMode === 'per_class' ? 'Rate per class' : 'Amount'}
            </label>
            <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${
              errors.amount ? 'border-danger-500' : `${d ? 'border-surface-800' : 'border-surface-200'} focus-within:border-primary-500`
            } ${d ? 'bg-surface-900' : 'bg-white'}`}>
              <span className="text-xl text-surface-400 mr-2">৳</span>
              <input
                type="number" inputMode="numeric" placeholder="0"
                value={paymentMode === 'per_class' ? ratePerClass : amount}
                onChange={(e) => paymentMode === 'per_class' ? setRatePerClass(e.target.value) : setAmount(e.target.value)}
                className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-danger-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.amount}</p>
            )}
          </div>
        )}

        {/* ═══ INSTALLMENTS ═══ */}
        {supportsInstallments && (
          <>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => { haptics.light(); setUseInstallments(!useInstallments); }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition ${
                useInstallments
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                  : `${d ? 'bg-surface-800' : 'bg-surface-100'} border-2 border-transparent`
              }`}
            >
              <div className="text-2xl">📋</div>
              <div className="text-left flex-1">
                <p className={`text-sm font-medium ${useInstallments ? 'text-primary-700 dark:text-primary-300' : d ? 'text-surface-300' : 'text-surface-700'}`}>
                  Pay in installments
                </p>
                <p className="text-xs text-surface-500">Split into 2-4 parts</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                useInstallments ? 'border-primary-600 bg-primary-600' : 'border-surface-300'
              }`}>
                {useInstallments && <Check className="w-3 h-3 text-white" />}
              </div>
            </motion.button>

            {useInstallments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-4 rounded-xl border space-y-4 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>Number of parts</p>
                  <div className="flex gap-2">
                    {[2, 3, 4].map(n => (
                      <button key={n} onClick={() => { haptics.light(); setInstallmentCount(n); setCustomInstallmentAmounts(false); }}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                          installmentCount === n ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                        }`}>{n}</button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={customInstallmentAmounts}
                    onChange={(e) => setCustomInstallmentAmounts(e.target.checked)}
                    className="w-4 h-4 accent-primary-600 rounded" />
                  <span className="text-sm text-surface-500">Customize amounts</span>
                </label>

                <div className="space-y-3">
                  {installments.map((inst, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-surface-500 w-14">Part {inst.part}</span>
                      <div className={`flex-1 flex items-center border rounded-lg px-3 py-2 ${d ? 'border-surface-700 bg-surface-800' : 'border-surface-200 bg-surface-50'}`}>
                        <span className="text-surface-400 mr-1 text-sm">৳</span>
                        <input type="number" value={inst.amount}
                          onChange={(e) => { setCustomInstallmentAmounts(true); updateInstallment(i, 'amount', e.target.value); }}
                          disabled={!customInstallmentAmounts}
                          className={`w-full bg-transparent outline-none text-sm disabled:text-surface-400 ${d ? 'text-white' : 'text-surface-900'}`} />
                      </div>
                      <input type="date" value={inst.dueDate}
                        onChange={(e) => updateInstallment(i, 'dueDate', e.target.value)}
                        className={`w-28 border rounded-lg px-2 py-2 text-xs ${d ? 'border-surface-700 bg-surface-800 text-white' : 'border-surface-200 bg-surface-50 text-surface-900'}`} />
                      {i === 0 && (
                        <label className="flex items-center gap-1 shrink-0">
                          <input type="checkbox" checked={inst.isPaid}
                            onChange={(e) => updateInstallment(i, 'isPaid', e.target.checked)}
                            className="w-4 h-4 accent-primary-600" />
                          <span className="text-xs text-surface-500">Paid</span>
                        </label>
                      )}
                    </div>
                  ))}
                </div>

                <div className={`pt-3 border-t ${installmentsMismatch ? 'border-danger-200' : d ? 'border-surface-800' : 'border-surface-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-500">Total</span>
                    <span className={`font-medium ${installmentsMismatch ? 'text-danger-500' : d ? 'text-white' : 'text-surface-900'}`}>
                      ৳{installmentsTotal.toLocaleString()}
                    </span>
                  </div>
                  {installmentsMismatch && (
                    <p className="text-xs text-danger-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Must equal ৳{finalAmount.toLocaleString()}
                    </p>
                  )}
                  {!installmentsMismatch && installments.length > 0 && (
                    <p className="text-xs text-success-500 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Amounts match
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* ═══ DUE DATE (Semester/One-time) ═══ */}
        {(isSemester || isOneTime) && !useInstallments && (
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className={`w-full p-3.5 border rounded-xl text-sm outline-none transition ${
                errors.dueDate ? 'border-danger-500' : `${d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'} focus:border-primary-500`
              }`} />
            {errors.dueDate && <p className="text-xs text-danger-500 mt-1">{errors.dueDate}</p>}
          </div>
        )}

        {/* ═══ DUE MONTH (Yearly) ═══ */}
        {isYearly && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Due Month</label>
              <select value={dueMonth} onChange={(e) => setDueMonth(Number(e.target.value))}
                className={`w-full p-3.5 border rounded-xl text-sm ${d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Due Day</label>
              <select value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))}
                className={`w-full p-3.5 border rounded-xl text-sm ${d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(dd => (
                  <option key={dd} value={dd}>{dd}{getDaySuffix(dd)}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ═══ RECURRING SETTINGS ═══ */}
        {isRecurring && (
          <>
            <div className={`h-px ${d ? 'bg-surface-800' : 'bg-surface-200'}`} />
            <p className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>Monthly payment settings</p>

            <div>
              <label className="text-sm text-surface-500 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Due day of month
              </label>
              <div className="flex items-center gap-4">
                <input type="range" min="1" max="28" value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="flex-1 accent-primary-600 h-2" />
                <span className={`w-14 text-center font-semibold rounded-lg py-1.5 ${d ? 'text-white bg-surface-800' : 'text-surface-900 bg-surface-100'}`}>
                  {dueDay}{getDaySuffix(dueDay)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm text-surface-500 mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4" /> Remind me before
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 5, 7].map(days => (
                  <button key={days} onClick={() => { haptics.light(); setReminderDays(days); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                      reminderDays === days ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                    }`}>{days}d</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══ ALREADY PAID ═══ */}
        {(isRecurring || isOneTime) && !useInstallments && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { haptics.light(); isRecurring ? setAlreadyPaid(!alreadyPaid) : setIsPaid(!isPaid); }}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition ${
              (alreadyPaid || isPaid)
                ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-500'
                : `${d ? 'bg-surface-800' : 'bg-surface-100'} border-2 border-transparent`
            }`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
              (alreadyPaid || isPaid) ? 'border-success-600 bg-success-600' : 'border-surface-300'
            }`}>
              {(alreadyPaid || isPaid) && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className={`text-sm ${(alreadyPaid || isPaid) ? 'text-success-700 dark:text-success-300' : d ? 'text-surface-300' : 'text-surface-700'}`}>
              {isRecurring ? 'I already paid this month' : 'I already paid this'}
            </span>
          </motion.button>
        )}

        {/* ═══ PAYMENT METHOD ═══ */}
        {(alreadyPaid || isPaid || (useInstallments && installments[0]?.isPaid)) && (
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              Payment method <span className="text-surface-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(method => (
                <button key={method.id}
                  onClick={() => { haptics.light(); setPaymentMethod(paymentMethod === method.id ? null : method.id); }}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${
                    paymentMethod === method.id ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                  }`}>{method.icon} {method.label}</button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ═══ SAVE BUTTON ═══ */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-t border-surface-200 dark:border-surface-800">
        <div className="max-w-md mx-auto">
          {finalAmount > 0 && (
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm text-surface-500">
                {isRecurring ? 'Monthly' : isSemester ? 'Semester' : isYearly ? 'Yearly' : 'Total'}
              </span>
              <span className="text-lg font-bold text-primary-600">৳{finalAmount.toLocaleString()}</span>
            </div>
          )}
          <GButton fullWidth size="lg" onClick={handleSave} loading={saving}
            disabled={saving || (useInstallments && installmentsMismatch) || finalAmount <= 0}>
            Save
          </GButton>
        </div>
      </div>
    </motion.div>
  );
};

export default EducationFeeFormPage;
