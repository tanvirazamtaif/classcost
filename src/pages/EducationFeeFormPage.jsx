import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Bell, Calculator, Plus, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { EDUCATION_FEE_TYPES, PAYMENT_PATTERNS, PAYMENT_METHODS, SEMESTER_NAMES, MONTHS } from '../types/educationFees';
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
  const { addFee, addSemesterFee, savedCreditRates, setSavedCreditRates } = useEducationFees();
  const d = theme === 'dark';

  const feeType = routeParams?.feeType;
  const typeConfig = feeType?.id
    ? (EDUCATION_FEE_TYPES.find(t => t.id === feeType.id) || feeType)
    : feeType;

  // Common
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  // Recurring
  const [dueDay, setDueDay] = useState(10);
  const [reminderDays, setReminderDays] = useState(2);
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  // Per-class
  const [paymentMode, setPaymentMode] = useState('monthly');
  const [ratePerClass, setRatePerClass] = useState('');

  // Semester
  const [semesterName, setSemesterName] = useState(SEMESTER_NAMES[0]);
  const [dueDate, setDueDate] = useState('');

  // Per-credit
  const [usePerCredit, setUsePerCredit] = useState(false);
  const [regularRate, setRegularRate] = useState(String(savedCreditRates.regular || 5500));
  const [regularCredits, setRegularCredits] = useState('');
  const [labRate, setLabRate] = useState(String(savedCreditRates.lab || 6500));
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

  // Per-credit total
  const perCreditTotal = usePerCredit ? (
    (Number(regularRate) * Number(regularCredits) || 0) +
    (showLabCredits ? (Number(labRate) * Number(labCredits) || 0) : 0)
  ) : 0;

  // Auto-calculate installments
  useEffect(() => {
    if (useInstallments && !customInstallmentAmounts) {
      const total = usePerCredit ? perCreditTotal : Number(amount) || 0;
      const equalAmount = Math.floor(total / installmentCount);
      const remainder = total - (equalAmount * installmentCount);
      const newInstallments = Array.from({ length: installmentCount }, (_, i) => {
        const baseDate = dueDate ? new Date(dueDate) : new Date();
        baseDate.setMonth(baseDate.getMonth() + i);
        return {
          part: i + 1,
          amount: equalAmount + (i === 0 ? remainder : 0),
          dueDate: baseDate.toISOString().split('T')[0],
          isPaid: i === 0 ? alreadyPaid : false,
        };
      });
      setInstallments(newInstallments);
    }
  }, [useInstallments, installmentCount, amount, perCreditTotal, dueDate, alreadyPaid, customInstallmentAmounts, usePerCredit]);

  const installmentsTotal = installments.reduce((sum, inst) => sum + inst.amount, 0);
  const expectedTotal = usePerCredit ? perCreditTotal : Number(amount) || 0;
  const installmentsMismatch = useInstallments && customInstallmentAmounts && Math.abs(installmentsTotal - expectedTotal) > 1;

  const updateInstallment = (index, field, value) => {
    setInstallments(prev => prev.map((inst, i) => i === index ? { ...inst, [field]: value } : inst));
  };

  const validate = () => {
    const newErrors = {};
    const finalAmount = usePerCredit ? perCreditTotal : Number(amount);
    if (!finalAmount || finalAmount <= 0) newErrors.amount = 'Amount is required';
    if (finalAmount > 50000000) newErrors.amount = 'Amount seems too high';
    if (useInstallments && installmentsMismatch) newErrors.installments = 'Installments must equal total';
    if (['semester', 'one_time'].includes(typeConfig?.defaultPattern) && !dueDate && !useInstallments) newErrors.dueDate = 'Due date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { haptics.error(); return; }
    haptics.success();
    setSaving(true);

    try {
      const finalAmount = usePerCredit ? perCreditTotal : Number(amount);
      if (usePerCredit) setSavedCreditRates({ regular: Number(regularRate), lab: Number(labRate) });

      let paymentPattern = typeConfig.defaultPattern;
      if (paymentMode === 'per_class') paymentPattern = PAYMENT_PATTERNS.PER_CLASS;
      if (useInstallments) paymentPattern = PAYMENT_PATTERNS.INSTALLMENT;

      const feeData = {
        feeType: typeConfig.id,
        name: name || typeConfig.label,
        icon: typeConfig.icon,
        paymentPattern,
        amount: finalAmount,
        dueDay, reminderDays,
        alreadyPaidThisMonth: alreadyPaid,
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
        initialPayment: (alreadyPaid || isPaid) ? {
          amount: finalAmount, method: paymentMethod,
          paidAt: isPaid ? paidDate : new Date().toISOString(),
        } : null,
      };

      if (useInstallments || typeConfig.defaultPattern === 'semester') {
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

  const isRecurring = typeConfig.defaultPattern === 'recurring';
  const isSemester = typeConfig.defaultPattern === 'semester';
  const isYearly = typeConfig.defaultPattern === 'yearly';
  const isOneTime = typeConfig.defaultPattern === 'one_time';
  const supportsPerCredit = typeConfig.supportsPerCredit;
  const supportsInstallments = typeConfig.supportsInstallments;
  const supportsPerClass = typeConfig.allowedPatterns?.includes(PAYMENT_PATTERNS.PER_CLASS);

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-24 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => { haptics.light(); navigate('education-fees'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{typeConfig.label}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* Icon & Description */}
        <div className="text-center mb-6">
          <span className="text-5xl">{typeConfig.icon}</span>
          <p className="text-sm text-surface-500 mt-2">{typeConfig.desc}</p>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
            {isRecurring ? 'School/Institution Name' : isSemester ? 'University Name' : 'Name'} (optional)
          </label>
          <input
            type="text"
            placeholder={isRecurring ? 'e.g., Dhaka Residential Model School' : isSemester ? 'e.g., North South University' : 'Enter name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-600 ${
              d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-100 border-surface-200 text-surface-900'
            }`}
          />
        </div>

        {/* Semester Name */}
        {isSemester && (
          <div className="mb-4">
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Semester</label>
            <select
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-600 ${
                d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-100 border-surface-200 text-surface-900'
              }`}
            >
              {SEMESTER_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {/* Per-Class Toggle */}
        {supportsPerClass && (
          <div className="mb-4">
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Payment Type</label>
            <div className="flex gap-2">
              {['monthly', 'per_class'].map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMode(m)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
                    paymentMode === m ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                  }`}
                >
                  {m === 'monthly' ? 'Monthly' : 'Per Class'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Per-Credit Calculator */}
        {supportsPerCredit && (
          <div className="mb-4">
            <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer ${d ? 'bg-surface-800' : 'bg-surface-100'}`}>
              <input type="checkbox" checked={usePerCredit} onChange={(e) => setUsePerCredit(e.target.checked)} className="w-5 h-5 accent-primary-600" />
              <div>
                <span className={`text-sm font-medium flex items-center gap-2 ${d ? 'text-white' : 'text-surface-900'}`}>
                  <Calculator className="w-4 h-4" /> Calculate by credits
                </span>
                <p className="text-xs text-surface-500">For per-credit universities</p>
              </div>
            </label>
          </div>
        )}

        {usePerCredit && (
          <div className={`mb-4 p-4 rounded-xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            <div className="mb-4">
              <p className={`text-sm font-medium mb-2 ${d ? 'text-surface-300' : 'text-surface-700'}`}>Regular Credits</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-surface-500">Rate/credit</label>
                  <div className={`flex items-center border rounded-lg px-3 py-2 ${d ? 'border-surface-700' : 'border-surface-200'}`}>
                    <span className="text-surface-500 mr-1">৳</span>
                    <input type="number" value={regularRate} onChange={(e) => setRegularRate(e.target.value)} className={`w-full bg-transparent outline-none ${d ? 'text-white' : 'text-surface-900'}`} />
                  </div>
                </div>
                <div className="w-20">
                  <label className="text-xs text-surface-500">Credits</label>
                  <input type="number" value={regularCredits} onChange={(e) => setRegularCredits(e.target.value)} className={`w-full border rounded-lg px-3 py-2 bg-transparent outline-none ${d ? 'border-surface-700 text-white' : 'border-surface-200 text-surface-900'}`} />
                </div>
              </div>
              {regularRate && regularCredits && <p className="text-xs text-surface-500 mt-1">Subtotal: ৳{(Number(regularRate) * Number(regularCredits)).toLocaleString()}</p>}
            </div>

            {!showLabCredits ? (
              <button onClick={() => setShowLabCredits(true)} className="text-sm text-primary-600 font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add Lab Credits
              </button>
            ) : (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>Lab Credits</p>
                  <button onClick={() => { setShowLabCredits(false); setLabCredits(''); }} className="text-xs text-danger-500">Remove</button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-surface-500">Rate/credit</label>
                    <div className={`flex items-center border rounded-lg px-3 py-2 ${d ? 'border-surface-700' : 'border-surface-200'}`}>
                      <span className="text-surface-500 mr-1">৳</span>
                      <input type="number" value={labRate} onChange={(e) => setLabRate(e.target.value)} className={`w-full bg-transparent outline-none ${d ? 'text-white' : 'text-surface-900'}`} />
                    </div>
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-surface-500">Credits</label>
                    <input type="number" value={labCredits} onChange={(e) => setLabCredits(e.target.value)} className={`w-full border rounded-lg px-3 py-2 bg-transparent outline-none ${d ? 'border-surface-700 text-white' : 'border-surface-200 text-surface-900'}`} />
                  </div>
                </div>
                {labRate && labCredits && <p className="text-xs text-surface-500 mt-1">Subtotal: ৳{(Number(labRate) * Number(labCredits)).toLocaleString()}</p>}
              </div>
            )}

            <div className={`mt-4 pt-4 border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Total</span>
                <span className="text-xl font-bold text-primary-600">৳{perCreditTotal.toLocaleString()}</span>
              </div>
              <p className="text-xs text-surface-500 mt-1">Rates saved for next semester</p>
            </div>
          </div>
        )}

        {/* Amount (if not per-credit) */}
        {!usePerCredit && (
          <div className="mb-4">
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              {paymentMode === 'per_class' ? 'Rate per class' : 'Amount'}
            </label>
            <div className={`flex items-center border-2 rounded-xl px-4 py-3 focus-within:border-primary-600 ${
              errors.amount ? 'border-danger-500' : d ? 'border-surface-700' : 'border-surface-200'
            }`}>
              <span className="text-xl text-surface-500 mr-2">৳</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={paymentMode === 'per_class' ? ratePerClass : amount}
                onChange={(e) => paymentMode === 'per_class' ? setRatePerClass(e.target.value) : setAmount(e.target.value)}
                className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`}
              />
            </div>
            {errors.amount && <p className="text-xs text-danger-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.amount}</p>}
          </div>
        )}

        {/* Installments Toggle */}
        {supportsInstallments && (
          <div className="mb-4">
            <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer ${d ? 'bg-surface-800' : 'bg-surface-100'}`}>
              <input type="checkbox" checked={useInstallments} onChange={(e) => setUseInstallments(e.target.checked)} className="w-5 h-5 accent-primary-600" />
              <div>
                <span className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Pay in installments</span>
                <p className="text-xs text-surface-500">Split into 2-4 parts</p>
              </div>
            </label>
          </div>
        )}

        {/* Installments Setup */}
        {useInstallments && (
          <div className={`mb-4 p-4 rounded-xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <p className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>Number of parts</p>
              <div className="flex gap-2">
                {[2, 3, 4].map(n => (
                  <button key={n} onClick={() => { setInstallmentCount(n); setCustomInstallmentAmounts(false); }}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                      installmentCount === n ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                    }`}>{n}</button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={customInstallmentAmounts} onChange={(e) => setCustomInstallmentAmounts(e.target.checked)} className="w-4 h-4 accent-primary-600" />
              <span className="text-sm text-surface-500">Customize amounts</span>
            </label>

            <div className="space-y-3">
              {installments.map((inst, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-surface-500 w-14">Part {inst.part}</span>
                  <div className={`flex-1 flex items-center border rounded-lg px-3 py-2 ${d ? 'border-surface-700' : 'border-surface-200'}`}>
                    <span className="text-surface-500 mr-1">৳</span>
                    <input type="number" value={inst.amount}
                      onChange={(e) => { setCustomInstallmentAmounts(true); updateInstallment(i, 'amount', Number(e.target.value)); }}
                      disabled={!customInstallmentAmounts}
                      className={`w-full bg-transparent outline-none text-sm ${d ? 'text-white' : 'text-surface-900'}`} />
                  </div>
                  <input type="date" value={inst.dueDate} onChange={(e) => updateInstallment(i, 'dueDate', e.target.value)}
                    className={`w-28 border rounded-lg px-2 py-2 text-xs bg-transparent ${d ? 'border-surface-700 text-white' : 'border-surface-200 text-surface-900'}`} />
                  {i === 0 && (
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={inst.isPaid} onChange={(e) => updateInstallment(i, 'isPaid', e.target.checked)} className="w-4 h-4 accent-primary-600" />
                      <span className="text-xs text-surface-500">Paid</span>
                    </label>
                  )}
                </div>
              ))}
            </div>

            <div className={`mt-4 pt-4 border-t ${installmentsMismatch ? 'border-danger-200' : d ? 'border-surface-800' : 'border-surface-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Total</span>
                <span className={`font-medium ${installmentsMismatch ? 'text-danger-500' : d ? 'text-white' : 'text-surface-900'}`}>
                  ৳{installmentsTotal.toLocaleString()}
                  {installmentsMismatch && <span className="text-xs ml-1">(should be ৳{expectedTotal.toLocaleString()})</span>}
                </span>
              </div>
              {installmentsMismatch && <p className="text-xs text-danger-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Installments must equal total amount</p>}
              {!installmentsMismatch && installments.length > 0 && <p className="text-xs text-success-500 mt-1 flex items-center gap-1"><Check className="w-3 h-3" />Amounts match</p>}
            </div>
          </div>
        )}

        {/* Due Date (semester/one-time without installments) */}
        {(isSemester || isOneTime) && !useInstallments && (
          <div className="mb-4">
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-600 ${
                errors.dueDate ? 'border-danger-500' : d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-100 border-surface-200 text-surface-900'
              }`} />
            {errors.dueDate && <p className="text-xs text-danger-500 mt-1">{errors.dueDate}</p>}
          </div>
        )}

        {/* Due Day (recurring) */}
        {isRecurring && (
          <>
            <div className={`border-t my-6 ${d ? 'border-surface-800' : 'border-surface-200'}`} />
            <p className={`text-sm font-medium mb-4 ${d ? 'text-surface-300' : 'text-surface-700'}`}>This is a monthly payment</p>
            <div className="mb-4">
              <label className="text-sm text-surface-500 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" />Due day of month</label>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="28" value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} className="flex-1 accent-primary-600" />
                <span className={`w-12 text-center font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{dueDay}{getDaySuffix(dueDay)}</span>
              </div>
            </div>
            <div className="mb-6">
              <label className="text-sm text-surface-500 mb-2 flex items-center gap-2"><Bell className="w-4 h-4" />Remind me before</label>
              <div className="flex gap-2">
                {[1, 2, 3, 5, 7].map(days => (
                  <button key={days} onClick={() => { haptics.light(); setReminderDays(days); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      reminderDays === days ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                    }`}>{days}d</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Due Month (yearly) */}
        {isYearly && (
          <div className="mb-4">
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Due Month</label>
            <select value={dueMonth} onChange={(e) => setDueMonth(Number(e.target.value))}
              className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-600 ${d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-100 border-surface-200 text-surface-900'}`}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        )}

        {/* Already Paid */}
        {(isRecurring || isOneTime) && !useInstallments && (
          <label className={`flex items-center gap-3 p-4 rounded-xl mb-6 cursor-pointer ${d ? 'bg-surface-800' : 'bg-surface-100'}`}>
            <input type="checkbox" checked={isRecurring ? alreadyPaid : isPaid}
              onChange={(e) => isRecurring ? setAlreadyPaid(e.target.checked) : setIsPaid(e.target.checked)}
              className="w-5 h-5 accent-primary-600" />
            <span className={`text-sm ${d ? 'text-surface-300' : 'text-surface-700'}`}>
              {isRecurring ? 'I already paid this month' : 'I already paid this'}
            </span>
          </label>
        )}

        {/* Payment Method */}
        {(alreadyPaid || isPaid || (useInstallments && installments[0]?.isPaid)) && (
          <div className="mb-6">
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Payment Method (optional)</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(method => (
                <button key={method.id} onClick={() => { haptics.light(); setPaymentMethod(method.id); }}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    paymentMethod === method.id ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                  }`}>{method.icon} {method.label}</button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Save */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-t border-surface-200 dark:border-surface-800">
        <div className="max-w-md mx-auto">
          <GButton fullWidth size="lg" onClick={handleSave} loading={saving} disabled={saving || (useInstallments && installmentsMismatch)}>
            Save
          </GButton>
        </div>
      </div>
    </motion.div>
  );
};

export default EducationFeeFormPage;
