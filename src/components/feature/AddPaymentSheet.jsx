import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BottomSheet } from '../ui/BottomSheet';
import { GButton } from '../ui/GButton';
import { SuccessCheck } from '../ui/SuccessCheck';
import { useApp } from '../../contexts/AppContext';
import { haptics } from '../../lib/haptics';
import { makeFmt } from '../../utils/format';

// Map to existing backend type IDs
const categories = [
  { id: 'education', icon: '🎓', label: 'Education', color: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'transport', icon: '🚌', label: 'Transport', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'canteen', icon: '🍽️', label: 'Food', color: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'hostel', icon: '🏠', label: 'Housing', color: 'bg-green-100 dark:bg-green-900/30' },
  { id: 'books', icon: '📚', label: 'Books', color: 'bg-amber-100 dark:bg-amber-900/30' },
];

const uniformCategory = { id: 'uniform', icon: '👔', label: 'Uniform', color: 'bg-slate-100 dark:bg-slate-900/30' };

export const AddPaymentSheet = ({ isOpen, onClose, preselectedCategory }) => {
  const { user, addExpense, addToast } = useApp();
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || 'BDT');
  const [step, setStep] = useState('form');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(preselectedCategory || '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const showUniform = ['school', 'college'].includes(profile?.educationLevel);
  const allCategories = showUniform ? [...categories, uniformCategory] : categories;

  const handleSave = async () => {
    if (!amount || !category) return;
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

      setStep('success');
      setTimeout(() => {
        resetAndClose();
        addToast('Payment saved', 'success');
      }, 1500);
    } catch (e) {
      console.error(e);
      haptics.error();
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setStep('form');
    setAmount('');
    setCategory(preselectedCategory || '');
    setNote('');
    onClose();
  };

  // Reset category when preselectedCategory changes
  React.useEffect(() => {
    if (preselectedCategory) setCategory(preselectedCategory);
  }, [preselectedCategory]);

  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'INR' ? '₹' : '৳';

  return (
    <BottomSheet isOpen={isOpen} onClose={resetAndClose} title={step === 'form' ? 'Add payment' : null}>
      {step === 'form' && (
        <>
          <div className="mb-6">
            <div className="flex items-center border-b-2 border-primary-600 pb-2">
              <span className="text-2xl text-surface-500 mr-2">{currencySymbol}</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-3xl font-semibold bg-transparent outline-none w-full text-surface-900 dark:text-white"
                autoFocus
              />
            </div>
            <p className="text-xs text-surface-500 mt-2">Enter amount</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {allCategories.map((cat) => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptics.light(); setCategory(cat.id); }}
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

          <GButton fullWidth size="lg" onClick={handleSave} loading={saving} disabled={!amount || !category}>
            Save payment
          </GButton>
        </>
      )}

      {step === 'success' && (
        <div className="flex flex-col items-center justify-center py-8">
          <SuccessCheck size={80} />
          <p className="text-lg font-medium text-surface-900 dark:text-white mt-4">Payment saved!</p>
        </div>
      )}
    </BottomSheet>
  );
};
