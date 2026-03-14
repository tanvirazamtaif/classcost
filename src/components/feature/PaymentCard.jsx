import React from 'react';
import { motion } from 'framer-motion';

const categoryIcons = {
  education: '🎓',
  transport: '🚌',
  canteen: '🍽️',
  hostel: '🏠',
  books: '📚',
  uniform: '👔',
  other: '📦',
};

const categoryLabels = {
  education: 'Education',
  transport: 'Transport',
  canteen: 'Food',
  hostel: 'Housing',
  books: 'Books',
  uniform: 'Uniform',
  other: 'Other',
};

export const PaymentCard = ({ payment, currencySymbol = '৳', onClick }) => {
  const icon = categoryIcons[payment.type] || '📦';
  const amount = Number(payment.amount) || 0;

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
            {payment.label || categoryLabels[payment.type] || payment.type || 'Payment'}
          </p>
          {payment.details && (
            <p className="text-xs text-surface-500 truncate max-w-[150px]">{payment.details}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-surface-900 dark:text-white">
          {currencySymbol}{amount.toLocaleString('en-BD')}
        </p>
        <p className="text-xs text-surface-500">
          {payment.date ? new Date(payment.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : ''}
        </p>
      </div>
    </motion.div>
  );
};
