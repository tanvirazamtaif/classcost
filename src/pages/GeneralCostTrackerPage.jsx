import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { GButton } from '../components/ui';
import { TransactionCard } from '../components/shared/TransactionCard';
import { AmountInput } from '../components/shared/AmountInput';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { validateAmount } from '../core/transactions';

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const GeneralCostTrackerPage = () => {
  const { navigate, addToast, theme, routeParams } = useApp();
  const { activeFees, addFee, deleteFee } = useEducationFees();
  const d = theme === 'dark';

  const costType = routeParams?.costType;

  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [institutionText, setInstitutionText] = useState('');
  const [examName, setExamName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Existing entries for this cost type ─────────────────────

  const entries = useMemo(() => {
    if (!costType) return [];
    return activeFees
      .filter(f => f.feeType === costType.id || f.paymentIntent === costType.id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [activeFees, costType]);

  const totalSpent = useMemo(() => {
    return entries.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [entries]);

  // ── Handlers ────────────────────────────────────────────────

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      haptics.error();
      addToast('Enter a valid amount', 'error');
      return;
    }

    setSaving(true);
    haptics.medium();

    try {
      addFee({
        feeType: costType.id,
        paymentIntent: costType.id,
        name: institutionText || null,
        customTypeName: examName || null,
        icon: costType.icon,
        paymentPattern: 'one_time',
        amount: amt,
        isPaid: true,
        paidAt: date ? new Date(date).toISOString() : new Date().toISOString(),
        note: note || null,
        initialPayment: { amount: amt, method: null, paidAt: date ? new Date(date).toISOString() : new Date().toISOString() },
      });

      haptics.success();
      addToast('Entry added', 'success');
      resetForm();
    } catch (e) {
      haptics.error();
      addToast('Failed to add', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowAdd(false);
    setAmount('');
    setInstitutionText('');
    setExamName('');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
  };

  const handleDelete = (feeId) => {
    haptics.medium();
    deleteFee(feeId);
    addToast('Entry removed', 'success');
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  if (!costType) {
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <p className="text-surface-500 text-sm mb-4">Cost type not found</p>
        <GButton onClick={() => navigate('education-home')}>Back</GButton>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => { haptics.light(); navigate('education-home'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <div>
            <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>
              {costType.icon} {costType.label}
            </h1>
            <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>{costType.desc}</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">

        {/* Summary */}
        {entries.length > 0 && (
          <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Total Spent</p>
                <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>৳{totalSpent.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Entries</p>
                <p className={`text-lg font-semibold ${d ? 'text-surface-300' : 'text-surface-700'}`}>{entries.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Add button */}
        {!showAdd && (
          <GButton fullWidth size="lg" icon={Plus} onClick={() => { haptics.light(); setShowAdd(true); }}>
            Add {costType.label}
          </GButton>
        )}

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}
            >
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>New Entry</p>

              {/* Amount */}
              <AmountInput value={amount} onChange={setAmount} dark={d} size="sm" autoFocus placeholder="Amount" />

              {/* Institution (optional text) */}
              <input
                type="text"
                placeholder="Institution name (optional)"
                value={institutionText}
                onChange={(e) => setInstitutionText(e.target.value)}
                className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-500 transition ${
                  d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-50 border-surface-200 text-surface-900'
                }`}
              />

              {/* Exam/test name for admission test type */}
              {(costType.id === 'admission_test' || costType.id === 'application_fee') && (
                <input
                  type="text"
                  placeholder="Exam / test name (optional)"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-500 transition ${
                    d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-50 border-surface-200 text-surface-900'
                  }`}
                />
              )}

              {/* Date */}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-500 transition ${
                  d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-50 border-surface-200 text-surface-900'
                }`}
              />

              {/* Note */}
              <input
                type="text"
                placeholder="Note (optional)"
                maxLength={100}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-500 transition ${
                  d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-50 border-surface-200 text-surface-900'
                }`}
              />

              <div className="flex gap-2">
                <GButton variant="secondary" fullWidth onClick={resetForm}>Cancel</GButton>
                <GButton fullWidth onClick={handleAdd} loading={saving} disabled={saving || parseFloat(amount) <= 0}>Save</GButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entries list — shared TransactionCard */}
        {entries.length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Entries</h2>
            <div className="space-y-2">
              {entries.map((entry, i) => {
                // Map education fee shape to transaction card shape
                const cardData = {
                  ...entry,
                  details: entry.customTypeName
                    ? `${entry.customTypeName}${entry.name ? ` · ${entry.name}` : ''}`
                    : entry.name || null,
                  date: entry.paidAt || entry.createdAt,
                  type: 'education',
                };
                return (
                  <TransactionCard
                    key={entry.id}
                    transaction={cardData}
                    dark={d}
                    icon={costType.icon}
                    animationDelay={i * 0.03}
                    onDelete={() => handleDelete(entry.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && !showAdd && (
          <div className={`text-center py-12 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
            <span className="text-4xl block mb-3">{costType.icon}</span>
            <p className="text-sm">No entries yet</p>
            <p className="text-xs mt-1">Tap the button above to add your first entry</p>
          </div>
        )}

      </main>
    </motion.div>
  );
};

export default GeneralCostTrackerPage;
