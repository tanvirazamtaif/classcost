import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GButton } from '../components/ui';
import { TransactionCard } from '../components/shared/TransactionCard';
import { AmountInput } from '../components/shared/AmountInput';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { createTransaction } from '../core/transactions';

const SPORT_QUICK_ADDS = [
  { id: 'equipment', icon: '👕', label: 'Equipment / Jersey' },
  { id: 'tournament', icon: '🏟️', label: 'Tournament Entry' },
  { id: 'ground', icon: '⚽', label: 'Ground Booking' },
  { id: 'food', icon: '🍕', label: 'Food / Party' },
  { id: 'travel', icon: '🚌', label: 'Travel' },
  { id: 'other', icon: '📦', label: 'Other' },
];

const GENERAL_QUICK_ADDS = [
  { id: 'event', icon: '🎪', label: 'Event Fee' },
  { id: 'materials', icon: '📦', label: 'Materials' },
  { id: 'food', icon: '🍕', label: 'Food / Party' },
  { id: 'travel', icon: '🚌', label: 'Travel' },
  { id: 'competition', icon: '🏆', label: 'Competition' },
  { id: 'other', icon: '📦', label: 'Other' },
];

const SPORT_ICONS = new Set(['⚽', '🏀', '🏏', '🎾', '🏐', '🏸', '🏊', '🏃']);

function getRecurringFeeStatus(rf) {
  if (!rf.lastPaid) return { status: 'unpaid', label: 'Not paid yet', color: 'amber' };
  const days = Math.floor((Date.now() - new Date(rf.lastPaid)) / 86400000);
  if (rf.frequency === 'monthly' && days > 30) return { status: 'overdue', label: 'Overdue', color: 'red' };
  if (rf.frequency === 'monthly' && days > 25) return { status: 'due', label: 'Due soon', color: 'amber' };
  if (rf.frequency === 'semester' && days > 100) return { status: 'due', label: 'Due this semester', color: 'amber' };
  if (rf.frequency === 'yearly' && days > 340) return { status: 'due', label: 'Due soon', color: 'amber' };
  return { status: 'paid', label: 'Paid', color: 'green' };
}

