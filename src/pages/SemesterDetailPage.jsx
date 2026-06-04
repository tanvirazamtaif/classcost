import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Bell, BellOff, Edit2, Calendar, Plus, AlertCircle, Trash2, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { GButton } from '../components/ui';
import { AmountInput } from '../components/shared/AmountInput';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { sanitizeAmount, parseAmount, formatTransactionDate } from '../core/transactions';

function getPaymentStyleLabel(fee) {
  const style = fee.paymentStyle || fee.paymentPattern || 'full';
  const map = { full: 'Full Payment', installment: 'Installment', partial: 'Partial' };
  return map[style] || 'Full Payment';
}

function getPaymentStyleColor(fee, d) {
  const style = fee.paymentStyle || fee.paymentPattern || 'full';
  const map = {
    full: d ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
    installment: d ? 'bg-primary-900/30 text-primary-300' : 'bg-primary-100 text-primary-700',
    partial: d ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700',
  };
  return map[style] || map.full;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const SemesterDetailPage = () => {
  const { navigate, goBack, addToast, theme, routeParams } = useApp();
  const { getFeeById, activeFees, payInstallment, updateFee, recordPayment } = useEducationFees();
  const d = theme === 'dark';

  const { semesterId } = routeParams || {};
  const fee = getFeeById?.(semesterId) || activeFees.find(f => f.id === semesterId);

  // ── State ──────────────────────────────────────────────────
  const [editAmounts, setEditAmounts] = useState({});
  const [editDates, setEditDates] = useState({});
  // Reminder state: { [instId]: { enabled: bool, daysBefore: 1|2|3 } }
  const [reminders, setReminders] = useState({});
  const [reminderPopoverFor, setReminderPopoverFor] = useState(null); // inst.id or null
  const [dateWarningFor, setDateWarningFor] = useState(null); // inst.id for pulse animation
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [recordAmount, setRecordAmount] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Semester internal fees
  const [showAddFee, setShowAddFee] = useState(false);
  const [addFeeType, setAddFeeType] = useState(null);
  const [addFeeAmount, setAddFeeAmount] = useState('');
  const [addFeeNote, setAddFeeNote] = useState('');
  // Inline editing state for individual semester fees (Lab Fee, Tuition, etc.)
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [editFeeLabel, setEditFeeLabel] = useState('');
  const [editFeeAmount, setEditFeeAmount] = useState('');

  // Close popover on outside click
  useEffect(() => {
    if (!reminderPopoverFor) return;
    const close = (e) => {
      if (!e.target.closest('[data-reminder-popover]')) setReminderPopoverFor(null);
    };
    document.addEventListener('click', close, true);
    return () => document.removeEventListener('click', close, true);
  }, [reminderPopoverFor]);

  // ── Derived ────────────────────────────────────────────────

  const isInstallment = fee?.paymentStyle === 'installment' || fee?.paymentPattern === 'installment';
  const installments = fee?.semester?.installments || [];

  // RULE: When installment is marked paid, clear its reminder
  useEffect(() => {
    installments.forEach(inst => {
      if (inst.status === 'paid' && reminders[inst.id]?.enabled) {
        setReminders(prev => { const { [inst.id]: _, ...rest } = prev; return rest; });
      }
    });
  }, [installments]);

  // Semester containers store paid amounts inside fee.semester.fees[].paidAmount —
  // that's where the "+ Add Fee" / "Mark Paid" UI writes. The top-level hero
  // card must include these or it shows ৳0 even when every inner fee is paid.
  const semesterInnerFees = fee?.semester?.fees || [];
  const semesterInnerTotal = semesterInnerFees.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const semesterInnerPaid = semesterInnerFees.reduce(
    (s, f) => s + (Number(f.paidAmount) || (f.isPaid ? Number(f.amount) || 0 : 0)),
    0
  );
  const semesterInnerAllPaid = semesterInnerFees.length > 0
    && semesterInnerFees.every(f => f.isPaid || (Number(f.paidAmount) || 0) >= (Number(f.amount) || 0));

  const totalPaid = useMemo(() => {
    if (!fee) return 0;
    if (fee.payments && Array.isArray(fee.payments) && fee.payments.length > 0) {
      return fee.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    }
    if (isInstallment) {
      return installments.reduce((sum, i) => sum + (i.paidAmount || (i.status === 'paid' ? i.amount : 0) || 0), 0);
    }
    // Semester container — sum inner fees' paid amounts
    if (semesterInnerFees.length > 0) {
      return semesterInnerPaid;
    }
    if (fee.isPaid) return fee.amount || 0;
    return 0;
  }, [fee, installments, isInstallment, semesterInnerFees.length, semesterInnerPaid]);

  // Derive totalExpected from actual installment amounts (not stale field)
  // For non-installment fees, fall back to fee amount
  const totalExpected = useMemo(() => {
    if (isInstallment && installments.length > 0) {
      const fromInstallments = installments.reduce((sum, i) => sum + (i.amount || 0), 0);
      // If some installments still have amount 0, use totalExpectedAmount as minimum
      return Math.max(fromInstallments, fee?.totalExpectedAmount || 0);
    }
    return fee?.totalExpectedAmount || fee?.amount || 0;
  }, [fee, installments, isInstallment]);

  const paidCount = installments.filter(i => i.status === 'paid').length;
  const totalCount = installments.length;
  // Progress based on installment count (not amount) when some amounts are still 0
  const hasEmptyInstallments = installments.some(i => !i.amount || i.amount === 0);
  const progressPercent = useMemo(() => {
    if (isInstallment && totalCount > 0) {
      // Use count-based progress when some amounts are unknown
      if (hasEmptyInstallments) return (paidCount / totalCount) * 100;
      // Use amount-based progress when all amounts are known
      return totalExpected > 0 ? Math.min((totalPaid / totalExpected) * 100, 100) : 0;
    }
    return totalExpected > 0 ? Math.min((totalPaid / totalExpected) * 100, 100) : 0;
  }, [isInstallment, totalCount, paidCount, hasEmptyInstallments, totalPaid, totalExpected]);

  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(editAmounts).length > 0 || Object.keys(editDates).length > 0;
  }, [editAmounts, editDates]);

  // ── Handlers ───────────────────────────────────────────────

  const handleTogglePaid = useCallback((inst) => {
    if (inst.status === 'paid') return; // Cannot unpay
    haptics.medium();

    const amountToPay = parseAmount(editAmounts[inst.id] ?? inst.amount);
    if (amountToPay <= 0) {
      addToast('Enter an amount before marking as paid', 'error');
      haptics.error();
      return;
    }

    // If the installment was created with amount 0 (future installment),
    // update the installment's defined amount in the tracker structure
    // so totalExpectedAmount stays accurate
    if ((!inst.amount || inst.amount === 0) && amountToPay > 0) {
      const updatedInstallments = (fee.semester?.installments || []).map(i =>
        i.id === inst.id ? { ...i, amount: amountToPay } : i
      );
      const newTotal = updatedInstallments.reduce((sum, i) => sum + (i.amount || 0), 0);
      updateFee(fee.id, {
        semester: { ...fee.semester, installments: updatedInstallments },
        totalExpectedAmount: newTotal,
      }, `Set installment ${inst.part} amount to ৳${amountToPay}`);
    }

    payInstallment(fee.id, inst.id, {
      amount: amountToPay,
      method: null,
      paidAt: new Date().toISOString(),
      note: null,
    });

    // Clean up local edit state
    setEditAmounts(prev => { const { [inst.id]: _, ...rest } = prev; return rest; });
    setEditDates(prev => { const { [inst.id]: _, ...rest } = prev; return rest; });
    // Clear reminder for paid installment
    setReminders(prev => { const { [inst.id]: _, ...rest } = prev; return rest; });

    haptics.success();
    addToast(`Installment ${inst.part} paid · ৳${amountToPay.toLocaleString()}`, 'success');
  }, [fee, editAmounts, payInstallment, updateFee, addToast]);

  const handleReminderClick = useCallback((inst) => {
    const instId = inst.id;
    const currentDate = editDates[instId] ?? inst.dueDate;

    // RULE: Date must be filled before enabling reminder
    if (!currentDate) {
      haptics.error();
      setDateWarningFor(instId);
      // Clear warning after animation
      setTimeout(() => setDateWarningFor(null), 2000);
      return;
    }

    haptics.light();
    // If already has a reminder, open popover to edit/disable
    // If no reminder, open popover to configure
    setReminderPopoverFor(prev => prev === instId ? null : instId);
  }, [editDates]);

  const handleSetReminder = useCallback((instId, daysBefore) => {
    haptics.success();
    setReminders(prev => ({ ...prev, [instId]: { enabled: true, daysBefore } }));
    setReminderPopoverFor(null);
  }, []);

  const handleDisableReminder = useCallback((instId) => {
    haptics.light();
    setReminders(prev => { const { [instId]: _, ...rest } = prev; return rest; });
    setReminderPopoverFor(null);
  }, []);

  // RULE: If date is cleared after reminder was set, auto-disable
  const getEffectiveReminder = useCallback((inst) => {
    const reminder = reminders[inst.id];
    if (!reminder?.enabled) return null;
    const currentDate = editDates[inst.id] ?? inst.dueDate;
    if (!currentDate) return null; // Auto-disabled if date cleared
    return reminder;
  }, [reminders, editDates]);

  const handleSaveChanges = useCallback(() => {
    if (!fee || !hasUnsavedChanges) return;
    haptics.medium();
    setSaving(true);

    try {
      const updatedInstallments = installments.map(inst => {
        const newAmount = editAmounts[inst.id] !== undefined ? parseAmount(editAmounts[inst.id]) : inst.amount;
        const newDate = editDates[inst.id] !== undefined ? editDates[inst.id] : inst.dueDate;
        return { ...inst, amount: newAmount, dueDate: newDate };
      });

      // Recalculate total expected
      const newTotal = updatedInstallments.reduce((sum, i) => sum + (i.amount || 0), 0);

      updateFee(fee.id, {
        semester: { ...fee.semester, installments: updatedInstallments },
        totalExpectedAmount: newTotal,
      }, 'Updated installment amounts/dates');

      setEditAmounts({});
      setEditDates({});
      haptics.success();
      addToast('Changes saved', 'success');
    } catch (e) {
      console.error('Failed to save changes:', e);
      haptics.error();
      addToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  }, [fee, installments, editAmounts, editDates, hasUnsavedChanges, updateFee, addToast]);

  const handleRecordPayment = useCallback(() => {
    const amt = parseAmount(recordAmount);
    if (amt <= 0) return;
    haptics.medium();

    recordPayment(fee.id, {
      amount: amt,
      method: null,
      note: recordNote || null,
      paidAt: new Date().toISOString(),
    });

    setRecordAmount('');
    setRecordNote('');
    setShowRecordPayment(false);
    haptics.success();
    addToast(`৳${amt.toLocaleString()} recorded`, 'success');
  }, [fee, recordAmount, recordNote, recordPayment, addToast]);

  // ── Shared styles ──────────────────────────────────────────

  const inputCls = `w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
    d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
  }`;

  // ══════════════════════════════════════════════════════════════
  // RENDER: NOT FOUND
  // ══════════════════════════════════════════════════════════════

  if (!fee) {
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <div className="text-4xl mb-4">🔍</div>
        <h2 className={`text-lg font-semibold mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>Semester not found</h2>
        <p className="text-surface-500 text-sm mb-6">This semester may have been deleted.</p>
        <GButton onClick={() => navigate('semester-landing', { replace: true })}>Back to Semesters</GButton>
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER: INSTALLMENT ROW
  // ══════════════════════════════════════════════════════════════

  const renderInstallmentRow = (inst) => {
    const isPaid = inst.status === 'paid';
    const currentAmount = editAmounts[inst.id] ?? (inst.amount || '');
    const currentDate = editDates[inst.id] ?? (inst.dueDate || '');

    return (
      <motion.div
        key={inst.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-start gap-3 p-3.5 rounded-xl transition ${
          isPaid
            ? d ? 'bg-emerald-900/10 border border-emerald-800/20' : 'bg-emerald-50/50 border border-emerald-200/50'
            : d ? 'bg-surface-900 border border-surface-800' : 'bg-white border border-surface-200'
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={() => handleTogglePaid(inst)}
          className="mt-0.5 shrink-0"
          disabled={isPaid}
        >
          {isPaid ? (
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
          ) : (
            <div className={`w-6 h-6 rounded-full border-2 transition hover:border-primary-400 ${
              d ? 'border-surface-600' : 'border-surface-300'
            }`} />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
            Installment {inst.part}
          </p>

          {/* Amount */}
          {!isPaid ? (
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>৳</span>
              <input
                type="text"
                inputMode="decimal"
                value={currentAmount}
                onChange={(e) => setEditAmounts(prev => ({ ...prev, [inst.id]: sanitizeAmount(e.target.value) }))}
                placeholder="Enter amount"
                className={`text-sm font-semibold bg-transparent outline-none w-24 ${d ? 'text-white placeholder:text-surface-600' : 'text-surface-900 placeholder:text-surface-400'}`}
              />
            </div>
          ) : (
            <p className={`text-sm font-semibold mt-0.5 ${d ? 'text-emerald-400' : 'text-emerald-600'}`}>
              ৳{(inst.paidAmount || inst.amount || 0).toLocaleString()} — Paid
            </p>
          )}

          {/* Date */}
          {!isPaid ? (
            <div className="relative mt-1.5">
              <input
                type="date"
                value={currentDate}
                onChange={(e) => {
                  setEditDates(prev => ({ ...prev, [inst.id]: e.target.value }));
                  if (dateWarningFor === inst.id) setDateWarningFor(null);
                }}
                className={`text-xs border rounded-lg px-2 py-1.5 outline-none transition focus:border-primary-500 ${
                  dateWarningFor === inst.id
                    ? 'border-amber-500 ring-2 ring-amber-500/30 animate-pulse'
                    : d ? 'bg-surface-800 border-surface-700 text-surface-300' : 'bg-surface-50 border-surface-200 text-surface-600'
                }`}
              />
              {/* Warning when clicking reminder without date */}
              <AnimatePresence>
                {dateWarningFor === inst.id && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] text-amber-500 mt-1 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" /> Set a date first to enable reminder
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          ) : (
            inst.paidAt && (
              <p className={`text-xs mt-0.5 ${d ? 'text-surface-500' : 'text-surface-500'}`}>
                Paid {formatTransactionDate(inst.paidAt)}
              </p>
            )
          )}

          {/* Active reminder label */}
          {!isPaid && getEffectiveReminder(inst) && (
            <p className={`text-[10px] mt-1 flex items-center gap-1 ${d ? 'text-primary-400' : 'text-primary-600'}`}>
              <Bell className="w-3 h-3" /> Reminder {getEffectiveReminder(inst).daysBefore} day{getEffectiveReminder(inst).daysBefore > 1 ? 's' : ''} before
            </p>
          )}
        </div>

        {/* Reminder button for unpaid */}
        {!isPaid && (
          <div className="relative mt-0.5 shrink-0" data-reminder-popover>
            <motion.button
              onClick={() => handleReminderClick(inst)}
              animate={
                // Subtle pulse when date exists but no reminder yet
                (currentDate && !getEffectiveReminder(inst))
                  ? { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }
                  : {}
              }
              transition={
                (currentDate && !getEffectiveReminder(inst))
                  ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                  : {}
              }
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                getEffectiveReminder(inst)
                  ? d ? 'bg-primary-600/20 text-primary-400' : 'bg-primary-100 text-primary-600'
                  : d ? 'hover:bg-surface-800 text-surface-600' : 'hover:bg-surface-100 text-surface-400'
              }`}
            >
              {getEffectiveReminder(inst)
                ? <Bell className="w-4 h-4" />
                : <BellOff className="w-4 h-4" />
              }
            </motion.button>

            {/* Reminder popover */}
            <AnimatePresence>
              {reminderPopoverFor === inst.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  className={`absolute right-0 top-10 z-50 w-52 p-3 rounded-xl border shadow-xl ${
                    d ? 'bg-surface-800 border-surface-700 shadow-black/40' : 'bg-white border-surface-200 shadow-surface-200/60'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-2.5 ${d ? 'text-white' : 'text-surface-900'}`}>
                    Remind me
                  </p>
                  <div className="space-y-1.5">
                    {[1, 2, 3].map(days => {
                      const isActive = getEffectiveReminder(inst)?.daysBefore === days;
                      return (
                        <button
                          key={days}
                          onClick={() => handleSetReminder(inst.id, days)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition ${
                            isActive
                              ? 'bg-primary-600 text-white'
                              : d ? 'hover:bg-surface-700 text-surface-300' : 'hover:bg-surface-100 text-surface-700'
                          }`}
                        >
                          {days} day{days > 1 ? 's' : ''} before due date
                        </button>
                      );
                    })}
                  </div>
                  {getEffectiveReminder(inst) && (
                    <>
                      <div className={`my-2 h-px ${d ? 'bg-surface-700' : 'bg-surface-200'}`} />
                      <button
                        onClick={() => handleDisableReminder(inst.id)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition"
                      >
                        Turn off reminder
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER: PAYMENT HISTORY
  // ══════════════════════════════════════════════════════════════

  const payments = (fee.payments || []).slice(-10).reverse();

  // ══════════════════════════════════════════════════════════════
  // RENDER: MAIN
  // ══════════════════════════════════════════════════════════════

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { haptics.light(); goBack(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition"
            >
              <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
            </button>
            <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>
              {fee.semesterName || fee.name}
            </h1>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <Edit2 className={`w-4 h-4 ${d ? 'text-surface-400' : 'text-surface-500'}`} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">

        {/* ══════════════════════════════════════════════════════════
             SUMMARY CARD
             ══════════════════════════════════════════════════════════ */}
        <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
          {/* University + badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎓</span>
              <p className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-600'}`}>
                {fee.name || 'Semester Payment'}
              </p>
            </div>
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${getPaymentStyleColor(fee, d)}`}>
              {getPaymentStyleLabel(fee)}
            </span>
          </div>

          {/* Total paid / expected */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Total Paid</p>
              <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>
                ৳{totalPaid.toLocaleString()}
              </p>
            </div>
            {totalExpected > 0 && !hasEmptyInstallments && (
              <p className={`text-sm ${d ? 'text-surface-400' : 'text-surface-500'}`}>
                of ৳{totalExpected.toLocaleString()}
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div className={`w-full h-2 rounded-full overflow-hidden ${d ? 'bg-surface-800' : 'bg-surface-200'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
            />
          </div>

          {/* Installment count */}
          {isInstallment && installments.length > 0 && (
            <p className={`text-xs mt-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>
              {paidCount} of {installments.length} installments paid
            </p>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
             INSTALLMENT TRACKER
             ══════════════════════════════════════════════════════════ */}
        {isInstallment && installments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Installments</h2>
              {hasUnsavedChanges && (
                <GButton
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveChanges}
                  loading={saving}
                  disabled={saving}
                >
                  Save Changes
                </GButton>
              )}
            </div>
            <div className="space-y-2.5">
              {installments.map(inst => renderInstallmentRow(inst))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
             NON-INSTALLMENT VIEW
             ══════════════════════════════════════════════════════════ */}
        {!isInstallment && (
          <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Payment Amount</p>
                <p className={`text-lg font-bold ${d ? 'text-white' : 'text-surface-900'}`}>
                  ৳{(semesterInnerFees.length > 0 ? semesterInnerTotal : (fee.amount || 0)).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Status</p>
                {(() => {
                  // Status reflects either the top-level isPaid flag OR — for
                  // semester containers — whether every inner fee is paid.
                  const isFullyPaid = fee.isPaid || semesterInnerAllPaid;
                  const isPartial = !isFullyPaid && semesterInnerPaid > 0;
                  const label = isFullyPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending';
                  const cls = isFullyPaid
                    ? (d ? 'text-emerald-400' : 'text-emerald-600')
                    : isPartial
                      ? (d ? 'text-sky-400' : 'text-sky-600')
                      : (d ? 'text-amber-400' : 'text-amber-600');
                  return <p className={`text-sm font-semibold ${cls}`}>{label}</p>;
                })()}
              </div>
            </div>
            {fee.paidAt && (
              <p className={`text-xs mt-2 ${d ? 'text-surface-500' : 'text-surface-500'}`}>
                <Calendar className="w-3 h-3 inline mr-1" />
                {formatTransactionDate(fee.paidAt)}
              </p>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
             RECORD A PAYMENT (for partial)
             ══════════════════════════════════════════════════════════ */}
        {fee.paymentStyle === 'partial' && !fee.isPaid && (
          <div>
            {!showRecordPayment ? (
              <GButton
                fullWidth
                variant="secondary"
                icon={Plus}
                onClick={() => { haptics.light(); setShowRecordPayment(true); }}
              >
                Record a Payment
              </GButton>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}
              >
                <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Record Payment</p>
                <div className={`flex items-center border-2 rounded-xl px-3 py-2.5 transition ${
                  d ? 'border-surface-800 bg-surface-800' : 'border-surface-200 bg-surface-50'
                } focus-within:border-primary-500`}>
                  <span className="text-lg text-surface-400 mr-2">৳</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={recordAmount}
                    onChange={(e) => setRecordAmount(sanitizeAmount(e.target.value))}
                    className={`text-lg font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Note (optional)"
                  maxLength={100}
                  value={recordNote}
                  onChange={(e) => setRecordNote(e.target.value)}
                  className={inputCls}
                />
                <div className="flex gap-2">
                  <GButton
                    variant="secondary"
                    fullWidth
                    onClick={() => { setShowRecordPayment(false); setRecordAmount(''); setRecordNote(''); }}
                  >
                    Cancel
                  </GButton>
                  <GButton
                    fullWidth
                    onClick={handleRecordPayment}
                    disabled={parseAmount(recordAmount) <= 0}
                  >
                    Save
                  </GButton>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
             PAYMENT HISTORY
             ══════════════════════════════════════════════════════════ */}
        {payments.length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Payment History</h2>
            <div className={`rounded-2xl border overflow-hidden ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
              {payments.map((payment, i) => (
                <div
                  key={payment.id || i}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < payments.length - 1 ? `border-b ${d ? 'border-surface-800' : 'border-surface-100'}` : ''
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
                      ৳{(payment.amount || 0).toLocaleString()}
                    </p>
                    <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>
                      {formatTransactionDate(payment.paidAt || payment.date)}
                    </p>
                  </div>
                  {payment.method && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'}`}>
                      {payment.method}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SEMESTER INTERNAL FEES ═══ */}
        {fee.feeType === 'semester_container' && (() => {
          const SEMESTER_FEE_TYPES = [
            { id: 'tuition', icon: '🎓', label: 'Tuition' },
            { id: 'lab_fee', icon: '🔬', label: 'Lab Fee' },
            { id: 'exam_fee', icon: '📝', label: 'Exam Fee' },
            { id: 'library_fee', icon: '📚', label: 'Library Fee' },
            { id: 'development_fee', icon: '🏗️', label: 'Development Fee' },
            { id: 'custom', icon: '📦', label: 'Custom Fee' },
          ];

          const semFees = fee.semester?.fees || [];
          const totalFees = semFees.reduce((s, f) => s + (f.amount || 0), 0);
          const totalFeePaid = semFees.reduce((s, f) => s + (f.paidAmount || 0), 0);
          const feeProgress = totalFees > 0 ? Math.min(100, Math.round(totalFeePaid / totalFees * 100)) : 0;

          const handleAddInternalFee = () => {
            if (!addFeeType || parseAmount(addFeeAmount) <= 0) { haptics.error(); return; }
            const newFee = {
              id: `sf_${Date.now().toString(36)}`,
              type: addFeeType.id, label: addFeeType.label, icon: addFeeType.icon,
              amount: parseAmount(addFeeAmount), paidAmount: 0, isPaid: false,
              note: addFeeNote || null, addedAt: new Date().toISOString(),
            };
            const currentFees = fee.semester?.fees || [];
            updateFee(fee.id, {
              semester: { ...fee.semester, fees: [...currentFees, newFee] },
              amount: (fee.amount || 0) + newFee.amount,
            }, `Added ${addFeeType.label} ৳${newFee.amount}`);
            haptics.success();
            addToast(`${addFeeType.label} added`, 'success');
            setShowAddFee(false); setAddFeeType(null); setAddFeeAmount(''); setAddFeeNote('');
          };

          const handleToggleFeePaid = (feeItem) => {
            haptics.success();
            const becomingPaid = !feeItem.isPaid;
            const updatedFees = (fee.semester?.fees || []).map(f =>
              f.id === feeItem.id
                ? becomingPaid
                  ? { ...f, isPaid: true, paidAmount: f.amount, paidAt: new Date().toISOString() }
                  : { ...f, isPaid: false, paidAmount: 0, paidAt: null }
                : f
            );
            updateFee(
              fee.id,
              { semester: { ...fee.semester, fees: updatedFees } },
              becomingPaid ? `Paid ${feeItem.label}` : `Unmarked ${feeItem.label}`,
            );
            addToast(becomingPaid ? `${feeItem.label} marked paid` : `${feeItem.label} unmarked`, 'success');
          };

          const handleStartEdit = (feeItem) => {
            haptics.light();
            setEditingFeeId(feeItem.id);
            setEditFeeLabel(feeItem.label || '');
            setEditFeeAmount(String(feeItem.amount || ''));
          };

          const handleCancelEdit = () => {
            setEditingFeeId(null);
            setEditFeeLabel('');
            setEditFeeAmount('');
          };

          const handleSaveEdit = (feeItem) => {
            const newAmt = parseAmount(editFeeAmount);
            const newLabel = (editFeeLabel || '').trim();
            if (!newLabel) { haptics.error(); addToast('Fee name required', 'error'); return; }
            if (newAmt <= 0) { haptics.error(); addToast('Amount must be > 0', 'error'); return; }
            haptics.success();
            const oldAmount = Number(feeItem.amount) || 0;
            const updatedFees = (fee.semester?.fees || []).map(f =>
              f.id === feeItem.id
                ? { ...f, label: newLabel, amount: newAmt, paidAmount: f.isPaid ? newAmt : (f.paidAmount || 0) }
                : f
            );
            updateFee(
              fee.id,
              {
                semester: { ...fee.semester, fees: updatedFees },
                amount: (fee.amount || 0) - oldAmount + newAmt,
              },
              `Edited ${newLabel} ৳${newAmt}`,
            );
            addToast(`${newLabel} updated`, 'success');
            handleCancelEdit();
          };

          const handleDeleteFee = (feeItem) => {
            haptics.medium();
            const updatedFees = (fee.semester?.fees || []).filter(f => f.id !== feeItem.id);
            updateFee(
              fee.id,
              {
                semester: { ...fee.semester, fees: updatedFees },
                amount: (fee.amount || 0) - (Number(feeItem.amount) || 0),
              },
              `Deleted ${feeItem.label}`,
            );
            addToast(`${feeItem.label} deleted`, 'success');
            if (editingFeeId === feeItem.id) handleCancelEdit();
          };

          return (
            <div className="space-y-4">
              <h2 className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Fees in this Semester</h2>

              {/* Fee list */}
              {semFees.length > 0 && (
                <div className="space-y-2">
                  {semFees.map(f => (
                    <div key={f.id}
                      className={`rounded-xl border transition ${
                        f.isPaid
                          ? d ? 'bg-emerald-900/10 border-emerald-800/20' : 'bg-emerald-50/50 border-emerald-200/50'
                          : d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'
                      }`}>
                      {editingFeeId === f.id ? (
                        // ── Inline edit form ─────────────────────────────
                        <div className="p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{f.icon}</span>
                            <input
                              value={editFeeLabel}
                              onChange={(e) => setEditFeeLabel(e.target.value)}
                              placeholder="Fee name"
                              className={`flex-1 px-3 py-2 rounded-lg text-sm outline-none border ${
                                d ? 'bg-surface-950 border-surface-700 text-white placeholder-surface-600 focus:border-primary-500'
                                  : 'bg-white border-surface-300 text-surface-900 placeholder-surface-400 focus:border-primary-500'
                              }`}
                            />
                          </div>
                          <AmountInput value={editFeeAmount} onChange={setEditFeeAmount} placeholder="Amount" autoFocus={false} />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteFee(f)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
                                d ? 'bg-danger-900/30 text-danger-300 hover:bg-danger-900/50'
                                  : 'bg-danger-50 text-danger-600 hover:bg-danger-100'
                              }`}
                              aria-label={`Delete ${f.label}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                            <div className="flex-1" />
                            <button
                              onClick={handleCancelEdit}
                              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                d ? 'text-surface-400 hover:text-white' : 'text-surface-500 hover:text-surface-900'
                              }`}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(f)}
                              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 active:scale-[0.98] transition"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        // ── Default row: tap circle to toggle paid, pencil to edit ──
                        <div className="flex items-center gap-3 p-3">
                          <button
                            onClick={() => handleToggleFeePaid(f)}
                            aria-label={f.isPaid ? `Unmark ${f.label} as paid` : `Mark ${f.label} paid`}
                            className="shrink-0"
                          >
                            {f.isPaid
                              ? <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                              : <div className={`w-5 h-5 rounded-full border-2 ${d ? 'border-surface-600' : 'border-surface-300'}`} />
                            }
                          </button>
                          <span className="text-sm">{f.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${f.isPaid ? 'line-through text-surface-400' : d ? 'text-white' : 'text-surface-900'}`}>{f.label}</p>
                            {f.note && <p className="text-xs text-surface-500 truncate">{f.note}</p>}
                          </div>
                          <p className={`text-sm font-semibold shrink-0 ${f.isPaid ? (d ? 'text-emerald-400' : 'text-emerald-600') : d ? 'text-white' : 'text-surface-900'}`}>
                            ৳{(f.amount || 0).toLocaleString()}
                          </p>
                          <button
                            onClick={() => handleStartEdit(f)}
                            aria-label={`Edit ${f.label}`}
                            className={`p-1.5 rounded-lg transition ${
                              d ? 'text-surface-500 hover:text-white hover:bg-surface-800'
                                : 'text-surface-400 hover:text-surface-900 hover:bg-surface-100'
                            }`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Totals */}
                  <div className={`pt-3 border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>Total: ৳{totalFees.toLocaleString()}</span>
                      <span className={`text-xs font-medium ${d ? 'text-emerald-400' : 'text-emerald-600'}`}>Paid: ৳{totalFeePaid.toLocaleString()} ({feeProgress}%)</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${d ? 'bg-surface-800' : 'bg-surface-100'}`}>
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${feeProgress}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Add fee */}
              {!showAddFee ? (
                <GButton fullWidth variant="secondary" onClick={() => { haptics.light(); setShowAddFee(true); }}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Fee
                </GButton>
              ) : (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
                    <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Add Fee</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SEMESTER_FEE_TYPES.map(t => (
                        <button key={t.id} onClick={() => { haptics.light(); setAddFeeType(t); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            addFeeType?.id === t.id ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
                          }`}>{t.icon} {t.label}</button>
                      ))}
                    </div>
                    {addFeeType && (
                      <>
                        <AmountInput value={addFeeAmount} onChange={setAddFeeAmount} dark={d} size="sm" autoFocus />
                        <input type="text" placeholder="Note (optional)" value={addFeeNote} onChange={(e) => setAddFeeNote(e.target.value)}
                          className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-500 transition ${
                            d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-50 border-surface-200 text-surface-900'
                          }`} />
                      </>
                    )}
                    <div className="flex gap-2">
                      <GButton variant="secondary" fullWidth onClick={() => { setShowAddFee(false); setAddFeeType(null); setAddFeeAmount(''); }}>Cancel</GButton>
                      <GButton fullWidth onClick={handleAddInternalFee} disabled={!addFeeType || parseAmount(addFeeAmount) <= 0}>Add</GButton>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          );
        })()}

        {/* Note */}
        {fee.note && (
          <div className={`p-3.5 rounded-xl ${d ? 'bg-surface-900 border border-surface-800' : 'bg-surface-100 border border-surface-200'}`}>
            <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Note</p>
            <p className={`text-sm mt-0.5 ${d ? 'text-surface-300' : 'text-surface-700'}`}>{fee.note}</p>
          </div>
        )}

      </main>

      {/* Floating save button for unsaved installment changes */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-t border-surface-200 dark:border-surface-800">
          <div className="max-w-md mx-auto">
            <GButton fullWidth size="lg" onClick={handleSaveChanges} loading={saving} disabled={saving}>
              Save Changes
            </GButton>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SemesterDetailPage;
