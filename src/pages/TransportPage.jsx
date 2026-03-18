import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Calendar, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GButton } from '../components/ui';
import { LayoutBottomNav } from '../components/layout';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';

// ═══════════════════════════════════════════════════════════════
// TRANSPORT TYPES
// ═══════════════════════════════════════════════════════════════

const TRANSPORT_TYPES = [
  { id: 'university_transport', icon: '🏫', label: 'University Transport', desc: 'Daily commute, bus pass, rickshaw' },
  { id: 'admission_exam_travel', icon: '📝', label: 'Admission Exam Travel', desc: 'Travel for entrance exams' },
  { id: 'hometown_travel', icon: '🏠', label: 'Travel to Home Town', desc: 'Go home or come back', hasSubTypes: true },
];

const HOMETOWN_SUBTYPES = [
  { id: 'go_home', icon: '🏡', label: 'Go to Home Town', desc: 'Travel from city to home' },
  { id: 'come_to_dhaka', icon: '🌆', label: 'Come to Dhaka', desc: 'Travel from home to city' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const TransportPage = () => {
  const { navigate, theme, expenses, addExpense, addToast, user } = useApp();
  const d = theme === 'dark';

  // Flow state: 'select' | 'subtype' | 'form'
  const [step, setStep] = useState('select');
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSubtype, setSelectedSubtype] = useState(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Existing transport cards ────────────────────────────────

  const transportExpenses = useMemo(() => {
    return (expenses || [])
      .filter(e => e.type === 'transport')
      .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, [expenses]);

  // ── Handlers ────────────────────────────────────────────────

  const handleSelectType = (type) => {
    haptics.light();
    setSelectedType(type);
    if (type.hasSubTypes) {
      setStep('subtype');
    } else {
      setSelectedSubtype(null);
      setStep('form');
    }
  };

  const handleSelectSubtype = (subtype) => {
    haptics.light();
    setSelectedSubtype(subtype);
    setStep('form');
  };

  const handleBack = () => {
    haptics.light();
    if (step === 'form' && selectedType?.hasSubTypes) {
      setStep('subtype');
    } else if (step === 'form' || step === 'subtype') {
      setStep('select');
      setSelectedType(null);
      setSelectedSubtype(null);
    } else {
      navigate('dashboard');
    }
    setAmount('');
    setNote('');
    setErrors({});
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setErrors({ amount: 'Enter a valid amount' });
      haptics.error();
      return;
    }

    setSaving(true);
    haptics.medium();

    try {
      const typeLabel = selectedType?.label || 'Transport';
      const subtypeLabel = selectedSubtype?.label || '';
      const fullLabel = subtypeLabel ? `${subtypeLabel}` : typeLabel;

      await addExpense({
        type: 'transport',
        amount: amt,
        label: 'Transport',
        details: fullLabel,
        date: date || new Date().toISOString().split('T')[0],
        meta: {
          label: fullLabel,
          transportType: selectedType?.id,
          transportSubtype: selectedSubtype?.id || null,
        },
      });

      haptics.success();
      addToast(`${fullLabel} saved`, 'success');

      // Reset and go back to list
      setStep('select');
      setSelectedType(null);
      setSelectedSubtype(null);
      setAmount('');
      setNote('');
      setErrors({});
    } catch (e) {
      haptics.error();
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────

  const getFormTitle = () => {
    if (selectedSubtype) return selectedSubtype.label;
    if (selectedType) return selectedType.label;
    return 'Transport';
  };

  const getHeaderTitle = () => {
    if (step === 'form') return getFormTitle();
    if (step === 'subtype') return 'Home Town Travel';
    return 'Transport';
  };

  const cardCls = `w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left ${
    d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
  }`;

  const inputCls = `w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
    d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
  }`;

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{getHeaderTitle()}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">

        {/* ═══ STEP 1: TYPE SELECTION ═══ */}
        {step === 'select' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="space-y-2.5">
              {TRANSPORT_TYPES.map((type, i) => (
                <motion.button
                  key={type.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectType(type)}
                  className={cardCls}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${d ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{type.label}</p>
                    <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>{type.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Saved transport cards */}
            {transportExpenses.length > 0 && (
              <div>
                <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>
                  Recent Transport ({transportExpenses.length})
                </h2>
                <div className="space-y-2">
                  {transportExpenses.slice(0, 10).map((exp, i) => {
                    const meta = exp.meta || {};
                    const typeLabel = exp.details || meta.label || 'Transport';

                    return (
                      <motion.div
                        key={exp.id || i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.03 }}
                        className={`flex items-center justify-between p-3.5 rounded-xl border ${
                          d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-lg">🚌</span>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-surface-900'}`}>
                              {typeLabel}
                            </p>
                            {exp.note && (
                              <p className={`text-xs truncate ${d ? 'text-surface-500' : 'text-surface-400'}`}>{exp.note}</p>
                            )}
                            <p className={`text-xs flex items-center gap-1 mt-0.5 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                              <Calendar className="w-3 h-3" />
                              {exp.date ? new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-semibold shrink-0 ${d ? 'text-white' : 'text-surface-900'}`}>
                          ৳{(Number(exp.amount) || 0).toLocaleString()}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {transportExpenses.length === 0 && (
              <div className={`text-center py-8 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                <span className="text-4xl block mb-3">🚌</span>
                <p className="text-sm">No transport costs recorded yet</p>
                <p className="text-xs mt-1">Select a type above to add your first entry</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ STEP 2: HOMETOWN SUBTYPES ═══ */}
        {step === 'subtype' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2.5">
            <p className={`text-sm mb-3 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Where are you traveling?</p>
            {HOMETOWN_SUBTYPES.map((sub, i) => (
              <motion.button
                key={sub.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectSubtype(sub)}
                className={cardCls}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${d ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  {sub.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{sub.label}</p>
                  <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>{sub.desc}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* ═══ STEP 3: ENTRY FORM ═══ */}
        {step === 'form' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            {/* Type badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              d ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
            }`}>
              <span>{selectedSubtype?.icon || selectedType?.icon}</span>
              {getFormTitle()}
            </div>

            {/* Amount */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount *</label>
              <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${
                errors.amount ? 'border-danger-500' : `${d ? 'border-surface-800' : 'border-surface-200'} focus-within:border-primary-500`
              } ${d ? 'bg-surface-900' : 'bg-white'}`}>
                <span className="text-xl text-surface-400 mr-2">৳</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); if (errors.amount) setErrors({}); }}
                  className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`}
                  autoFocus
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-danger-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.amount}
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>

            {/* Note */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Note <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g., CNG to campus, Bus fare"
                maxLength={100}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Save */}
            <GButton fullWidth size="lg" onClick={handleSave} loading={saving} disabled={saving || parseFloat(amount) <= 0}>
              Save Transport Cost
            </GButton>
          </motion.div>
        )}

      </main>

      {step === 'select' && <LayoutBottomNav />}
    </motion.div>
  );
};

export default TransportPage;
