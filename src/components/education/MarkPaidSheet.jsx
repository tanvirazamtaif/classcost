import React, { useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { GButton } from '../ui/GButton';
import { useEducationFees } from '../../contexts/EducationFeeContext';
import { PAYMENT_METHODS } from '../../types/educationFees';
import { getCurrentAmount } from '../../types/educationFeeSchema';
import { haptics } from '../../lib/haptics';

export const MarkPaidSheet = ({ isOpen, onClose, upcomingPayment }) => {
  const { recordPayment, recordPartialPayment, updateFeeAmount, payInstallment } = useEducationFees();

  const [paymentType, setPaymentType] = useState('full');
  const [amount, setAmount] = useState('');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [remainingDueDate, setRemainingDueDate] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [lateFee, setLateFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!upcomingPayment) return null;

  const { fee, type: paymentCategory, amount: dueAmount, remainingAmount, period, installment } = upcomingPayment;
  const isPartiallyPaid = upcomingPayment.paidAmount > 0;
  const actualDueAmount = remainingAmount || dueAmount;

  const handleSave = async () => {
    haptics.success();
    setSaving(true);

    try {
      const finalAmount = paymentType === 'full' ? actualDueAmount : Number(amount);
      const paymentData = {
        amount: finalAmount + (Number(lateFee) || 0) - (Number(discount) || 0),
        paidAt: paidDate,
        method: paymentMethod,
        forPeriod: period,
        isPartial: paymentType === 'partial',
        lateFee: Number(lateFee) || 0,
        discount: Number(discount) || 0,
        discountReason: discountReason || null,
        remainingDueDate: paymentType === 'partial' ? remainingDueDate : null,
      };

      if (paymentCategory === 'installment' && installment) {
        payInstallment(fee.id, installment.id, paymentData);
      } else if (paymentType === 'different') {
        updateFeeAmount(fee.id, Number(newAmount), paidDate, 'Fee changed');
        recordPayment(fee.id, { ...paymentData, amount: Number(newAmount) + (Number(lateFee) || 0) - (Number(discount) || 0) });
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
        {/* Fee Info */}
        <div className="text-center pb-4 border-b border-surface-200 dark:border-surface-800">
          <span className="text-4xl">{fee.icon}</span>
          <p className="font-medium text-surface-900 dark:text-white mt-2">{fee.name || fee.feeType}</p>
          {paymentCategory === 'installment' && installment && (
            <p className="text-sm text-surface-500">Part {installment.part} of {fee.semester?.installments?.length}</p>
          )}
          <p className="text-sm text-surface-500">{period}</p>
        </div>

        {/* Amount Due */}
        <div className="bg-surface-50 dark:bg-surface-800 rounded-xl p-4">
          <p className="text-sm text-surface-500">Amount Due</p>
          <p className="text-2xl font-bold text-surface-900 dark:text-white">৳{actualDueAmount.toLocaleString()}</p>
          {isPartiallyPaid && (
            <p className="text-xs text-warning-500 mt-1">৳{upcomingPayment.paidAmount.toLocaleString()} already paid</p>
          )}
        </div>

        {/* Payment Type */}
        <div>
          <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">How much did you pay?</p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl cursor-pointer">
              <input type="radio" checked={paymentType === 'full'} onChange={() => setPaymentType('full')} className="w-4 h-4 accent-primary-600" />
              <span className="text-sm text-surface-700 dark:text-surface-300">Full amount (৳{actualDueAmount.toLocaleString()})</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl cursor-pointer">
              <input type="radio" checked={paymentType === 'partial'} onChange={() => setPaymentType('partial')} className="w-4 h-4 accent-primary-600" />
              <span className="text-sm text-surface-700 dark:text-surface-300">Partial payment</span>
            </label>
            {fee.recurring && (
              <label className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl cursor-pointer">
                <input type="radio" checked={paymentType === 'different'} onChange={() => setPaymentType('different')} className="w-4 h-4 accent-primary-600" />
                <span className="text-sm text-surface-700 dark:text-surface-300">Different amount (fee changed)</span>
              </label>
            )}
          </div>
        </div>

        {/* Partial */}
        {paymentType === 'partial' && (
          <>
            <div>
              <label className="text-sm text-surface-500 mb-1 block">Amount paying now</label>
              <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-3">
                <span className="text-surface-500 mr-2">৳</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
                  className="w-full bg-transparent outline-none text-lg font-semibold text-surface-900 dark:text-white" />
              </div>
              {amount && <p className="text-xs text-surface-500 mt-1">Remaining: ৳{(actualDueAmount - Number(amount)).toLocaleString()}</p>}
            </div>
            <div>
              <label className="text-sm text-surface-500 mb-1 block">When will you pay the rest?</label>
              <input type="date" value={remainingDueDate} onChange={(e) => setRemainingDueDate(e.target.value)}
                className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white" />
            </div>
          </>
        )}

        {/* Different amount */}
        {paymentType === 'different' && (
          <div>
            <label className="text-sm text-surface-500 mb-1 block">New fee amount</label>
            <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-3">
              <span className="text-surface-500 mr-2">৳</span>
              <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0"
                className="w-full bg-transparent outline-none text-lg font-semibold text-surface-900 dark:text-white" />
            </div>
            <p className="text-xs text-surface-500 mt-1">This will update your recurring fee amount</p>
          </div>
        )}

        {/* Late Fee & Discount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-surface-500 mb-1 block">Late fee</label>
            <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2">
              <span className="text-surface-500 mr-1 text-sm">৳</span>
              <input type="number" value={lateFee} onChange={(e) => setLateFee(e.target.value)} placeholder="0"
                className="w-full bg-transparent outline-none text-sm text-surface-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="text-sm text-surface-500 mb-1 block">Discount</label>
            <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2">
              <span className="text-surface-500 mr-1 text-sm">৳</span>
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
          <label className="text-sm text-surface-500 mb-2 block">Payment method (optional)</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map(method => (
              <button key={method.id} onClick={() => { haptics.light(); setPaymentMethod(method.id); }}
                className={`px-3 py-2 rounded-full text-sm transition ${
                  paymentMethod === method.id ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300'
                }`}>{method.icon} {method.label}</button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Total Paid</span>
            <span className="text-xl font-bold text-primary-600">
              ৳{(
                (paymentType === 'full' ? actualDueAmount :
                 paymentType === 'partial' ? (Number(amount) || 0) :
                 (Number(newAmount) || 0)) +
                (Number(lateFee) || 0) -
                (Number(discount) || 0)
              ).toLocaleString()}
            </span>
          </div>
        </div>

        <GButton fullWidth size="lg" onClick={handleSave} loading={saving}
          disabled={saving || (paymentType === 'partial' && !amount) || (paymentType === 'different' && !newAmount)}>
          <Check className="w-4 h-4 mr-2" /> Confirm Payment
        </GButton>
      </div>
    </BottomSheet>
  );
};
