import React from 'react';
import { motion } from 'framer-motion';
import { getCategoryIcon, getTransactionLabel, getTransactionSublabel, formatTransactionDate } from '../../core/transactions';

/**
 * Payment card used in Dashboard Recent transactions list.
 * Now delegates to the shared category registry from core/transactions.
 */
export const PaymentCard = ({ payment, currencySymbol = '৳', onClick }) => {
  const icon = getCategoryIcon(payment.type);
  const amount = Number(payment.amount) || 0;
  const label = getTransactionLabel(payment);
  const sublabel = getTransactionSublabel(payment);
  const dateStr = formatTransactionDate(payment.date);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center justify-between py-3 cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-medium text-surface-900 dark:text-white">
            {label}
          </p>
          {sublabel && (
            <p className="text-xs text-surface-500 truncate max-w-[150px]">
              {sublabel}
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-surface-900 dark:text-white">
          {currencySymbol}{amount.toLocaleString('en-BD')}
        </p>
        <p className="text-xs text-surface-500">{dateStr}</p>
      </div>
    </motion.div>
  );
};
