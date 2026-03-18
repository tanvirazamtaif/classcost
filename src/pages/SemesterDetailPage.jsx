import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Circle, Bell, BellOff, Edit2, Calendar, Plus, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { GButton } from '../components/ui';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';

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

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

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
  const { navigate, addToast, theme, routeParams } = useApp();
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

  // Close popover on outside click
  useEffect(() => {
    if (!reminderPopoverFor) return;
    const close = (e) => {
      if (!e.target.closest('[data-reminder-popover]')) setReminderPopoverFor(null);
    };
    document.addEventListener('click', close, true);
    return () => document.removeEventListener('click', close, true);
  }, [reminderPopoverFor]);

  // RULE: When installment is marked paid, clear its reminder
  useEffect(() => {
    installments.forEach(inst => {
      if (inst.status === 'paid' && reminders[inst.id]?.enabled) {
        setReminders(prev => { const { [inst.id]: _, ...rest } = prev; return rest; });
      }
    });
  }, [installments]);

  // ── Derived ────────────────────────────────────────────────

  const isInstallment = fee?.paymentStyle === 'installment' || fee?.paymentPattern === 'installment';
  const installments = fee?.semester?.installments || [];

  const totalPaid = useMemo(() => {
    if (!fee) return 0;
    if (fee.payments && Array.isArray(fee.payments)) {
      return fee.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    }
    if (isInstallment) {
      return installments.reduce((sum, i) => sum + (i.paidAmount || (i.status === 'paid' ? i.amount : 0) || 0), 0);
    }
    if (fee.isPaid) return fee.amount || 0;
    return 0;
  }, [fee, installments, isInstallment]);

  const totalExpected = fee?.totalExpectedAmount || fee?.amount || 0;
  const progressPercent = totalExpected > 0 ? Math.min((totalPaid / totalExpected) * 100, 100) : 0;
  const paidCount = installments.filter(i => i.status === 'paid').length;

  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(editAmounts).length > 0 || Object.keys(editDates).length > 0;
  }, [editAmounts, editDates]);

  // ── Handlers ───────────────────────────────────────────────

  const handleTogglePaid = useCallback((inst) => {
    if (inst.status === 'paid') return; // Cannot unpay
    haptics.medium();

    const amountToPay = toNum(editAmounts[inst.id] ?? inst.amount);
    if (amountToPay <= 0) {
      addToast('Enter an amount before marking as paid', 'error');
      haptics.error();
      return;
    }

    payInstallment(fee.id, inst.id, {
      amount: amountToPay,
      method: null,
      paidAt: new Date().toISOString(),
      note: null,
    });

    // Clean up local edit state for this installment
    setEditAmounts(prev => { const { [inst.id]: _, ...rest } = prev; return rest; });
    setEditDates(prev => { const { [inst.id]: _, ...rest } = prev; return rest; });

    haptics.success();
    addToast(`Installment ${inst.part} paid`, 'success');
  }, [fee, editAmounts, payInstallment, addToast]);

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
        const newAmount = editAmounts[inst.id] !== undefined ? toNum(editAmounts[inst.id]) : inst.amount;
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
    const amt = toNum(recordAmount);
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
        <GButton onClick={() => { haptics.light(); navigate('semester-landing'); }}>Back to Semesters</GButton>
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
                onChange={(e) => setEditAmounts(prev => ({ ...prev, [inst.id]: sanitize(e.target.value) }))}
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
                Paid {formatDate(inst.paidAt)}
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
              onClick={() => { haptics.light(); navigate('semester-landing'); }}
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
            {totalExpected > 0 && (
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
                  ৳{(fee.amount || 0).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Status</p>
                <p className={`text-sm font-semibold ${fee.isPaid ? (d ? 'text-emerald-400' : 'text-emerald-600') : (d ? 'text-amber-400' : 'text-amber-600')}`}>
                  {fee.isPaid ? 'Paid' : 'Pending'}
                </p>
              </div>
            </div>
            {fee.paidAt && (
              <p className={`text-xs mt-2 ${d ? 'text-surface-500' : 'text-surface-500'}`}>
                <Calendar className="w-3 h-3 inline mr-1" />
                {formatDate(fee.paidAt)}
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
                    onChange={(e) => setRecordAmount(sanitize(e.target.value))}
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
                    disabled={toNum(recordAmount) <= 0}
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
                      {formatDate(payment.paidAt || payment.date)}
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
