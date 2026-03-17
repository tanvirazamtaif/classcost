import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CircleDollarSign, Calendar, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { GButton } from '../ui/GButton';
import { useEducationFees } from '../../contexts/EducationFeeContext';
import { useApp } from '../../contexts/AppContext';
import { haptics } from '../../lib/haptics';

export const SemesterDetailSheet = ({ isOpen, onClose, fee }) => {
  const { payInstallment, recordPayment, addToast, theme } = {
    ...useEducationFees(),
    ...useApp(),
  };
  const d = theme === 'dark';

  const [payingInstallmentId, setPayingInstallmentId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [saving, setSaving] = useState(false);

  if (!fee) return null;

  const installments = fee.semester?.installments || fee.installmentData || [];
  const totalAmount = fee.semester?.totalAmount || fee.amount || 0;
  const totalPaid = fee.payments?.reduce((s, p) => s + (p.isRefund ? -p.amount : p.amount), 0) || 0;
  const remaining = totalAmount - totalPaid;
  const progressPct = totalAmount > 0 ? Math.min((totalPaid / totalAmount) * 100, 100) : 0;
  const semesterName = fee.semesterName || fee.name || 'Semester';

  const handlePayInstallment = async (inst) => {
    const amount = Number(payAmount) || inst.amount - (inst.paidAmount || 0);
    if (amount <= 0) { addToast('Enter a valid amount', 'error'); return; }

    haptics.success();
    setSaving(true);
    try {
      payInstallment(fee.id, inst.id, {
        amount,
        method: 'cash',
        paidAt: new Date().toISOString(),
      });
      addToast(`Paid ৳${amount.toLocaleString()}`, 'success');
      setPayingInstallmentId(null);
      setPayAmount('');
    } catch (e) {
      haptics.error();
      addToast('Payment failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMoney = () => {
    const amount = Number(addMoneyAmount);
    if (!amount || amount <= 0) { addToast('Enter a valid amount', 'error'); return; }

    haptics.success();
    recordPayment(fee.id, {
      amount,
      method: 'cash',
      paidAt: new Date().toISOString(),
    });
    addToast(`Added ৳${amount.toLocaleString()}`, 'success');
    setShowAddMoney(false);
    setAddMoneyAmount('');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'partial': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
      case 'overdue': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'upcoming': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'text-surface-500 bg-surface-100 dark:bg-surface-800 dark:text-surface-400';
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={semesterName}>
      {/* Summary Card */}
      <div className={`rounded-2xl p-4 mb-5 ${d ? 'bg-surface-800' : 'bg-surface-50'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-surface-500">Total Amount</p>
            <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>
              ৳{totalAmount.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-surface-500">Remaining</p>
            <p className={`text-lg font-semibold ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              ৳{remaining.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`h-2.5 rounded-full ${d ? 'bg-surface-700' : 'bg-surface-200'} overflow-hidden`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full ${progressPct >= 100 ? 'bg-emerald-500' : 'bg-primary-600'}`}
          />
        </div>
        <p className="text-xs text-surface-500 mt-1.5">
          {Math.round(progressPct)}% paid &middot; ৳{totalPaid.toLocaleString()} of ৳{totalAmount.toLocaleString()}
        </p>
      </div>

      {/* Installments */}
      {installments.length > 0 && (
        <div className="mb-5">
          <h3 className={`text-sm font-semibold mb-3 ${d ? 'text-surface-300' : 'text-surface-700'}`}>
            Installments ({installments.length})
          </h3>
          <div className="space-y-3">
            {installments.map((inst, i) => {
              const isPaid = inst.status === 'paid';
              const instRemaining = inst.amount - (inst.paidAmount || 0);
              const isExpanded = payingInstallmentId === inst.id;

              return (
                <div key={inst.id || i}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      haptics.light();
                      if (isPaid) return;
                      setPayingInstallmentId(isExpanded ? null : inst.id);
                      setPayAmount(String(instRemaining));
                    }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition ${
                      isPaid
                        ? d ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'
                        : isExpanded
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                        : d ? 'bg-surface-800 border-surface-700' : 'bg-white border-surface-200'
                    }`}
                  >
                    {/* Status icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isPaid ? 'bg-emerald-500' : d ? 'bg-surface-700' : 'bg-surface-200'
                    }`}>
                      {isPaid ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <span className={`text-xs font-bold ${d ? 'text-surface-400' : 'text-surface-500'}`}>{inst.part || i + 1}</span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${isPaid ? 'line-through text-surface-400' : d ? 'text-white' : 'text-surface-900'}`}>
                        Part {inst.part || i + 1} &middot; ৳{inst.amount?.toLocaleString()}
                      </p>
                      <p className="text-xs text-surface-500">
                        {inst.dueDate ? `Due ${formatDate(inst.dueDate)}` : ''}
                        {isPaid && inst.paidAt ? ` · Paid ${formatDate(inst.paidAt)}` : ''}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(inst.status)}`}>
                      {isPaid ? 'Paid' : inst.status === 'partial' ? `৳${instRemaining.toLocaleString()} left` : inst.status || 'Unpaid'}
                    </span>

                    {!isPaid && (
                      isExpanded ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />
                    )}
                  </motion.button>

                  {/* Pay this installment */}
                  <AnimatePresence>
                    {isExpanded && !isPaid && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`mt-1 p-3 rounded-xl ${d ? 'bg-surface-800/50' : 'bg-surface-50'}`}>
                          <div className="flex gap-2">
                            <div className={`flex-1 flex items-center border rounded-lg px-3 py-2 ${d ? 'border-surface-700 bg-surface-800' : 'border-surface-200 bg-white'}`}>
                              <span className="text-surface-400 mr-1">৳</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                className={`w-full bg-transparent outline-none text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}
                                placeholder="Amount"
                              />
                            </div>
                            <GButton size="sm" onClick={() => handlePayInstallment(inst)} loading={saving}>
                              Pay
                            </GButton>
                          </div>
                          {instRemaining !== inst.amount && (
                            <p className="text-xs text-surface-500 mt-1.5">
                              Already paid: ৳{(inst.paidAmount || 0).toLocaleString()} · Remaining: ৳{instRemaining.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No installments — show simple pay */}
      {installments.length === 0 && remaining > 0 && (
        <div className="mb-5">
          <p className={`text-sm mb-3 ${d ? 'text-surface-400' : 'text-surface-600'}`}>
            No installments set up. You can record payments directly.
          </p>
        </div>
      )}

      {/* Add / Subtract Money */}
      {remaining > 0 && (
        <div className="mb-4">
          {!showAddMoney ? (
            <button
              onClick={() => { haptics.light(); setShowAddMoney(true); }}
              className="flex items-center gap-2 text-sm text-primary-600 font-medium"
            >
              <Plus className="w-4 h-4" /> Record a payment
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${d ? 'bg-surface-800 border-surface-700' : 'bg-surface-50 border-surface-200'}`}
            >
              <p className={`text-sm font-medium mb-2 ${d ? 'text-surface-300' : 'text-surface-700'}`}>Record Payment</p>
              <div className="flex gap-2">
                <div className={`flex-1 flex items-center border rounded-lg px-3 py-2.5 ${d ? 'border-surface-700 bg-surface-900' : 'border-surface-200 bg-white'}`}>
                  <span className="text-surface-400 mr-1">৳</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={addMoneyAmount}
                    onChange={(e) => setAddMoneyAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="Amount"
                    className={`w-full bg-transparent outline-none text-sm ${d ? 'text-white' : 'text-surface-900'}`}
                    autoFocus
                  />
                </div>
                <GButton onClick={handleAddMoney}>Add</GButton>
                <GButton variant="ghost" onClick={() => { setShowAddMoney(false); setAddMoneyAmount(''); }}>
                  Cancel
                </GButton>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Payment History */}
      {fee.payments?.length > 0 && (
        <div>
          <h3 className={`text-sm font-semibold mb-2 ${d ? 'text-surface-300' : 'text-surface-700'}`}>
            Payment History ({fee.payments.length})
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {[...fee.payments].reverse().slice(0, 10).map((payment, i) => (
              <div key={payment.id || i} className={`flex items-center justify-between py-2 px-3 rounded-lg ${d ? 'bg-surface-800' : 'bg-surface-50'}`}>
                <div className="flex items-center gap-2">
                  <CircleDollarSign className={`w-4 h-4 ${payment.isRefund ? 'text-red-500' : 'text-emerald-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
                      {payment.isRefund ? '-' : '+'}৳{payment.amount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-surface-500">{formatDate(payment.paidAt)}</p>
                  </div>
                </div>
                {payment.method && (
                  <span className="text-xs text-surface-400 capitalize">{payment.method}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
