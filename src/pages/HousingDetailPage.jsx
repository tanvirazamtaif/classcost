import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Check, AlertTriangle, LogOut, Pencil } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GButton } from '../components/ui';
import { TransactionCard } from '../components/shared/TransactionCard';
import { AmountInput } from '../components/shared/AmountInput';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { createTransaction, sanitizeAmount, formatTransactionDate, validateAmount } from '../core/transactions';
import { getHousingSetups, updateHousingSetup } from './HousingLandingPage';

// ═══════════════════════════════════════════════════════════════
// HOUSING TYPE META
// ═══════════════════════════════════════════════════════════════

const TYPE_META = {
  apartment: { icon: '🏢', label: 'Apartment' },
  mess: { icon: '🏘️', label: 'Mess' },
  hostel: { icon: '🏨', label: 'Hostel' },
  hotel: { icon: '🏩', label: 'Hotel' },
  dorm: { icon: '🛏️', label: 'Dorm' },
  other: { icon: '🏠', label: 'Other' },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const HousingDetailPage = () => {
  const { navigate, addToast, addExpense, theme, routeParams, expenses } = useApp();
  const d = theme === 'dark';

  const { housingId } = routeParams || {};
  const [setup, setSetup] = useState(() => getHousingSetups().find(h => h.id === housingId));

  // Forms
  const [activeForm, setActiveForm] = useState(null); // null | 'rent' | 'cost' | 'deposit' | 'moveout'
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [costLabel, setCostLabel] = useState('');
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [useDepositForFinal, setUseDepositForFinal] = useState(false);
  const [editingRent, setEditingRent] = useState(false);
  const [newRent, setNewRent] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const inputCls = `w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
    d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
  }`;

  // ── Data (from real transactions only) ──────────────────────

  const allHousingExpenses = useMemo(() => {
    return (expenses || [])
      .filter(e => e.type === 'hostel' && e.meta?.housingId === housingId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [expenses, housingId]);

  // FINANCIAL SEPARATION: rent vs deposit vs other
  const rentPayments = useMemo(() => allHousingExpenses.filter(e => e.meta?.housingType === 'rent'), [allHousingExpenses]);
  const depositPayments = useMemo(() => allHousingExpenses.filter(e => e.meta?.housingType === 'deposit'), [allHousingExpenses]);
  const otherCosts = useMemo(() => allHousingExpenses.filter(e => e.meta?.housingType !== 'rent' && e.meta?.housingType !== 'deposit'), [allHousingExpenses]);

  const totalRentPaid = useMemo(() => rentPayments.reduce((s, e) => s + (Number(e.amount) || 0), 0), [rentPayments]);
  const totalDeposit = useMemo(() => depositPayments.reduce((s, e) => s + (Number(e.amount) || 0), 0), [depositPayments]);
  const totalOther = useMemo(() => otherCosts.reduce((s, e) => s + (Number(e.amount) || 0), 0), [otherCosts]);
  const totalAllSpent = totalRentPaid + totalDeposit + totalOther;

  // ── Form helpers ────────────────────────────────────────────

  const openForm = (form) => {
    haptics.light();
    setActiveForm(form);
    setAmount(form === 'rent' ? String(setup?.monthlyRent || '') : '');
    setCostLabel('');
    setErrors({});
  };

  const closeForm = () => {
    setActiveForm(null);
    setAmount('');
    setCostLabel('');
    setErrors({});
  };

  // ── Handlers ────────────────────────────────────────────────

  const handlePayRent = async () => {
    const v = validateAmount(parseFloat(amount));
    if (!v.valid) { setErrors({ amount: v.error }); haptics.error(); return; }
    setSaving(true);
    try {
      await addExpense(createTransaction({
        type: 'hostel',
        amount: parseFloat(amount),
        details: `Rent — ${setup.name}`,
        date: `${month}-01`,
        meta: { housingId, housingType: 'rent', month, label: `Rent — ${setup.name}` },
      }));
      haptics.success();
      addToast(`Rent ৳${parseFloat(amount).toLocaleString()} recorded`, 'success');
      closeForm();
    } catch { haptics.error(); addToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleAddDeposit = async () => {
    const v = validateAmount(parseFloat(amount));
    if (!v.valid) { setErrors({ amount: v.error }); haptics.error(); return; }
    setSaving(true);
    try {
      const amt = parseFloat(amount);
      await addExpense(createTransaction({
        type: 'hostel',
        amount: amt,
        details: `Deposit / Advance — ${setup.name}`,
        meta: { housingId, housingType: 'deposit', label: `Deposit — ${setup.name}` },
      }));
      // Update setup's deposit total
      const newDeposit = (setup.deposit || 0) + amt;
      updateHousingSetup(housingId, { deposit: newDeposit });
      setSetup(prev => ({ ...prev, deposit: newDeposit }));
      haptics.success();
      addToast(`Deposit ৳${amt.toLocaleString()} recorded`, 'success');
      closeForm();
    } catch { haptics.error(); addToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleAddCost = async () => {
    const v = validateAmount(parseFloat(amount));
    if (!v.valid || !costLabel.trim()) { haptics.error(); return; }
    setSaving(true);
    try {
      await addExpense(createTransaction({
        type: 'hostel',
        amount: parseFloat(amount),
        details: `${costLabel.trim()} — ${setup.name}`,
        meta: { housingId, housingType: 'misc', label: `${costLabel.trim()} — ${setup.name}` },
      }));
      haptics.success();
      addToast('Cost added', 'success');
      closeForm();
    } catch { haptics.error(); }
    finally { setSaving(false); }
  };

  const handleUpdateRent = () => {
    const rent = parseFloat(newRent);
    if (!rent || rent <= 0) { haptics.error(); return; }
    haptics.success();
    updateHousingSetup(housingId, { monthlyRent: rent });
    setSetup(prev => ({ ...prev, monthlyRent: rent }));
    setEditingRent(false);
    addToast(`Rent updated to ৳${rent.toLocaleString()}`, 'success');
  };

  const handleMoveOut = async () => {
    setSaving(true);
    haptics.medium();
    try {
      const shiftCost = parseFloat(amount) || 0;
      if (shiftCost > 0) {
        await addExpense(createTransaction({
          type: 'hostel',
          amount: shiftCost,
          details: `Moving Out Cost — ${setup.name}`,
          date: moveOutDate,
          meta: { housingId, housingType: 'shifting', label: `Moving Out — ${setup.name}` },
        }));
      }

      updateHousingSetup(housingId, {
        status: 'inactive',
        moveOutDate,
        shiftingCostOnMove: shiftCost,
        depositUsed: useDepositForFinal,
      });
      setSetup(prev => ({ ...prev, status: 'inactive', moveOutDate }));

      if (useDepositForFinal && setup.deposit > 0) {
        addToast(`Deposit ৳${setup.deposit.toLocaleString()} applied to final rent`, 'success');
      }
      haptics.success();
      addToast('Moved out successfully', 'success');
      closeForm();
    } catch { haptics.error(); addToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  if (!setup) {
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <p className="text-surface-500 text-sm mb-4">Housing not found</p>
        <GButton onClick={() => navigate('housing-landing')}>Back</GButton>
      </motion.div>
    );
  }

  const meta = TYPE_META[setup.type] || TYPE_META.other;
  const isActive = setup.status === 'active';

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => { haptics.light(); navigate('housing-landing'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-lg font-semibold truncate ${d ? 'text-white' : 'text-surface-900'}`}>{setup.name}</h1>
            <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
              {meta.icon} {meta.label} {setup.occupancy === 'shared' ? '· Shared' : ''} {!isActive ? '· Inactive' : ''}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">

        {/* ═══ PROFILE / OVERVIEW ═══ */}
        <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
          {/* Monthly Rent (editable) */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Monthly Rent</p>
              {!editingRent ? (
                <div className="flex items-center gap-2">
                  <p className={`text-xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>৳{(setup.monthlyRent || 0).toLocaleString()}</p>
                  {isActive && (
                    <button onClick={() => { haptics.light(); setEditingRent(true); setNewRent(String(setup.monthlyRent || '')); }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center ${d ? 'hover:bg-surface-800 text-surface-500' : 'hover:bg-surface-100 text-surface-400'}`}>
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <div className={`flex items-center border rounded-lg px-2 py-1.5 flex-1 ${d ? 'border-primary-600 bg-surface-800' : 'border-primary-500 bg-surface-50'}`}>
                    <span className="text-xs text-surface-400 mr-1">৳</span>
                    <input type="text" inputMode="decimal" value={newRent}
                      onChange={(e) => setNewRent(sanitizeAmount(e.target.value))}
                      className={`bg-transparent outline-none w-full text-sm font-bold ${d ? 'text-white' : 'text-surface-900'}`} autoFocus />
                  </div>
                  <button onClick={handleUpdateRent} className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button onClick={() => setEditingRent(false)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${d ? 'bg-surface-800 text-surface-400' : 'bg-surface-200 text-surface-600'}`}>✕</button>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Since</p>
              <p className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                {formatTransactionDate(setup.startDate, { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {setup.dueDay && (
            <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>
              Due on the {setup.dueDay}{setup.dueDay === 1 ? 'st' : setup.dueDay === 2 ? 'nd' : setup.dueDay === 3 ? 'rd' : 'th'} of each month
            </p>
          )}
        </div>

        {/* ═══ FINANCIAL SUMMARY (separated, trustworthy) ═══ */}
        <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Rent Paid</p>
              <p className={`text-lg font-bold ${d ? 'text-emerald-400' : 'text-emerald-600'}`}>৳{totalRentPaid.toLocaleString()}</p>
              <p className={`text-[10px] ${d ? 'text-surface-600' : 'text-surface-400'}`}>{rentPayments.length} payment{rentPayments.length !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Deposit</p>
              <p className={`text-lg font-bold ${d ? 'text-amber-400' : 'text-amber-600'}`}>৳{totalDeposit.toLocaleString()}</p>
            </div>
            <div>
              <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Other</p>
              <p className={`text-lg font-bold ${d ? 'text-surface-300' : 'text-surface-700'}`}>৳{totalOther.toLocaleString()}</p>
            </div>
          </div>
          {totalAllSpent > 0 && (
            <div className={`mt-3 pt-3 border-t text-center ${d ? 'border-surface-800' : 'border-surface-200'}`}>
              <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Total Housing Spent</p>
              <p className={`text-xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>৳{totalAllSpent.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* ═══ ACTIONS ═══ */}
        {isActive && !activeForm && (
          <div className="grid grid-cols-3 gap-2">
            <GButton fullWidth size="sm" onClick={() => openForm('rent')}>Pay Rent</GButton>
            <GButton fullWidth size="sm" variant="secondary" onClick={() => openForm('deposit')}>Add Deposit</GButton>
            <GButton fullWidth size="sm" variant="secondary" onClick={() => openForm('cost')}>Add Cost</GButton>
          </div>
        )}

        {/* ═══ PAY RENT FORM ═══ */}
        <AnimatePresence>
          {activeForm === 'rent' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Pay Rent</p>
              <AmountInput value={amount} onChange={(v) => { setAmount(v); if (errors.amount) setErrors({}); }} dark={d} error={errors.amount} size="sm" />
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls} />
              <div className="flex gap-2">
                <GButton variant="secondary" fullWidth onClick={closeForm}>Cancel</GButton>
                <GButton fullWidth onClick={handlePayRent} loading={saving}>Save</GButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ ADD DEPOSIT FORM ═══ */}
        <AnimatePresence>
          {activeForm === 'deposit' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Add Deposit / Advance</p>
              <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>Record a security deposit or advance payment</p>
              <AmountInput value={amount} onChange={(v) => { setAmount(v); if (errors.amount) setErrors({}); }} dark={d} error={errors.amount} size="sm" />
              <div className="flex gap-2">
                <GButton variant="secondary" fullWidth onClick={closeForm}>Cancel</GButton>
                <GButton fullWidth onClick={handleAddDeposit} loading={saving}>Save</GButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ ADD COST FORM ═══ */}
        <AnimatePresence>
          {activeForm === 'cost' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Add Housing Cost</p>
              <div className="flex flex-wrap gap-1.5">
                {['Utility', 'Maintenance', 'Internet', 'Gas', 'Water', 'Shifting', 'Other'].map(label => (
                  <button key={label} onClick={() => { haptics.light(); setCostLabel(label); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      costLabel === label ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
                    }`}>{label}</button>
                ))}
              </div>
              <AmountInput value={amount} onChange={(v) => { setAmount(v); if (errors.amount) setErrors({}); }} dark={d} error={errors.amount} size="sm" />
              <div className="flex gap-2">
                <GButton variant="secondary" fullWidth onClick={closeForm}>Cancel</GButton>
                <GButton fullWidth onClick={handleAddCost} loading={saving} disabled={!costLabel || parseFloat(amount) <= 0}>Save</GButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ RENT PAYMENTS ═══ */}
        {rentPayments.length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Rent Payments</h2>
            <div className="space-y-2">
              {rentPayments.map((p, i) => (
                <div key={p.id || i} className={`flex items-center justify-between p-3 rounded-xl ${d ? 'bg-surface-900 border border-surface-800' : 'bg-white border border-surface-200'}`}>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>৳{(p.amount || 0).toLocaleString()}</p>
                      <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                        {p.meta?.month ? new Date(p.meta.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : formatTransactionDate(p.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ OTHER COSTS (shared TransactionCard) ═══ */}
        {otherCosts.length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Other Costs</h2>
            <div className="space-y-2">
              {otherCosts.map((exp, i) => (
                <TransactionCard key={exp.id || i} transaction={exp} dark={d} animationDelay={i * 0.03} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ DEPOSIT HISTORY ═══ */}
        {depositPayments.length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Deposits</h2>
            <div className="space-y-2">
              {depositPayments.map((exp, i) => (
                <TransactionCard key={exp.id || i} transaction={exp} dark={d} icon="💰" animationDelay={i * 0.03} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ MOVE OUT ═══ */}
        {isActive && (
          <div>
            {activeForm !== 'moveout' ? (
              <button onClick={() => openForm('moveout')}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition ${
                  d ? 'text-amber-400 hover:bg-amber-900/10' : 'text-amber-600 hover:bg-amber-50'
                }`}>
                <LogOut className="w-4 h-4" /> Move Out / End Housing
              </button>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border space-y-4 ${d ? 'bg-amber-900/10 border-amber-800/30' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <p className={`text-sm font-medium ${d ? 'text-amber-300' : 'text-amber-800'}`}>Move Out</p>
                </div>

                <div>
                  <label className={`text-xs font-medium mb-1.5 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Move-out Date</label>
                  <input type="date" value={moveOutDate} onChange={(e) => setMoveOutDate(e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className={`text-xs font-medium mb-1.5 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                    Shifting Cost <span className="text-surface-400 font-normal">(optional)</span>
                  </label>
                  <AmountInput value={amount} onChange={setAmount} dark={d} size="sm" placeholder="0" />
                </div>

                {totalDeposit > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={useDepositForFinal} onChange={(e) => setUseDepositForFinal(e.target.checked)}
                      className="w-4 h-4 accent-primary-600 rounded" />
                    <span className={`text-xs ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                      Use deposit (৳{totalDeposit.toLocaleString()}) for final rent
                    </span>
                  </label>
                )}

                <div className="flex gap-2">
                  <GButton variant="secondary" fullWidth onClick={closeForm}>Cancel</GButton>
                  <GButton fullWidth variant="danger" onClick={handleMoveOut} loading={saving}>Confirm Move Out</GButton>
                </div>
              </motion.div>
            )}
          </div>
        )}

      </main>
    </motion.div>
  );
};

export default HousingDetailPage;
