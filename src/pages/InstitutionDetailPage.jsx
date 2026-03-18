import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { GButton } from '../components/ui';
import { AmountInput } from '../components/shared/AmountInput';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { validateAmount } from '../core/transactions';

// ═══════════════════════════════════════════════════════════════
// COST CATEGORIES AVAILABLE INSIDE AN INSTITUTION
// ═══════════════════════════════════════════════════════════════

const INSTITUTION_COST_TYPES = [
  { id: 'semester_payment', icon: '🎓', label: 'Semester Payment', desc: 'Semester fees & installments', route: 'semester-landing' },
  { id: 'admission_fee', icon: '🎫', label: 'Admission Fee', desc: 'One-time admission cost' },
  { id: 'registration_fee', icon: '📄', label: 'Registration Fee', desc: 'Enrollment registration' },
  { id: 'tuition_monthly', icon: '📅', label: 'Monthly Tuition', desc: 'Recurring monthly fee' },
  { id: 'exam_fee', icon: '📝', label: 'Exam Fee', desc: 'Semester or board exam' },
  { id: 'lab_fee', icon: '🔬', label: 'Lab / Practical Fee', desc: 'Laboratory costs' },
  { id: 'library_fee', icon: '📚', label: 'Library Fee', desc: 'Annual library charge' },
  { id: 'transport', icon: '🚌', label: 'Transport', desc: 'School bus, commute costs' },
  { id: 'hostel', icon: '🏠', label: 'Hostel / Housing', desc: 'Accommodation costs' },
  { id: 'books', icon: '📖', label: 'Books & Materials', desc: 'Textbooks, supplies' },
  { id: 'coaching', icon: '📖', label: 'Coaching / Batch', desc: 'Coaching center fees' },
  { id: 'uniform', icon: '👔', label: 'Uniform', desc: 'School/college uniform' },
  { id: 'development_fee', icon: '🏗️', label: 'Development Fee', desc: 'Annual development charge' },
  { id: 'other', icon: '📦', label: 'Other Cost', desc: 'Any other institution cost' },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getTypeIcon(type) {
  const map = { university: '🎓', school: '🏫', college: '🎒', coaching: '📖', madrasa: '🕌' };
  return map[type] || '🏛️';
}

function getTypeLabel(type) {
  const map = { university: 'University', school: 'School', college: 'College', coaching: 'Coaching', madrasa: 'Madrasa' };
  return map[type] || 'Institution';
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const InstitutionDetailPage = () => {
  const { navigate, addToast, theme, routeParams } = useApp();
  const { activeFees, addFee } = useEducationFees();
  const d = theme === 'dark';

  const { institutionName, institutionType, isNew } = routeParams || {};

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickType, setQuickType] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Fees for this institution ──────────────────────────────

  const institutionFees = useMemo(() => {
    if (!institutionName) return [];
    const nameLower = institutionName.toLowerCase();
    return activeFees.filter(f => {
      const feeName = (f.name || '').toLowerCase();
      return feeName === nameLower || feeName.includes(nameLower);
    });
  }, [activeFees, institutionName]);

  const totalPaid = useMemo(() => {
    return institutionFees.reduce((sum, fee) => {
      const feePayments = (fee.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
      return sum + (feePayments || (fee.isPaid ? fee.amount || 0 : 0));
    }, 0);
  }, [institutionFees]);

  // Group fees by type
  const feesByType = useMemo(() => {
    const groups = {};
    institutionFees.forEach(fee => {
      const type = fee.feeType || fee.paymentIntent || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(fee);
    });
    return groups;
  }, [institutionFees]);

  // ── Handlers ────────────────────────────────────────────────

  const handleQuickAdd = () => {
    const amount = parseFloat(quickAmount);
    if (!quickType || !amount || amount <= 0) {
      haptics.error();
      addToast('Select a type and enter amount', 'error');
      return;
    }

    setSaving(true);
    haptics.medium();

    try {
      const typeInfo = INSTITUTION_COST_TYPES.find(t => t.id === quickType);
      addFee({
        feeType: quickType,
        paymentIntent: quickType,
        name: institutionName,
        icon: typeInfo?.icon || '📦',
        paymentPattern: 'one_time',
        amount,
        isPaid: true,
        paidAt: new Date().toISOString(),
        note: quickNote || null,
        initialPayment: { amount, method: null, paidAt: new Date().toISOString() },
      });

      haptics.success();
      addToast(`${typeInfo?.label || 'Cost'} added`, 'success');
      setShowQuickAdd(false);
      setQuickAmount('');
      setQuickType('');
      setQuickNote('');
    } catch (e) {
      haptics.error();
      addToast('Failed to add', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleNavigateToType = (type) => {
    haptics.light();
    // Semester payment has its own dedicated flow
    if (type.route) {
      navigate(type.route);
      return;
    }
    // For other types, open the existing education fee form
    navigate('education-fee-form', { params: {
      feeType: {
        id: type.id,
        icon: type.icon,
        label: type.label,
        desc: type.desc,
        defaultPattern: type.id.includes('monthly') || type.id === 'coaching' ? 'recurring' : 'one_time',
        fields: ['name', 'amount', 'dueDate'],
      },
      prefillName: institutionName,
    }});
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  if (!institutionName) {
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <p className={`text-sm ${d ? 'text-surface-400' : 'text-surface-500'}`}>Institution not found</p>
        <GButton className="mt-4" onClick={() => navigate('education-home')}>Back</GButton>
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
          <div className="flex-1 min-w-0">
            <h1 className={`text-lg font-semibold truncate ${d ? 'text-white' : 'text-surface-900'}`}>{institutionName}</h1>
            <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
              {getTypeIcon(institutionType)} {getTypeLabel(institutionType)}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">

        {/* Summary card */}
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

        {/* Existing costs grouped by type */}
        {Object.keys(feesByType).length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Recorded Costs</h2>
            <div className="space-y-2">
              {Object.entries(feesByType).map(([type, fees]) => {
                const typeInfo = INSTITUTION_COST_TYPES.find(t => t.id === type);
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
                          <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
                            {typeInfo?.label || type}
                          </p>
                          <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>
                            {fees.length} record{fees.length > 1 ? 's' : ''} · ৳{typeTotal.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add cost section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Add Cost</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {INSTITUTION_COST_TYPES.slice(0, 8).map(type => (
              <motion.button
                key={type.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNavigateToType(type)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
                  d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                }`}
              >
                <span className="text-base">{type.icon}</span>
                <div className="min-w-0">
                  <p className={`text-xs font-medium truncate ${d ? 'text-white' : 'text-surface-900'}`}>{type.label}</p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Show more */}
          <details className="mt-2">
            <summary className={`text-xs font-medium cursor-pointer py-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>
              More cost types
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {INSTITUTION_COST_TYPES.slice(8).map(type => (
                <motion.button
                  key={type.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNavigateToType(type)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
                    d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <span className="text-base">{type.icon}</span>
                  <p className={`text-xs font-medium truncate ${d ? 'text-white' : 'text-surface-900'}`}>{type.label}</p>
                </motion.button>
              ))}
            </div>
          </details>
        </div>

        {/* Quick add */}
        <div>
          {!showQuickAdd ? (
            <GButton fullWidth variant="secondary" onClick={() => { haptics.light(); setShowQuickAdd(true); }}>
              <Plus className="w-4 h-4 mr-1.5" /> Quick Add Payment
            </GButton>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}
              >
                <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Quick Add</p>

                {/* Type selector */}
                <div className="flex flex-wrap gap-1.5">
                  {INSTITUTION_COST_TYPES.filter(t => !t.route).slice(0, 6).map(type => (
                    <button
                      key={type.id}
                      onClick={() => { haptics.light(); setQuickType(type.id); }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                        quickType === type.id
                          ? 'bg-primary-600 text-white'
                          : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
                      }`}
                    >
                      {type.icon} {type.label}
                    </button>
                  ))}
                </div>

                {/* Amount */}
                <AmountInput value={quickAmount} onChange={setQuickAmount} dark={d} size="sm" />

                {/* Note */}
                <input
                  type="text"
                  placeholder="Note (optional)"
                  maxLength={100}
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-500 transition ${
                    d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-50 border-surface-200 text-surface-900'
                  }`}
                />

                <div className="flex gap-2">
                  <GButton variant="secondary" fullWidth onClick={() => { setShowQuickAdd(false); setQuickAmount(''); setQuickType(''); setQuickNote(''); }}>
                    Cancel
                  </GButton>
                  <GButton fullWidth onClick={handleQuickAdd} loading={saving} disabled={saving || !quickType || parseFloat(quickAmount) <= 0}>
                    Save
                  </GButton>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

      </main>
    </motion.div>
  );
};

export default InstitutionDetailPage;
