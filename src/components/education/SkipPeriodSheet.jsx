import React, { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { GButton } from '../ui/GButton';
import { useEducationFees } from '../../contexts/EducationFeeContext';
import { haptics } from '../../lib/haptics';

export const SkipPeriodSheet = ({ isOpen, onClose, upcomingPayment }) => {
  const { skipPeriod } = useEducationFees();
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  if (!upcomingPayment) return null;

  const { fee, period } = upcomingPayment;

  const handleSkip = () => {
    haptics.success();
    const finalReason = reason === 'Other' ? (customReason || 'Other') : (reason || 'Skipped');
    skipPeriod(fee.id, period, finalReason);
    setReason('');
    setCustomReason('');
    onClose();
  };

  const quickReasons = ['Vacation', 'School closed', 'Not attending this month', 'Already covered', 'Other'];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Skip This Month">
      <div className="space-y-4">
        <div className="text-center py-4">
          <span className="text-4xl">{fee.icon}</span>
          <p className="font-medium text-surface-900 dark:text-white mt-2">{fee.name || fee.feeType}</p>
          <p className="text-sm text-surface-500">{period}</p>
        </div>

        <p className="text-sm text-surface-500">Why are you skipping this payment?</p>

        <div className="flex flex-wrap gap-2">
          {quickReasons.map(r => (
            <button
              key={r}
              onClick={() => { haptics.light(); setReason(r); }}
              className={`px-4 py-2 rounded-full text-sm transition ${
                reason === r
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {reason === 'Other' && (
          <input
            type="text"
            placeholder="Enter reason..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none text-surface-900 dark:text-white"
            autoFocus
          />
        )}

        <div className="bg-warning-50 dark:bg-warning-900/20 rounded-xl p-3">
          <p className="text-sm text-warning-700 dark:text-warning-300">
            This will skip the payment for {period}. It won't be marked as overdue.
          </p>
        </div>

        <div className="flex gap-3">
          <GButton variant="secondary" onClick={onClose} fullWidth>Cancel</GButton>
          <GButton onClick={handleSkip} fullWidth disabled={!reason}>Skip</GButton>
        </div>
      </div>
    </BottomSheet>
  );
};

export default SkipPeriodSheet;