export const ClubDetailPage = () => {
  const { navigate, addToast, theme, routeParams, expenses, addExpense, clubs, updateClub } = useApp();
  const d = theme === 'dark';
  const { clubId, institutionName } = routeParams || {};
  const club = (clubs || []).find(c => c.id === clubId);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [rfLabel, setRfLabel] = useState('');
  const [rfAmount, setRfAmount] = useState('');
  const [rfFreq, setRfFreq] = useState('monthly');
  const [saving, setSaving] = useState(false);

  const isSport = SPORT_ICONS.has(club?.icon);
  const quickAdds = isSport ? SPORT_QUICK_ADDS : GENERAL_QUICK_ADDS;

  const clubExpenses = useMemo(() => {
    return (expenses || []).filter(e => e.meta?.clubId === clubId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [expenses, clubId]);

  const totalSpent = useMemo(() => clubExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [clubExpenses]);

  const handleAddExpense = async () => {
    if (!selectedCat || parseFloat(amount) <= 0) { haptics.error(); return; }
    setSaving(true);
    try {
      await addExpense(createTransaction({
        type: 'education',
        amount: parseFloat(amount),
        details: `${selectedCat.label} — ${club.name}`,
        meta: { clubId: club.id, clubName: club.name, institutionName, subtype: selectedCat.id },
      }));
      haptics.success();
      addToast(`${selectedCat.label} · ৳${parseFloat(amount).toLocaleString()} added`, 'success');
      setShowAddExpense(false); setSelectedCat(null); setAmount(''); setNote('');
    } catch { haptics.error(); }
    finally { setSaving(false); }
  };

  const handleMarkRecurringPaid = async (rf) => {
    haptics.success();
    await addExpense(createTransaction({
      type: 'education', amount: rf.amount,
      details: `${rf.label} — ${club.name}`,
      meta: { clubId: club.id, clubName: club.name, institutionName, subtype: 'recurring_fee', recurringFeeId: rf.id },
    }));
    const updatedFees = (club.recurringFees || []).map(r => r.id === rf.id ? { ...r, lastPaid: new Date().toISOString() } : r);
    updateClub(club.id, { recurringFees: updatedFees });
    addToast(`${rf.label} paid`, 'success');
  };

  const handleAddRecurring = () => {
    if (!rfLabel.trim() || parseFloat(rfAmount) <= 0) { haptics.error(); return; }
    haptics.success();
    const newRf = { id: `rf_${Date.now().toString(36)}`, label: rfLabel.trim(), amount: parseFloat(rfAmount), frequency: rfFreq, lastPaid: null };
    updateClub(club.id, { recurringFees: [...(club.recurringFees || []), newRf] });
    addToast('Recurring fee added', 'success');
    setShowAddRecurring(false); setRfLabel(''); setRfAmount(''); setRfFreq('monthly');
  };

  const inputCls = `w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-500 transition ${d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-50 border-surface-200 text-surface-900'}`;

  if (!club) {
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <p className="text-surface-500 text-sm mb-4">Club not found</p>
        <GButton onClick={() => navigate('education-home')}>Back</GButton>
      </motion.div>
    );
  }

  const statusColors = { green: d ? 'text-emerald-400' : 'text-emerald-600', amber: d ? 'text-amber-400' : 'text-amber-600', red: 'text-red-500' };

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => { haptics.light(); navigate('institution-detail', { params: { institutionName, institutionType: 'university' } }); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-lg font-semibold truncate ${d ? 'text-white' : 'text-surface-900'}`}>{club.icon} {club.name}</h1>
            <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>{institutionName} · {club.type}</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">
        {/* Summary */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-4 text-white">
          <p className="text-xs opacity-85">Total spent on {club.name}</p>
          <p className="text-2xl font-bold mt-1">৳{totalSpent.toLocaleString()}</p>
          <p className="text-xs opacity-75 mt-1">{clubExpenses.length} expense{clubExpenses.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Recurring Fees */}
        {(club.recurringFees || []).length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Recurring Fees</h2>
            <div className="space-y-2">
              {(club.recurringFees || []).map(rf => {
                const st = getRecurringFeeStatus(rf);
                return (
                  <div key={rf.id} className={`flex items-center justify-between p-3.5 rounded-xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
                    <div>
                      <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{rf.label}</p>
                      <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>৳{rf.amount.toLocaleString()} / {rf.frequency}</p>
                    </div>
                    {st.status === 'paid' ? (
                      <span className={`text-xs font-medium flex items-center gap-1 ${statusColors[st.color]}`}><Check className="w-3 h-3" /> {st.label}</span>
                    ) : (
                      <GButton size="sm" onClick={() => handleMarkRecurringPaid(rf)}>{st.label === 'Not paid yet' ? 'Pay' : st.label}</GButton>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add recurring fee */}
        {!showAddRecurring ? (
          <button onClick={() => { haptics.light(); setShowAddRecurring(true); }}
            className={`text-xs font-medium ${d ? 'text-primary-400' : 'text-primary-600'}`}>+ Add recurring fee</button>
        ) : (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>New Recurring Fee</p>
              <input type="text" placeholder="e.g., Monthly Contribution" value={rfLabel} onChange={(e) => setRfLabel(e.target.value)} className={inputCls} autoFocus />
              <AmountInput value={rfAmount} onChange={setRfAmount} dark={d} size="sm" />
              <div className="flex flex-wrap gap-1.5">
                {['monthly', 'semester', 'yearly', 'one-time'].map(f => (
                  <button key={f} onClick={() => setRfFreq(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${rfFreq === f ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'}`}>{f}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <GButton variant="secondary" fullWidth onClick={() => setShowAddRecurring(false)}>Cancel</GButton>
                <GButton fullWidth onClick={handleAddRecurring} disabled={!rfLabel.trim() || parseFloat(rfAmount) <= 0}>Add</GButton>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Recent Expenses */}
        {clubExpenses.length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Recent Expenses</h2>
            <div className="space-y-2">
              {clubExpenses.slice(0, 10).map((exp, i) => (
                <TransactionCard key={exp.id || i} transaction={exp} dark={d} animationDelay={i * 0.03} />
              ))}
            </div>
          </div>
        )}

        {/* Add Expense */}
        {!showAddExpense ? (
          <GButton fullWidth variant="secondary" onClick={() => { haptics.light(); setShowAddExpense(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Expense
          </GButton>
        ) : (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Add Expense</p>
              <div className="flex flex-wrap gap-1.5">
                {quickAdds.map(cat => (
                  <button key={cat.id} onClick={() => { haptics.light(); setSelectedCat(cat); }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${selectedCat?.id === cat.id ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'}`}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
              {selectedCat && <AmountInput value={amount} onChange={setAmount} dark={d} size="sm" autoFocus />}
              {selectedCat && (
                <input type="text" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
              )}
              <div className="flex gap-2">
                <GButton variant="secondary" fullWidth onClick={() => { setShowAddExpense(false); setSelectedCat(null); setAmount(''); }}>Cancel</GButton>
                <GButton fullWidth onClick={handleAddExpense} loading={saving} disabled={!selectedCat || parseFloat(amount) <= 0}>Save</GButton>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {clubExpenses.length === 0 && !showAddExpense && (
          <div className={`text-center py-8 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
            <p className="text-sm">No expenses recorded for this club yet</p>
          </div>
        )}
      </main>
    </motion.div>
  );
};

export default ClubDetailPage;
