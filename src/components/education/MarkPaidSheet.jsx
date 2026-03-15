import React, { useState, useMemo } from 'react';
import { Calendar, Check, Clock, Percent, Hash, AlertCircle } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { GButton } from '../ui/GButton';
import { useEducationFees } from '../../contexts/EducationFeeContext';
import { PAYMENT_METHODS, STATUS_CONFIG } from '../../types/educationFees';
import { haptics } from '../../lib/haptics';

export const MarkPaidSheet = ({ isOpen, onClose, upcomingPayment }) => {
  const {
    recordPayment,
    recordPartialPayment,
    recordPerClassPayment,
    updateFeeAmount,
    payInstallment,
  } = useEducationFees();

  const [paymentType, setPaymentType] = useState('full');
  const [amount, setAmount] = useState('');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [remainingDueDate, setRemainingDueDate] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [lateFee, setLateFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [classCount, setClassCount] = useState('');
  const [saving, setSaving] = useState(false);

  if (!upcomingPayment) return null;

  const {
    fee,
    type: paymentCategory,
    amount: dueAmount,
    remainingAmount,
    paidAmount: alreadyPaid,
    period,
    installment,
    status,
  } = upcomingPayment;

  const isPerClass = paymentCategory === 'per_class';
  const isInstallment = paymentCategory === 'installment';
  const isPartiallyPaid = alreadyPaid > 0;
  const actualDueAmount = remainingAmount || dueAmount;
  const isOverdue = status === 'overdue';
  const ratePerClass = fee.perClass?.ratePerClass || 0;

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;

  const finalPaymentAmount = useMemo(() => {
    let base = 0;
    if (isPerClass) {
      base = (Number(classCount) || 0) * ratePerClass;
    } else if (paymentType === 'full') {
      base = actualDueAmount;
    } else if (paymentType === 'partial') {
      base = Number(amount) || 0;
    } else if (paymentType === 'different') {
      base = Number(newAmount) || 0;
    }
    return base + (Number(lateFee) || 0) - (Number(discount) || 0);
  }, [paymentType, amount, newAmount, lateFee, discount, actualDueAmount, isPerClass, classCount, ratePerClass]);

  const handleSave = async () => {
    haptics.success();
    setSaving(true);

    try {
      const paymentData = {
        amount: finalPaymentAmount,
        paidAt: paidDate,
        method: paymentMethod,
        forPeriod: period,
        isPartial: paymentType === 'partial',
        lateFee: Number(lateFee) || 0,
        discount: Number(discount) || 0,
        discountReason: discountReason || null,
        remainingDueDate: paymentType === 'partial' ? remainingDueDate : null,
      };

      if (isPerClass) {
        recordPerClassPayment(fee.id, { ...paymentData, classCount: Number(classCount) });
      } else if (isInstallment && installment) {
        payInstallment(fee.id, installment.id, paymentData);
      } else if (paymentType === 'different') {
        updateFeeAmount(fee.id, Number(newAmount), paidDate, 'Fee changed');
        recordPayment(fee.id, {
          ...paymentData,
          amount: Number(newAmount) + (Number(lateFee) || 0) - (Number(discount) || 0),
        });
      } else if (paymentType === 'partial') {
        recordPartialPayment(fee.id, paymentData);
      } else {
        recordPayment(fee.id, paymentData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to record payment:', error);
      haptics.error();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Mark as Paid">
      <div className="space-y-4">
        {/* Fee Header */}
        <div className={`text-center p-4 rounded-xl ${statusConfig.bgClass}`}>
          <span className="text-4xl">{fee.icon}</span>
          <p className="font-semibold text-surface-900 dark:text-white mt-2">{fee.name || fee.feeType}</p>
          {isInstallment && installment && (
            <p className="text-sm text-surface-500">Part {installment.part} of {fee.semester?.installments?.length}</p>
          )}
          <p className="text-sm text-surface-500">{period}</p>
          {isOverdue && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-danger-600 bg-danger-100 dark:bg-danger-900/30 px-2 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" /> Overdue
            </div>
          )}
        </div>

        {/* Amount Due (not for per-class) */}
        {!isPerClass && (
          <div className="bg-surface-50 dark:bg-surface-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-500">Amount Due</span>
              <span className="text-2xl font-bold text-surface-900 dark:text-white">৳{actualDueAmount.toLocaleString()}</span>
            </div>
            {isPartiallyPaid && (
              <p className="text-xs text-warning-600 mt-1">৳{alreadyPaid.toLocaleString()} already paid</p>
            )}
          </div>
        )}

        {/* Per-Class Input */}
        {isPerClass && (
          <div>
            <label className="text-sm text-surface-500 mb-2 flex items-center gap-2">
              <Hash className="w-4 h-4" /> Number of classes
            </label>
            <input
              type="number" value={classCount} onChange={(e) => setClassCount(e.target.value)}
              placeholder="0" autoFocus
              className="w-full p-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl text-lg font-semibold text-surface-900 dark:text-white outline-none"
            />
            {classCount && (
              <p className="text-sm text-surface-500 mt-2">
                {classCount} × ৳{ratePerClass.toLocaleString()} = <span className="font-semibold text-primary-600">৳{(Number(classCount) * ratePerClass).toLocaleString()}</span>
              </p>
            )}
          </div>
        )}

        {/* Payment Type */}
        {!isPerClass && (
          <div>
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">How much did you pay?</p>
            <div className="space-y-2">
              {[
                { id: 'full', label: `Full amount (৳${actualDueAmount.toLocaleString()})` },
                { id: 'partial', label: 'Partial payment' },
              ].map(opt => (
                <label key={opt.id} className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition ${
                  paymentType === opt.id ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500' : 'bg-surface-50 dark:bg-surface-800'
                }`}>
                  <input type="radio" checked={paymentType === opt.id} onChange={() => setPaymentType(opt.id)} className="w-4 h-4 accent-primary-600" />
                  <span className="text-sm text-surface-700 dark:text-surface-300">{opt.label}</span>
                </label>
              ))}
              {fee.recurring && (
                <label className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition ${
                  paymentType === 'different' ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500' : 'bg-surface-50 dark:bg-surface-800'
                }`}>
                  <input type="radio" checked={paymentType === 'different'} onChange={() => setPaymentType('different')} className="w-4 h-4 accent-primary-600" />
                  <span className="text-sm text-surface-700 dark:text-surface-300">Different amount (fee changed)</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Partial Amount */}
        {paymentType === 'partial' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-surface-500 mb-1 block">Amount paying now</label>
              <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-3 bg-white dark:bg-surface-900">
                <span className="text-surface-400 mr-2">৳</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus
                  className="w-full bg-transparent outline-none text-lg font-semibold text-surface-900 dark:text-white" />
              </div>
              {amount && <p className="text-xs text-surface-500 mt-1">Remaining: ৳{(actualDueAmount - Number(amount)).toLocaleString()}</p>}
            </div>
            <div>
              <label className="text-sm text-surface-500 mb-1 block">When will you pay the rest?</label>
              <input type="date" value={remainingDueDate} onChange={(e) => setRemainingDueDate(e.target.value)}
                className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white" />
            </div>
          </div>
        )}

        {/* Different Amount */}
        {paymentType === 'different' && (
          <div>
            <label className="text-sm text-surface-500 mb-1 block">New fee amount</label>
            <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-3 bg-white dark:bg-surface-900">
              <span className="text-surface-400 mr-2">৳</span>
              <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0" autoFocus
                className="w-full bg-transparent outline-none text-lg font-semibold text-surface-900 dark:text-white" />
            </div>
            <p className="text-xs text-surface-500 mt-1">This will update your recurring fee amount</p>
          </div>
        )}

        {/* Late Fee & Discount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-surface-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Late fee</label>
            <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2.5 bg-white dark:bg-surface-900">
              <span className="text-surface-400 mr-1 text-sm">৳</span>
              <input type="number" value={lateFee} onChange={(e) => setLateFee(e.target.value)} placeholder="0"
                className="w-full bg-transparent outline-none text-sm text-surface-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="text-sm text-surface-500 mb-1 flex items-center gap-1"><Percent className="w-3 h-3" />Discount</label>
            <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2.5 bg-white dark:bg-surface-900">
              <span className="text-surface-400 mr-1 text-sm">৳</span>
              <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0"
                className="w-full bg-transparent outline-none text-sm text-surface-900 dark:text-white" />
            </div>
          </div>
        </div>

        {discount && (
          <input type="text" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)}
            placeholder="Discount reason (e.g., Sibling discount)"
            className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white" />
        )}

        {/* Payment Date */}
        <div>
          <label className="text-sm text-surface-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />When did you pay?</label>
          <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)}
            className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white" />
        </div>

        {/* Payment Method */}
        <div>
          <label className="text-sm text-surface-500 mb-2 block">Payment method</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map(method => (
              <button key={method.id} onClick={() => { haptics.light(); setPaymentMethod(paymentMethod === method.id ? null : method.id); }}
                className={`px-3 py-2 rounded-full text-sm transition ${
                  paymentMethod === method.id ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300'
                }`}>{method.icon} {method.label}</button>
            ))}
          </div>
        </div>

        {/* Total Summary */}
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Total Paid</span>
            <span className="text-xl font-bold text-primary-600">৳{finalPaymentAmount.toLocaleString()}</span>
          </div>
          {(lateFee || discount) && (
            <div className="text-xs text-surface-500 mt-1 space-y-0.5">
              {lateFee && <div>+ Late fee: ৳{lateFee}</div>}
              {discount && <div>- Discount: ৳{discount}</div>}
            </div>
          )}
        </div>

        <GButton fullWidth size="lg" onClick={handleSave} loading={saving}
          disabled={
            saving ||
            (paymentType === 'partial' && !amount) ||
            (paymentType === 'different' && !newAmount) ||
            (isPerClass && !classCount) ||
            finalPaymentAmount <= 0
          }>
          <Check className="w-4 h-4 mr-2" /> Confirm Payment
        </GButton>
      </div>
    </BottomSheet>
  );
};

export default MarkPaidSheet;
