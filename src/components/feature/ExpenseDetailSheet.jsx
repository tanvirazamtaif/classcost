import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { GButton } from '../ui/GButton';
import { useApp } from '../../contexts/AppContext';
import { haptics } from '../../lib/haptics';

const categories = [
  { id: 'education', icon: '🎓', label: 'Education', color: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'transport', icon: '🚌', label: 'Transport', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'canteen', icon: '🍽️', label: 'Food', color: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'hostel', icon: '🏠', label: 'Housing', color: 'bg-green-100 dark:bg-green-900/30' },
  { id: 'books', icon: '📚', label: 'Books', color: 'bg-amber-100 dark:bg-amber-900/30' },
  { id: 'uniform', icon: '👔', label: 'Uniform', color: 'bg-slate-100 dark:bg-slate-900/30' },
];

const getCat = (type) => categories.find(c => c.id === type) || { icon: '📦', label: type || 'Other', color: 'bg-surface-100 dark:bg-surface-800' };

export const ExpenseDetailSheet = ({ isOpen, onClose, expense }) => {
  const { editExpense, removeExpense, addToast } = useApp();
  const profile = useApp().user?.profile;
  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'INR' ? '₹' : '৳';

  const [mode, setMode] = useState('detail'); // detail | edit | confirm-delete
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Init edit form when switching to edit mode
  const startEdit = () => {
    if (!expense) return;
    setAmount(String(expense.amount || ''));
    setCategory(expense.type || '');
    setNote(expense.details || expense.note || '');
    setMode('edit');
    haptics.light();
  };

  const handleSaveEdit = async () => {
    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) { addToast('Amount must be greater than 0', 'error'); return; }
    if (!category) { addToast('Please select a category', 'error'); return; }

    haptics.medium();
    setSaving(true);
    try {
      const cat = getCat(category);
      await editExpense(expense.id, {
        type: category,
        amount: numAmount,
        label: cat.label,
        details: note,
      });
      addToast('Expense updated', 'success');
      handleClose();
    } catch (e) {
      haptics.error();
      addToast('Failed to update expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    haptics.medium();
    setSaving(true);
    try {
      await removeExpense(expense.id);
      addToast('Expense deleted', 'success');
      handleClose();
    } catch (e) {
      haptics.error();
      addToast('Failed to delete expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setMode('detail');
    setSaving(false);
    onClose();
  };

  if (!expense) return null;

  const cat = getCat(expense.type);
  const amt = Number(expense.amount) || 0;
  const dateStr = expense.date
    ? new Date(expense.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title={
      mode === 'detail' ? 'Expense Details' :
      mode === 'edit' ? 'Edit Expense' : null
    }>
      {/* DETAIL VIEW */}
      {mode === 'detail' && (
        <div>
          <div className="flex flex-col items-center py-4">
            <div className={`w-16 h-16 rounded-2xl ${cat.color} flex items-center justify-center text-3xl mb-3`}>
              {cat.icon}
            </div>
            <p className="text-sm text-surface-500">{cat.label}</p>
            <p className="text-3xl font-bold text-surface-900 dark:text-white mt-1">
              {currencySymbol}{amt.toLocaleString('en-BD')}
            </p>
            {dateStr && <p className="text-sm text-surface-500 mt-1">{dateStr}</p>}
            {(expense.details || expense.note) && (
              <p className="text-sm text-surface-600 dark:text-surface-400 mt-2 bg-surface-50 dark:bg-surface-800 px-4 py-2 rounded-xl">
                {expense.details || expense.note}
              </p>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <GButton fullWidth variant="secondary" onClick={startEdit}>
              <Edit2 className="w-4 h-4 mr-1.5" /> Edit
            </GButton>
            <GButton fullWidth variant="danger" onClick={() => { haptics.light(); setMode('confirm-delete'); }}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete
            </GButton>
          </div>
        </div>
      )}

      {/* EDIT VIEW */}
      {mode === 'edit' && (
        <div>
          <div className="mb-5">
            <div className="flex items-center border-b-2 border-primary-600 pb-2">
              <span className="text-2xl text-surface-500 mr-2">{currencySymbol}</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="text-3xl font-semibold bg-transparent outline-none w-full text-surface-900 dark:text-white"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {categories.map((c) => (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptics.light(); setCategory(c.id); }}
                className={`p-3 rounded-2xl text-center transition-all ${c.color} ${
                  category === c.id ? 'ring-2 ring-primary-600 ring-offset-2 dark:ring-offset-surface-900' : ''
                }`}
              >
                <span className="text-xl block mb-0.5">{c.icon}</span>
                <span className={`text-xs ${category === c.id ? 'font-semibold text-primary-600' : 'text-surface-600 dark:text-surface-400'}`}>
                  {c.label}
                </span>
              </motion.button>
            ))}
          </div>

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

          <div className="flex gap-3">
            <GButton fullWidth variant="secondary" onClick={() => setMode('detail')}>Cancel</GButton>
            <GButton fullWidth onClick={handleSaveEdit} loading={saving}>Save Changes</GButton>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {mode === 'confirm-delete' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-danger-50 dark:bg-danger-900/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-danger-500" />
          </div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">Delete expense?</h3>
          <p className="text-sm text-surface-500 mb-6">
            Delete this {currencySymbol}{amt.toLocaleString('en-BD')} {cat.label.toLowerCase()} expense? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <GButton fullWidth variant="secondary" onClick={() => setMode('detail')}>Cancel</GButton>
            <GButton fullWidth variant="danger" onClick={handleDelete} loading={saving}>Delete</GButton>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
