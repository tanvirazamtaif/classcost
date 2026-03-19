import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { GButton } from '../ui';
import { AmountInput } from '../shared/AmountInput';
import { haptics } from '../../lib/haptics';
import { validateAmount } from '../../core/transactions';

// Non-semester fees only (semester fees are in the Semesters tab)
const PRIMARY_FEES = [
  { id: 'admission_fee', icon: '🎫', label: 'Admission Fee' },
  { id: 'id_card', icon: '🪪', label: 'ID Card Fee' },
  { id: 'tuition_monthly', icon: '📅', label: 'Monthly Tuition' },
  { id: 'registration_fee', icon: '📄', label: 'Registration Fee' },
  { id: 'development_fee', icon: '🏗️', label: 'Development Fee' },
  { id: 'other', icon: '📦', label: 'Custom Fee' },
];

const SECONDARY_FEES = [
  { id: 'transport', icon: '🚌', label: 'Transport' },
  { id: 'hostel', icon: '🏠', label: 'Hostel' },
  { id: 'books', icon: '📖', label: 'Books' },
  { id: 'uniform', icon: '👔', label: 'Uniform' },
];

export const PaymentsTab = ({ institutionName, institutionFees, feesByType, totalPaid, navigate, addFee, addToast, dark }) => {
  const d = dark;
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickType, setQuickType] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleNavigateToType = (type) => {
    haptics.light();
    if (type.route) { navigate(type.route); return; }
    navigate('education-fee-form', { params: {
      feeType: { id: type.id, icon: type.icon, label: type.label, desc: '', defaultPattern: type.id.includes('monthly') ? 'recurring' : 'one_time', fields: ['name', 'amount', 'dueDate'] },
      prefillName: institutionName,
    }});
  };

  const handleQuickAdd = () => {
    const v = validateAmount(parseFloat(quickAmount));
    if (!v.valid || !quickType) { haptics.error(); return; }
    setSaving(true);
    try {
      const typeInfo = [...PRIMARY_FEES, ...SECONDARY_FEES].find(t => t.id === quickType);
      addFee({
        feeType: quickType, paymentIntent: quickType, name: institutionName, icon: typeInfo?.icon || '📦',
        paymentPattern: 'one_time', amount: parseFloat(quickAmount), isPaid: true,
        paidAt: new Date().toISOString(), note: quickNote || null,
        initialPayment: { amount: parseFloat(quickAmount), method: null, paidAt: new Date().toISOString() },
      });
      haptics.success();
      addToast(`${typeInfo?.label || 'Cost'} added`, 'success');
      setShowQuickAdd(false); setQuickAmount(''); setQuickType(''); setQuickNote('');
    } catch { haptics.error(); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Total Paid</p>
            <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>৳{totalPaid.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Records</p>
            <p className={`text-lg font-semibold ${d ? 'text-surface-300' : 'text-surface-700'}`}>{institutionFees.length}</p>
          </div>
        </div>
      </div>

      {/* Recorded costs */}
      {Object.keys(feesByType).length > 0 && (
        <div>
          <h3 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Recorded Costs</h3>
          <div className="space-y-2">
            {Object.entries(feesByType).map(([type, fees]) => {
              const typeInfo = [...PRIMARY_FEES, ...SECONDARY_FEES].find(t => t.id === type);
              const typeTotal = fees.reduce((sum, f) => {
                const paid = (f.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
                return sum + (paid || (f.isPaid ? f.amount || 0 : 0));
              }, 0);
              return (
                <div key={type} className={`p-3.5 rounded-xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{typeInfo?.icon || '📦'}</span>
                      <div>
                        <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{typeInfo?.label || type}</p>
                        <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>{fees.length} record{fees.length > 1 ? 's' : ''} · ৳{typeTotal.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add cost grid */}
      <div>
        <h3 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Add Cost</h3>
        <div className="grid grid-cols-2 gap-2">
          {PRIMARY_FEES.map(type => (
            <motion.button key={type.id} whileTap={{ scale: 0.95 }} onClick={() => handleNavigateToType(type)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'}`}>
              <span className="text-base">{type.icon}</span>
              <p className={`text-xs font-medium truncate ${d ? 'text-white' : 'text-surface-900'}`}>{type.label}</p>
            </motion.button>
          ))}
        </div>
        <details className="mt-2">
          <summary className={`text-xs font-medium cursor-pointer py-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>More cost types</summary>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {SECONDARY_FEES.map(type => (
              <motion.button key={type.id} whileTap={{ scale: 0.95 }} onClick={() => handleNavigateToType(type)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'}`}>
                <span className="text-base">{type.icon}</span>
                <p className={`text-xs font-medium truncate ${d ? 'text-white' : 'text-surface-900'}`}>{type.label}</p>
              </motion.button>
            ))}
          </div>
        </details>
      </div>

      {/* Quick add */}
      {!showQuickAdd ? (
        <GButton fullWidth variant="secondary" onClick={() => { haptics.light(); setShowQuickAdd(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Quick Add Payment
        </GButton>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Quick Add</p>
            <div className="flex flex-wrap gap-1.5">
              {PRIMARY_FEES.filter(t => !t.route).slice(0, 6).map(type => (
                <button key={type.id} onClick={() => { haptics.light(); setQuickType(type.id); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${quickType === type.id ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'}`}>
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
            <AmountInput value={quickAmount} onChange={setQuickAmount} dark={d} size="sm" />
            <div className="flex gap-2">
              <GButton variant="secondary" fullWidth onClick={() => { setShowQuickAdd(false); setQuickAmount(''); setQuickType(''); }}>Cancel</GButton>
              <GButton fullWidth onClick={handleQuickAdd} loading={saving} disabled={!quickType || parseFloat(quickAmount) <= 0}>Save</GButton>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
