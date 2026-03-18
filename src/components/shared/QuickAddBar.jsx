import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { fadeInUp } from '../../lib/animations';
import { getCategoryIcon, createTransaction } from '../../core/transactions';

// ═══════════════════════════════════════════════════════════════
// QUICK ADD LOGIC
// ═══════════════════════════════════════════════════════════════

// Categories eligible for Quick Add (routine daily costs only)
const ELIGIBLE_CATEGORIES = new Set(['transport', 'canteen', 'books', 'other']);

// Transport subtypes that are NOT eligible (rare/event-based)
const EXCLUDED_SUBTYPES = new Set([
  'hometown_travel', 'go_home', 'come_to_dhaka', 'admission_exam_travel',
]);

// System defaults shown when no learned patterns exist
const SYSTEM_DEFAULTS = [
  { id: 'default_transport', label: 'University Transport', category: 'transport', amount: 50 },
  { id: 'default_food', label: 'Food', category: 'canteen', amount: 100 },
  { id: 'default_photocopy', label: 'Photocopy', category: 'other', amount: 10 },
];

/**
 * Derive Quick Add items from user's expense history.
 * Returns system defaults + learned patterns (max 5 items).
 */
function deriveQuickAdds(expenses) {
  const patterns = {};
  const recent = (expenses || []).slice(-100);

  recent.forEach(exp => {
    if (!ELIGIBLE_CATEGORIES.has(exp.type)) return;
    const meta = exp.meta || {};
    if (exp.type === 'transport' && (EXCLUDED_SUBTYPES.has(meta.transportType) || EXCLUDED_SUBTYPES.has(meta.transportSubtype))) return;

    const label = exp.details || meta.label || exp.label || '';
    if (!label || label.length < 2) return;

    const key = `${exp.type}::${label.toLowerCase().trim()}`;
    if (!patterns[key]) patterns[key] = { count: 0, totalAmount: 0, label, category: exp.type, lastAmount: 0 };
    patterns[key].count++;
    patterns[key].totalAmount += Number(exp.amount) || 0;
    patterns[key].lastAmount = Number(exp.amount) || 0;
  });

  // Learned: must appear 2+ times
  const learned = Object.values(patterns)
    .filter(p => p.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((p, i) => ({
      id: `learned_${i}`,
      label: p.label,
      icon: getCategoryIcon(p.category),
      category: p.category,
      amount: p.lastAmount || Math.round(p.totalAmount / p.count),
      source: 'learned',
    }));

  if (learned.length >= 3) return learned.slice(0, 5);

  // Fill with defaults that don't overlap
  const usedLabels = new Set(learned.map(l => l.label.toLowerCase()));
  const defaults = SYSTEM_DEFAULTS
    .filter(d => !usedLabels.has(d.label.toLowerCase()))
    .map(d => ({ ...d, icon: getCategoryIcon(d.category) }));

  return [...learned, ...defaults].slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

/**
 * Quick Add bar — horizontal scroll of 1-tap expense shortcuts.
 * Learns from user's expense history and shows smart defaults.
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
