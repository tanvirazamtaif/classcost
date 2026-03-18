import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Check, Calendar, AlertTriangle, LogOut, Pencil } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GButton } from '../components/ui';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { getHousingSetups, updateHousingSetup } from './HousingLandingPage';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const TYPE_META = {
  apartment: { icon: '🏢', label: 'Apartment' },
  mess: { icon: '🏘️', label: 'Mess' },
  hostel: { icon: '🏨', label: 'Hostel' },
  hotel: { icon: '🏩', label: 'Hotel' },
  dorm: { icon: '🛏️', label: 'Dorm' },
  other: { icon: '🏠', label: 'Other' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return dateStr; }
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const HousingDetailPage = () => {
  const { navigate, addToast, addExpense, theme, routeParams, expenses } = useApp();
  const d = theme === 'dark';

  const { housingId } = routeParams || {};
  const [setup, setSetup] = useState(() => getHousingSetups().find(h => h.id === housingId));

  // Rent payment form
  const [showPayRent, setShowPayRent] = useState(false);
  const [rentAmount, setRentAmount] = useState('');
  const [rentMonth, setRentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rentNote, setRentNote] = useState('');

  // Move out
  const [showMoveOut, setShowMoveOut] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [moveShiftCost, setMoveShiftCost] = useState('');
  const [useDepositForFinal, setUseDepositForFinal] = useState(false);

  // Add cost
  const [showAddCost, setShowAddCost] = useState(false);
  const [costLabel, setCostLabel] = useState('');
  const [costAmount, setCostAmount] = useState('');

  // Edit rent
  const [editingRent, setEditingRent] = useState(false);
  const [newRent, setNewRent] = useState('');

  const [saving, setSaving] = useState(false);

  // Housing-related expenses
  const housingExpenses = useMemo(() => {
    return (expenses || [])
      .filter(e => e.type === 'hostel' && e.meta?.housingId === housingId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [expenses, housingId]);

  const totalPaid = useMemo(() => housingExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [housingExpenses]);
  const rentPayments = useMemo(() => housingExpenses.filter(e => e.meta?.housingType === 'rent'), [housingExpenses]);

  const handleUpdateRent = () => {
    const rent = parseFloat(newRent);
    if (!rent || rent <= 0) { haptics.error(); return; }
    haptics.success();
    updateHousingSetup(housingId, { monthlyRent: rent });
    setSetup(prev => ({ ...prev, monthlyRent: rent }));
    setEditingRent(false);
    addToast(`Rent updated to ৳${rent.toLocaleString()}`, 'success');
  };

  const inputCls = `w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
    d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
  }`;

  // ── Handlers ────────────────────────────────────────────────

  const handlePayRent = async () => {
    const amt = parseFloat(rentAmount) || setup?.monthlyRent || 0;
    if (amt <= 0) { haptics.error(); return; }
    setSaving(true);
    try {
      await addExpense({
        type: 'hostel', amount: amt, label: 'Housing',
        details: `Rent — ${setup.name}`,
        date: `${rentMonth}-01`,
        meta: { housingId, housingType: 'rent', month: rentMonth, label: `Rent — ${setup.name}` },
      });
      haptics.success();
      addToast(`Rent ৳${amt.toLocaleString()} recorded`, 'success');
      setShowPayRent(false); setRentAmount(''); setRentNote('');
    } catch { haptics.error(); addToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleAddCost = async () => {
    const amt = parseFloat(costAmount);
    if (!amt || amt <= 0 || !costLabel.trim()) { haptics.error(); return; }
    setSaving(true);
    try {
      await addExpense({
        type: 'hostel', amount: amt, label: 'Housing',
        details: `${costLabel.trim()} — ${setup.name}`,
        date: new Date().toISOString().split('T')[0],
        meta: { housingId, housingType: 'misc', label: `${costLabel.trim()} — ${setup.name}` },
      });
      haptics.success();
      addToast('Cost added', 'success');
      setShowAddCost(false); setCostLabel(''); setCostAmount('');
    } catch { haptics.error(); }
    finally { setSaving(false); }
  };

  const handleMoveOut = async () => {
    setSaving(true);
    haptics.medium();
    try {
      const shiftCost = parseFloat(moveShiftCost) || 0;

      // Record shifting cost
      if (shiftCost > 0) {
        await addExpense({
          type: 'hostel', amount: shiftCost, label: 'Housing',
          details: `Moving Out Cost — ${setup.name}`,
          date: moveOutDate,
          meta: { housingId, housingType: 'shifting', label: `Moving Out — ${setup.name}` },
        });
      }

      // If using deposit for final months
      if (useDepositForFinal && setup.deposit > 0) {
        // Record deposit adjustment (negative expense to offset)
        addToast(`Deposit ৳${setup.deposit.toLocaleString()} applied to final rent`, 'success');
      }

      // Archive this housing
      updateHousingSetup(housingId, {
        status: 'inactive',
        moveOutDate,
        shiftingCostOnMove: shiftCost,
        depositUsed: useDepositForFinal,
      });
      setSetup(prev => ({ ...prev, status: 'inactive', moveOutDate }));

      haptics.success();
      addToast('Moved out successfully', 'success');
      setShowMoveOut(false);
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

        {/* Summary */}
        <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Monthly Rent</p>
              {!editingRent ? (
                <div className="flex items-center gap-2">
                  <p className={`text-xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>৳{(setup.monthlyRent || 0).toLocaleString()}</p>
                  {isActive && (
                    <button onClick={() => { haptics.light(); setEditingRent(true); setNewRent(String(setup.monthlyRent || '')); }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition ${d ? 'hover:bg-surface-800 text-surface-500' : 'hover:bg-surface-100 text-surface-400'}`}>
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <div className={`flex items-center border rounded-lg px-2 py-1.5 flex-1 ${d ? 'border-primary-600 bg-surface-800' : 'border-primary-500 bg-surface-50'}`}>
                    <span className="text-xs text-surface-400 mr-1">৳</span>
                    <input type="text" inputMode="decimal" value={newRent}
                      onChange={(e) => setNewRent(e.target.value.replace(/[^0-9.]/g, ''))}
                      className={`bg-transparent outline-none w-full text-sm font-bold ${d ? 'text-white' : 'text-surface-900'}`}
                      autoFocus />
                  </div>
                  <button onClick={handleUpdateRent}
                    className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button onClick={() => setEditingRent(false)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${d ? 'bg-surface-800 text-surface-400' : 'bg-surface-200 text-surface-600'}`}>
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div>
              <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Total Paid</p>
              <p className={`text-xl font-bold ${d ? 'text-emerald-400' : 'text-emerald-600'}`}>৳{totalPaid.toLocaleString()}</p>
            </div>
          </div>
          {setup.deposit > 0 && (
            <div className={`mt-3 pt-3 border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Deposit / Advance</span>
                <span className={`text-sm font-semibold ${d ? 'text-amber-400' : 'text-amber-600'}`}>৳{setup.deposit.toLocaleString()}</span>
              </div>
            </div>
          )}
          <p className={`text-xs mt-2 flex items-center gap-1 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
            <Calendar className="w-3 h-3" /> Since {formatDate(setup.startDate)}
            {setup.dueDay && ` · Due on ${setup.dueDay}${setup.dueDay === 1 ? 'st' : setup.dueDay === 2 ? 'nd' : setup.dueDay === 3 ? 'rd' : 'th'}`}
          </p>
        </div>

        {/* Actions */}
        {isActive && (
          <div className="grid grid-cols-2 gap-2">
            <GButton fullWidth icon={Plus} onClick={() => { haptics.light(); setShowPayRent(true); setRentAmount(String(setup.monthlyRent || '')); }}>
              Pay Rent
            </GButton>
            <GButton fullWidth variant="secondary" onClick={() => { haptics.light(); setShowAddCost(true); }}>
              Add Cost
            </GButton>
          </div>
        )}

        {/* Pay Rent Form */}
        <AnimatePresence>
          {showPayRent && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Pay Rent</p>
              <div className={`flex items-center border-2 rounded-xl px-3 py-2.5 ${d ? 'border-surface-800 bg-surface-800' : 'border-surface-200 bg-surface-50'} focus-within:border-primary-500`}>
                <span className="text-lg text-surface-400 mr-2">৳</span>
                <input type="text" inputMode="decimal" value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={`text-lg font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`} />
              </div>
              <input type="month" value={rentMonth} onChange={(e) => setRentMonth(e.target.value)} className={inputCls} />
              <div className="flex gap-2">
                <GButton variant="secondary" fullWidth onClick={() => setShowPayRent(false)}>Cancel</GButton>
                <GButton fullWidth onClick={handlePayRent} loading={saving}>Save</GButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Cost Form */}
        <AnimatePresence>
          {showAddCost && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Add Housing Cost</p>
              <div className="flex flex-wrap gap-1.5">
                {['Utility', 'Maintenance', 'Internet', 'Gas', 'Water', 'Other'].map(label => (
                  <button key={label} onClick={() => { haptics.light(); setCostLabel(label); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      costLabel === label ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
                    }`}>{label}</button>
                ))}
              </div>
              <div className={`flex items-center border rounded-xl px-3 py-2.5 ${d ? 'bg-surface-800 border-surface-700' : 'bg-surface-50 border-surface-200'} focus-within:border-primary-500`}>
                <span className="text-surface-400 mr-2">৳</span>
                <input type="text" inputMode="decimal" placeholder="Amount" value={costAmount}
                  onChange={(e) => setCostAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={`bg-transparent outline-none w-full text-sm ${d ? 'text-white' : 'text-surface-900'}`} />
              </div>
              <div className="flex gap-2">
                <GButton variant="secondary" fullWidth onClick={() => { setShowAddCost(false); setCostLabel(''); setCostAmount(''); }}>Cancel</GButton>
                <GButton fullWidth onClick={handleAddCost} loading={saving} disabled={!costLabel || parseFloat(costAmount) <= 0}>Save</GButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rent History */}
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
                        {p.meta?.month ? new Date(p.meta.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : formatDate(p.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Transactions */}
        {housingExpenses.length > 0 && housingExpenses.length !== rentPayments.length && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>All Costs</h2>
            <div className="space-y-2">
              {housingExpenses.filter(e => e.meta?.housingType !== 'rent').map((exp, i) => (
                <div key={exp.id || i} className={`flex items-center justify-between p-3 rounded-xl ${d ? 'bg-surface-900 border border-surface-800' : 'bg-white border border-surface-200'}`}>
                  <div>
                    <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
                      {exp.details || exp.meta?.label || 'Housing Cost'}
                    </p>
                    <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>{formatDate(exp.date)}</p>
                  </div>
                  <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>৳{(exp.amount || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Move Out (active housing only) */}
        {isActive && (
          <div>
            {!showMoveOut ? (
              <button onClick={() => { haptics.light(); setShowMoveOut(true); }}
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
                  <div className={`flex items-center border rounded-xl px-3 py-2 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'} focus-within:border-primary-500`}>
                    <span className="text-surface-400 mr-1">৳</span>
                    <input type="text" inputMode="decimal" placeholder="0" value={moveShiftCost}
                      onChange={(e) => setMoveShiftCost(e.target.value.replace(/[^0-9.]/g, ''))}
                      className={`bg-transparent outline-none w-full text-sm ${d ? 'text-white' : 'text-surface-900'}`} />
                  </div>
                </div>

                {setup.deposit > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={useDepositForFinal} onChange={(e) => setUseDepositForFinal(e.target.checked)}
                      className="w-4 h-4 accent-primary-600 rounded" />
                    <span className={`text-xs ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                      Use deposit (৳{setup.deposit.toLocaleString()}) for final rent
                    </span>
                  </label>
                )}

                <div className="flex gap-2">
                  <GButton variant="secondary" fullWidth onClick={() => setShowMoveOut(false)}>Cancel</GButton>
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
