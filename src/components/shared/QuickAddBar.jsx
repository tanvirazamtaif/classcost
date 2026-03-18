import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { fadeInUp } from '../../lib/animations';
import { createTransaction } from '../../core/transactions';
import { deriveQuickAdds } from '../../core/quickTemplates';

/**
 * Quick Add bar — horizontal scroll of 1-tap expense shortcuts.
 *
 * Pure UI component. All eligibility logic, defaults, and pattern
 * learning live in core/quickTemplates.js.
 *
 * Usage: <QuickAddBar expenses={expenses} addExpense={addExpense} addToast={addToast} dark={d} />
 */
export const QuickAddBar = React.memo(({ expenses, addExpense, addToast, dark }) => {
  const d = dark;
  const quickAdds = useMemo(() => deriveQuickAdds(expenses), [expenses]);
  const [savingId, setSavingId] = useState(null);

  const handleQuickAdd = useCallback(async (item) => {
    setSavingId(item.id);
    try {
      await addExpense(createTransaction({
        type: item.category,
        amount: item.amount,
        details: item.label,
        meta: { label: item.label, source: 'quick_add' },
      }));
      addToast?.(`${item.label} · ৳${item.amount}`, 'success');
    } catch {
      addToast?.('Failed to save', 'error');
    } finally {
      setTimeout(() => setSavingId(null), 600);
    }
  }, [addExpense, addToast]);

  if (quickAdds.length === 0) return null;

  return (
    <motion.div variants={fadeInUp} className="mb-6">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Zap className={`w-3.5 h-3.5 ${d ? 'text-amber-400' : 'text-amber-500'}`} />
        <h2 className={`text-xs font-medium ${d ? 'text-surface-400' : 'text-surface-500'}`}>Quick Add</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {quickAdds.map(item => {
          const isSaving = savingId === item.id;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => !isSaving && handleQuickAdd(item)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all ${
                isSaving
                  ? 'bg-emerald-500/10 border-emerald-500/30 scale-95'
                  : d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
              }`}
            >
              {isSaving ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <span className="text-base">{item.icon}</span>
              )}
              <div className="text-left">
                <p className={`text-xs font-medium leading-tight ${isSaving ? 'text-emerald-500' : d ? 'text-white' : 'text-surface-900'}`}>
                  {item.label}
                </p>
                <p className={`text-[10px] leading-tight ${isSaving ? 'text-emerald-400' : d ? 'text-surface-500' : 'text-surface-400'}`}>
                  ৳{item.amount}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
});
