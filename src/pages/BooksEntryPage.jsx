import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GButton, GCard, GCardContent, BottomSheet } from '../components/ui';
import { haptics } from '../lib/haptics';
import { pageTransition, fadeInUp } from '../lib/animations';
import { BOOKS_TYPES } from '../types/payment';
import { createEntry, createEntryItem } from '../types/entrySchema';
import { makeFmt } from '../utils/format';

const BooksEntryPage = () => {
  const { user, theme, navigate, addEntry, addToast } = useApp();
  const d = theme === 'dark';
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || 'BDT');
  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'INR' ? '₹' : '৳';

  const [mode, setMode] = useState('bulk');
  const [bulkAmount, setBulkAmount] = useState('');
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);

  const totalIndividual = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const handleAddItem = (typeId) => {
    const type = BOOKS_TYPES.find(t => t.id === typeId);
    if (!type) return;
    haptics.light();
    setItems(prev => [...prev, createEntryItem({
      subType: typeId,
      label: type.label,
      amount: 0,
      note: '',
    })]);
    setShowAddItem(false);
  };

  const updateItemAmount = (itemId, amount) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, amount: Number(amount) || 0 } : i));
  };

  const updateItemNote = (itemId, note) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, note } : i));
  };

  const removeItem = (itemId) => {
    haptics.light();
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleSave = async () => {
    const total = mode === 'bulk' ? Number(bulkAmount) : totalIndividual;
    if (!total) return;
    haptics.success();
    setSaving(true);

    try {
      const entry = createEntry({
        category: 'books',
        mode,
        items: mode === 'individual' ? items : [],
        totalAmount: total,
        note,
      });
      await addEntry(entry);
      addToast('Books payment saved', 'success');
      navigate('dashboard');
    } catch (e) {
      console.error(e);
      haptics.error();
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const availableTypes = BOOKS_TYPES.filter(t => !items.some(i => i.subType === t.id));

  return (
    <motion.div {...pageTransition} className={`min-h-screen ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => { haptics.light(); navigate('dashboard'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <div>
            <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Books & Supplies</h1>
            <p className="text-xs text-surface-500">📚 Add book expenses</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'bulk', label: 'Total Amount' },
            { id: 'individual', label: 'Item-wise' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => { haptics.light(); setMode(m.id); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                mode === m.id
                  ? 'bg-primary-600 text-white'
                  : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Bulk Mode */}
        {mode === 'bulk' && (
          <motion.div {...fadeInUp}>
            <GCard>
              <GCardContent>
                <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                  Total books payment
                </label>
                <div className="flex items-center border-b-2 border-primary-600 pb-2 mb-4">
                  <span className="text-2xl text-surface-500 mr-2">{currencySymbol}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    className="text-3xl font-semibold bg-transparent outline-none w-full text-surface-900 dark:text-white"
                    autoFocus
                  />
                </div>
                <input
                  type="text"
                  placeholder="Add a note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={80}
                  className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:border-primary-600 transition text-surface-900 dark:text-white"
                />
              </GCardContent>
            </GCard>
          </motion.div>
        )}

        {/* Individual Mode */}
        {mode === 'individual' && (
          <motion.div {...fadeInUp} className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">📋</span>
                <p className={`text-sm mb-1 ${d ? 'text-surface-400' : 'text-surface-600'}`}>No items added yet</p>
                <p className="text-xs text-surface-500">Tap the button below to add book expenses</p>
              </div>
            ) : (
              items.map((item) => {
                const type = BOOKS_TYPES.find(t => t.id === item.subType);
                const isExpanded = expandedItem === item.id;
                return (
                  <GCard key={item.id}>
                    <GCardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{type?.icon || '📄'}</span>
                          <div>
                            <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{item.label}</p>
                            {type?.description && <p className="text-xs text-surface-500">{type.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setExpandedItem(isExpanded ? null : item.id)} className="p-1 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-surface-500" /> : <ChevronDown className="w-4 h-4 text-surface-500" />}
                          </button>
                          <button onClick={() => removeItem(item.id)} className="p-1 rounded-full hover:bg-danger-50 dark:hover:bg-danger-500/10 text-danger-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-surface-500">{currencySymbol}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={item.amount || ''}
                          onChange={(e) => updateItemAmount(item.id, e.target.value)}
                          className="flex-1 text-lg font-semibold bg-transparent outline-none text-surface-900 dark:text-white border-b border-surface-200 dark:border-surface-700 pb-1"
                        />
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <input
                              type="text"
                              placeholder="Note (optional)"
                              value={item.note || ''}
                              onChange={(e) => updateItemNote(item.id, e.target.value)}
                              maxLength={50}
                              className="w-full mt-3 p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm outline-none focus:border-primary-600 text-surface-900 dark:text-white"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </GCardContent>
                  </GCard>
                );
              })
            )}

            {availableTypes.length > 0 && (
              <button
                onClick={() => { haptics.light(); setShowAddItem(true); }}
                className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium flex items-center justify-center gap-2 transition ${
                  d ? 'border-surface-700 text-surface-400 hover:border-surface-600' : 'border-surface-300 text-surface-500 hover:border-surface-400'
                }`}
              >
                <Plus className="w-4 h-4" /> Add item
              </button>
            )}

            {items.length > 0 && (
              <GCard>
                <GCardContent className="py-3 flex items-center justify-between">
                  <span className={`text-sm font-medium ${d ? 'text-surface-400' : 'text-surface-500'}`}>Total</span>
                  <span className={`text-xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>{fmt(totalIndividual)}</span>
                </GCardContent>
              </GCard>
            )}

            <input
              type="text"
              placeholder="Overall note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
              className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:border-primary-600 transition text-surface-900 dark:text-white"
            />
          </motion.div>
        )}

        <div className="mt-6">
          <GButton fullWidth size="lg" onClick={handleSave} loading={saving} disabled={mode === 'bulk' ? !bulkAmount : totalIndividual === 0}>
            Save books payment
          </GButton>
        </div>
      </div>

      <BottomSheet isOpen={showAddItem} onClose={() => setShowAddItem(false)} title="Add book item">
        <div className="space-y-2">
          {availableTypes.map(type => (
            <button
              key={type.id}
              onClick={() => handleAddItem(type.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition ${d ? 'hover:bg-surface-800' : 'hover:bg-surface-50'}`}
            >
              <span className="text-2xl">{type.icon}</span>
              <div className="text-left">
                <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{type.label}</p>
                <p className="text-xs text-surface-500">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </motion.div>
  );
};

export default BooksEntryPage;
