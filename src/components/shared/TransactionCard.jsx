import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Trash2 } from 'lucide-react';
import { getCategoryIcon, getTransactionLabel, getTransactionSublabel, formatTransactionDate } from '../../core/transactions';

/**
 * Shared transaction card for category pages.
 *
 * Replaces the duplicate inline card patterns in TransportPage,
 * StudyMaterialsPage, HousingDetailPage, GeneralCostTrackerPage, etc.
 *
 * Usage:
 *   <TransactionCard transaction={expense} dark={d} onEdit={() => ...} onDelete={() => ...} />
 */
export const TransactionCard = ({
  transaction,
  dark = false,
  icon,           // override icon (defaults to category icon)
  onEdit,         // tap card body to edit
  onDelete,       // delete button
  animationDelay = 0,
}) => {
  const d = dark;
  const label = getTransactionLabel(transaction);
  const sublabel = getTransactionSublabel(transaction);
  const displayIcon = icon || transaction.meta?.icon || getCategoryIcon(transaction.type);
  const amount = Number(transaction.amount) || 0;
  const dateStr = formatTransactionDate(transaction.date || transaction.paidAt || transaction.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className={`flex items-center justify-between p-3.5 rounded-xl border ${
        d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'
      }`}
    >
      {/* Left: icon + label + date */}
      <div
        className={`flex items-center gap-2.5 flex-1 min-w-0 ${onEdit ? 'cursor-pointer' : ''}`}
        onClick={onEdit}
      >
        <span className="text-base shrink-0">{displayIcon}</span>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-surface-900'}`}>
            {label}
          </p>
          {sublabel && (
            <p className={`text-xs truncate ${d ? 'text-surface-500' : 'text-surface-400'}`}>
              {sublabel}
            </p>
          )}
          {transaction.note && !sublabel && (
            <p className={`text-xs truncate ${d ? 'text-surface-500' : 'text-surface-400'}`}>
              {transaction.note}
            </p>
          )}
          {dateStr && (
            <p className={`text-xs flex items-center gap-1 mt-0.5 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
              <Calendar className="w-3 h-3" />
              {dateStr}
            </p>
          )}
        </div>
      </div>

      {/* Right: amount + optional delete */}
      <div className="flex items-center gap-2 shrink-0">
        <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>
          ৳{amount.toLocaleString()}
        </p>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-surface-800' : 'hover:bg-surface-100'}`}
          >
            <Trash2 className="w-3.5 h-3.5 text-danger-500" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
