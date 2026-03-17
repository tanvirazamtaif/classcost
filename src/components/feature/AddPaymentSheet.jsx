import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Bell } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { GButton } from '../ui/GButton';
import { SuccessCheck } from '../ui/SuccessCheck';
import { useApp } from '../../contexts/AppContext';
import { haptics } from '../../lib/haptics';

// Map to existing backend type IDs
const categories = [
  { id: 'education', icon: '🎓', label: 'Education', color: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'transport', icon: '🚌', label: 'Transport', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'canteen', icon: '🍽️', label: 'Food', color: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'hostel', icon: '🏠', label: 'Housing', color: 'bg-green-100 dark:bg-green-900/30' },
  { id: 'books', icon: '📚', label: 'Books', color: 'bg-amber-100 dark:bg-amber-900/30' },
];

const uniformCategory = { id: 'uniform', icon: '👔', label: 'Uniform', color: 'bg-slate-100 dark:bg-slate-900/30' };

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export const AddPaymentSheet = ({ isOpen, onClose, preselectedCategory }) => {
  const { user, addExpense, addScheduledPayment, addToast } = useApp();
  const profile = user?.profile;

  const [step, setStep] = useState('form'); // form | success | recurring | setup
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(preselectedCategory || '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Recurring setup state
  const [dueDay, setDueDay] = useState(10);
  const [reminderDays, setReminderDays] = useState(2);

  const showUniform = ['school', 'college'].includes(profile?.educationLevel);
  const allCategories = showUniform ? [...categories, uniformCategory] : categories;
  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'INR' ? '₹' : '৳';

  React.useEffect(() => {
    if (preselectedCategory) setCategory(preselectedCategory);
  }, [preselectedCategory]);

  const handleSave = async () => {
    const newErrors = {};
    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (numAmount > 10000000) newErrors.amount = 'Amount exceeds maximum limit';
    if (!category) newErrors.category = 'Please select a category';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      haptics.error();
      return;
    }
    setErrors({});
    haptics.medium();
    setSaving(true);

    try {
      await addExpense({
        type: category,
        amount: Number(amount),
        label: allCategories.find(c => c.id === category)?.label || category,
        details: note,
        date: new Date().toISOString().split('T')[0],
      });

      // Prompt for recurring if >=500 AND (Education OR Housing)
      const shouldPromptRecurring = Number(amount) >= 500 && ['education', 'hostel'].includes(category);

      if (shouldPromptRecurring) {
        setStep('recurring');
      } else {
        setStep('success');
        setTimeout(() => {
          resetAndClose();
          addToast('Payment saved', 'success');
        }, 1200);
      }
    } catch (e) {
      console.error(e);
      haptics.error();
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSetupRecurring = () => {
    haptics.light();
    setStep('setup');
  };

  const handleSaveRecurring = () => {
    haptics.success();
    addScheduledPayment({
      name: note || allCategories.find(c => c.id === category)?.label || 'Monthly Payment',
      amount: Number(amount),
      category: category,
      type: category,
      frequency: 'monthly',
      dueDay,
      reminderDays,
    });
    resetAndClose();
    addToast('Recurring payment set up!', 'success');
  };

  const handleSkipRecurring = () => {
    haptics.light();
    resetAndClose();
    addToast('Payment saved', 'success');
  };

  const resetAndClose = () => {
    setStep('form');
    setAmount('');
    setCategory(preselectedCategory || '');
    setNote('');
    setErrors({});
    setDueDay(10);
    setReminderDays(2);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={resetAndClose} title={step === 'form' ? 'Add payment' : step === 'setup' ? 'Set up reminder' : null}>
      {/* STEP 1: Form */}
      {step === 'form' && (
        <>
          <div className="mb-6">
            <div className="flex items-center border-b-2 border-primary-600 pb-2">
              <span className="text-2xl text-surface-500 mr-2">{currencySymbol}</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setAmount(val);
                  if (val && Number(val) > 0) setErrors(prev => ({ ...prev, amount: undefined }));
                }}
                className="text-3xl font-semibold bg-transparent outline-none w-full text-surface-900 dark:text-white"
                autoFocus
              />
            </div>
            {errors.amount ? (
              <p className="text-xs text-red-500 mt-2">{errors.amount}</p>
            ) : (
              <p className="text-xs text-surface-500 mt-2">Enter amount</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {allCategories.map((cat) => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptics.light(); setCategory(cat.id); setErrors(prev => ({ ...prev, category: undefined })); }}
                className={`p-4 rounded-2xl text-center transition-all ${cat.color} ${
                  category === cat.id
                    ? 'ring-2 ring-primary-600 ring-offset-2 dark:ring-offset-surface-900'
                    : ''
                }`}
              >
                <span className="text-2xl block mb-1">{cat.icon}</span>
                <span className={`text-xs ${category === cat.id ? 'font-semibold text-primary-600' : 'text-surface-600 dark:text-surface-400'}`}>
                  {cat.label}
                </span>
              </motion.button>
            ))}
          </div>
          {errors.category && (
            <p className="text-xs text-red-500 -mt-4 mb-4">{errors.category}</p>
          )}

          <div className="mb-6">
            <input
              type="text"
              placeholder="Add a note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={50}
              className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:border-primary-600 transition text-surface-900 dark:text-white"
            />
          </div>

          <GButton fullWidth size="lg" onClick={handleSave} loading={saving}>
            Save payment
          </GButton>
        </>
      )}

      {/* STEP 2: Success */}
      {step === 'success' && (
        <div className="flex flex-col items-center justify-center py-8">
          <SuccessCheck size={80} />
          <p className="text-lg font-medium text-surface-900 dark:text-white mt-4">Payment saved!</p>
        </div>
      )}

      {/* STEP 3: Recurring Prompt */}
      {step === 'recurring' && (
        <div className="text-center py-4">
          <span className="text-5xl mb-4 block">🔔</span>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">Is this a monthly payment?</h3>
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-6">
            Set up a reminder so you never miss a due date.
          </p>
          <div className="space-y-3">
            <GButton fullWidth onClick={handleSetupRecurring}>
              Yes, set up reminder
            </GButton>
            <GButton fullWidth variant="ghost" onClick={handleSkipRecurring}>
              No, just this once
            </GButton>
          </div>
        </div>
      )}

      {/* STEP 4: Setup Recurring */}
      {step === 'setup' && (
        <div className="py-2">
          <div className="mb-5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2 block">
              Payment name
            </label>
            <input
              type="text"
              value={note || allCategories.find(c => c.id === category)?.label || ''}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., School Fee, Coaching"
              className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:border-primary-600 transition text-surface-900 dark:text-white"
            />
          </div>

          <div className="mb-5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due day of month
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="28"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="flex-1 accent-primary-600"
              />
              <span className="w-12 text-center font-semibold text-surface-900 dark:text-white">
                {dueDay}{getDaySuffix(dueDay)}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2 block">
              <Bell className="w-4 h-4 inline mr-1" />
              Remind me before
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 5, 7].map(days => (
                <button
                  key={days}
                  onClick={() => { haptics.light(); setReminderDays(days); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    reminderDays === days
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-50 dark:bg-surface-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              You'll be reminded <strong className="text-surface-900 dark:text-white">{reminderDays} days</strong> before the <strong className="text-surface-900 dark:text-white">{dueDay}{getDaySuffix(dueDay)}</strong> of each month.
            </p>
          </div>

          <GButton fullWidth size="lg" onClick={handleSaveRecurring}>
            Save recurring payment
          </GButton>
        </div>
      )}
    </BottomSheet>
  );
};
