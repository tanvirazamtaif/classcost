import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GButton } from '../components/ui';
import { SuccessCheck } from '../components/ui/SuccessCheck';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { sanitizeAmount, createTransaction } from '../core/transactions';
import { addHousingSetup } from './HousingLandingPage';

// ═══════════════════════════════════════════════════════════════
// HOUSING TYPES
// ═══════════════════════════════════════════════════════════════

const HOUSING_TYPES = [
  { id: 'apartment', icon: '🏢', label: 'Apartment', desc: 'Rented flat or apartment' },
  { id: 'mess', icon: '🏘️', label: 'Mess', desc: 'Shared mess / bachelor housing' },
  { id: 'hostel', icon: '🏨', label: 'Hostel', desc: 'University or institutional hostel' },
  { id: 'hotel', icon: '🏩', label: 'Hotel', desc: 'Temporary hotel stay' },
  { id: 'dorm', icon: '🛏️', label: 'Dorm', desc: 'Dormitory / shared room' },
  { id: 'other', icon: '🏠', label: 'Other', desc: 'Any other housing type' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const AddHousingPage = () => {
  const { navigate, addToast, addExpense, theme } = useApp();
  const d = theme === 'dark';

  // Flow: type → basics → optional → success
  const [step, setStep] = useState('type');
  const [selectedType, setSelectedType] = useState(null);
  const [createdId, setCreatedId] = useState(null);

  // Basic setup
  const [name, setName] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [occupancy, setOccupancy] = useState('own');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Optional (shown after basics)
  const [deposit, setDeposit] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [shiftingCost, setShiftingCost] = useState('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const inputCls = `w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
    d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
  }`;

  // ── Handlers ────────────────────────────────────────────────

  const handleSelectType = (type) => {
    haptics.light();
    setSelectedType(type);
    setStep('basics');
  };

  const handleSaveBasics = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Enter a name';
    const rent = parseFloat(monthlyRent);
    if (!rent || rent <= 0) errs.rent = 'Enter monthly rent';
    if (Object.keys(errs).length) { setErrors(errs); haptics.error(); return; }

    haptics.medium();
    setErrors({});
    setStep('optional');
  };

  const handleFinish = async () => {
    setSaving(true);
    haptics.medium();

    try {
      const id = `housing_${Date.now().toString(36)}`;
      const rent = parseFloat(monthlyRent) || 0;
      const dep = parseFloat(deposit) || 0;
      const shift = parseFloat(shiftingCost) || 0;

      // Create housing setup
      const setup = {
        id,
        type: selectedType.id,
        name: name.trim(),
        occupancy,
        monthlyRent: rent,
        startDate,
        dueDay: parseInt(dueDay) || 1,
        deposit: dep,
        depositRemaining: dep,
        shiftingCost: shift,
        status: 'active',
        createdAt: new Date().toISOString(),
        moveOutDate: null,
        note: null,
      };

      addHousingSetup(setup);
      setCreatedId(id);

      // Record deposit as expense if entered
      if (dep > 0) {
        await addExpense(createTransaction({
          type: 'hostel',
          amount: dep,
          details: `Deposit / Advance — ${name.trim()}`,
          date: startDate,
          meta: { housingId: id, housingType: 'deposit', label: `Deposit — ${name.trim()}` },
        }));
      }

      // Record shifting cost as expense if entered
      if (shift > 0) {
        await addExpense(createTransaction({
          type: 'hostel',
          amount: shift,
          details: `Shifting Cost — ${name.trim()}`,
          date: startDate,
          meta: { housingId: id, housingType: 'shifting', label: `Shifting — ${name.trim()}` },
        }));
      }

      haptics.success();
      setStep('success');
    } catch (e) {
      haptics.error();
      addToast('Failed to save housing', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    haptics.light();
    if (step === 'optional') setStep('basics');
    else if (step === 'basics') { setStep('type'); setSelectedType(null); }
    else navigate('housing-landing');
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  // Success
  if (step === 'success') {
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="flex justify-center mb-6"><SuccessCheck size={80} /></div>
          <h2 className={`text-xl font-bold mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>Housing added!</h2>
          <p className="text-surface-500 text-sm mb-8">{name} is now set up</p>
          <div className="flex gap-3 w-full max-w-xs mx-auto">
            <GButton variant="secondary" fullWidth onClick={() => { haptics.light(); navigate('housing-detail', { params: { housingId: createdId } }); }}>
              View Details
            </GButton>
            <GButton fullWidth onClick={() => { haptics.light(); navigate('housing-landing'); }}>Done</GButton>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>
            {step === 'type' ? 'Add Housing' : step === 'basics' ? 'Setup' : 'Additional Details'}
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">

        {/* ═══ STEP 1: TYPE SELECTION ═══ */}
        {step === 'type' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
            <p className={`text-sm mb-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>What type of housing?</p>
            {HOUSING_TYPES.map((type, i) => (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectType(type)}
                className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left ${
                  d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${d ? 'bg-green-900/30' : 'bg-green-50'}`}>{type.icon}</div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{type.label}</p>
                  <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>{type.desc}</p>
                </div>
                <ChevronRight className={`w-4 h-4 ${d ? 'text-surface-600' : 'text-surface-400'}`} />
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* ═══ STEP 2: BASIC SETUP ═══ */}
        {step === 'basics' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            {/* Type badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${d ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}>
              <span>{selectedType.icon}</span> {selectedType.label}
            </div>

            {/* Name */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Housing Name *</label>
              <input type="text" placeholder="e.g., Green Valley Apartment, Uttara Mess"
                value={name} onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({}); }} className={inputCls} autoFocus />
              {errors.name && <p className="text-xs text-danger-500 mt-1">{errors.name}</p>}
            </div>

            {/* Monthly Rent */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Monthly Rent *</label>
              <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${
                errors.rent ? 'border-danger-500' : `${d ? 'border-surface-800' : 'border-surface-200'} focus-within:border-primary-500`
              } ${d ? 'bg-surface-900' : 'bg-white'}`}>
                <span className="text-xl text-surface-400 mr-2">৳</span>
                <input type="text" inputMode="decimal" placeholder="0"
                  value={monthlyRent} onChange={(e) => { setMonthlyRent(sanitizeAmount(e.target.value)); if (errors.rent) setErrors({}); }}
                  className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`} />
              </div>
              {errors.rent && <p className="text-xs text-danger-500 mt-1">{errors.rent}</p>}
            </div>

            {/* Shared / Own */}
            {(selectedType.id === 'apartment' || selectedType.id === 'mess') && (
              <div>
                <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Occupancy</label>
                <div className="flex gap-2">
                  {[{ id: 'own', label: 'Own / Solo', icon: '👤' }, { id: 'shared', label: 'Shared', icon: '👥' }].map(opt => (
                    <button key={opt.id} onClick={() => { haptics.light(); setOccupancy(opt.id); }}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium text-center transition ${
                        occupancy === opt.id ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                      }`}>
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Move-in Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>

            <GButton fullWidth size="lg" onClick={handleSaveBasics}>Next</GButton>
          </motion.div>
        )}

        {/* ═══ STEP 3: OPTIONAL DETAILS ═══ */}
        {step === 'optional' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div>
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Optional Details</p>
              <p className={`text-xs mt-1 ${d ? 'text-surface-400' : 'text-surface-500'}`}>You can skip these and add later</p>
            </div>

            {/* Deposit / Advance */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Deposit / Advance <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <div className={`flex items-center border rounded-xl px-3 py-2.5 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'} focus-within:border-primary-500`}>
                <span className="text-surface-400 mr-2">৳</span>
                <input type="text" inputMode="decimal" placeholder="0"
                  value={deposit} onChange={(e) => setDeposit(sanitizeAmount(e.target.value))}
                  className={`bg-transparent outline-none w-full text-sm ${d ? 'text-white' : 'text-surface-900'}`} />
              </div>
              {parseFloat(deposit) > 0 && (
                <p className={`text-xs mt-1.5 ${d ? 'text-surface-400' : 'text-surface-500'}`}>
                  This will be recorded as a one-time deposit payment
                </p>
              )}
            </div>

            {/* Due Day */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Rent Due Day <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => {
                  const sel = parseInt(dueDay) === day;
                  return (
                    <button key={day} type="button"
                      onClick={() => { haptics.light(); setDueDay(String(day)); }}
                      className={`py-2 rounded-lg text-xs font-medium transition ${
                        sel ? 'bg-primary-600 text-white shadow-sm' : d ? 'bg-surface-800 text-surface-400 hover:bg-surface-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                      }`}>
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className={`text-xs mt-1.5 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                Rent due on the {parseInt(dueDay)}{parseInt(dueDay) === 1 ? 'st' : parseInt(dueDay) === 2 ? 'nd' : parseInt(dueDay) === 3 ? 'rd' : 'th'} of each month
              </p>
            </div>

            {/* Shifting Cost */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Shifting / Moving Cost <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <div className={`flex items-center border rounded-xl px-3 py-2.5 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'} focus-within:border-primary-500`}>
                <span className="text-surface-400 mr-2">৳</span>
                <input type="text" inputMode="decimal" placeholder="0"
                  value={shiftingCost} onChange={(e) => setShiftingCost(sanitizeAmount(e.target.value))}
                  className={`bg-transparent outline-none w-full text-sm ${d ? 'text-white' : 'text-surface-900'}`} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <GButton variant="secondary" fullWidth onClick={() => { setDeposit(''); setShiftingCost(''); handleFinish(); }}>
                Skip & Finish
              </GButton>
              <GButton fullWidth onClick={handleFinish} loading={saving} disabled={saving}>
                Save Housing
              </GButton>
            </div>
          </motion.div>
        )}

      </main>
    </motion.div>
  );
};

export default AddHousingPage;
