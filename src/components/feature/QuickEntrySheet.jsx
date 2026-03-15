import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BottomSheet } from '../ui/BottomSheet';
import { GButton } from '../ui/GButton';
import { SuccessCheck } from '../ui/SuccessCheck';
import { useApp } from '../../contexts/AppContext';
import { haptics } from '../../lib/haptics';
import { getSubTypes, getCategoryById } from '../../types/payment';
import { createEntry, createEntryItem } from '../../types/entrySchema';

export const QuickEntrySheet = ({ isOpen, onClose, categoryId }) => {
  const { addEntry, addToast, user, theme } = useApp();
  const d = theme === 'dark';
  const profile = user?.profile;
  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'INR' ? '₹' : '৳';

  const category = getCategoryById(categoryId);
  const subTypes = getSubTypes(categoryId);

  const [amount, setAmount] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState('form'); // form | success
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!amount || !selectedType) return;
    haptics.medium();
    setSaving(true);

    try {
      const subType = subTypes.find(s => s.id === selectedType);
      const item = createEntryItem({
        subType: selectedType,
        label: subType?.label || selectedType,
        amount: Number(amount),
        note,
      });

      const entry = createEntry({
        category: categoryId,
        mode: 'individual',
        items: [item],
        note,
      });

      await addEntry(entry);
      setStep('success');
      setTimeout(() => {
        resetAndClose();
        addToast('Payment saved', 'success');
      }, 1200);
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
    setSelectedType('');
    setNote('');
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={resetAndClose} title={step === 'form' ? `Add ${category?.label || ''} payment` : null}>
      {step === 'form' && (
        <>
          {/* Amount */}
          <div className="mb-5">
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

          {/* Sub-type selection */}
          <div className="mb-5">
            <p className={`text-sm font-medium mb-2 ${d ? 'text-surface-300' : 'text-surface-700'}`}>Type</p>
            <div className="flex flex-wrap gap-2">
              {subTypes.map((st) => (
                <motion.button
                  key={st.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { haptics.light(); setSelectedType(st.id); }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
                    selectedType === st.id
                      ? 'bg-primary-600 text-white'
                      : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                  }`}
                >
                  <span>{st.icon}</span>
                  {st.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="mb-5">
            <input
              type="text"
              placeholder="Add a note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={50}
              className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:border-primary-600 transition text-surface-900 dark:text-white"
            />
          </div>

          <GButton fullWidth size="lg" onClick={handleSave} loading={saving} disabled={!amount || !selectedType}>
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
