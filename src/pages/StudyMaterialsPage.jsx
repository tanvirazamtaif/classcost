import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GButton } from '../components/ui';
import { LayoutBottomNav } from '../components/layout';
import { TransactionCard } from '../components/shared/TransactionCard';
import { AmountInput } from '../components/shared/AmountInput';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { createTransaction, getByCategory, getTotalSpent, validateAmount, formatTransactionDate } from '../core/transactions';

// ═══════════════════════════════════════════════════════════════
// ITEM TYPES
// ═══════════════════════════════════════════════════════════════

// Stationery — fast add, amount + date only (Quick Add friendly)
const SUPPLY_ITEMS = [
  { id: 'books_general', icon: '📚', label: 'Books' },
  { id: 'notebook', icon: '📓', label: 'Notebook' },
  { id: 'pen', icon: '🖊️', label: 'Pen' },
  { id: 'pencil', icon: '✏️', label: 'Pencil' },
  { id: 'geometry_box', icon: '📐', label: 'Geometry Box' },
  { id: 'calculator', icon: '🔢', label: 'Calculator' },
  { id: 'eraser', icon: '🧹', label: 'Eraser / Sharpener' },
  { id: 'bag', icon: '🎒', label: 'Bag / Backpack' },
  { id: 'photocopy', icon: '📄', label: 'Photocopy / Print' },
  { id: 'custom_supply', icon: '📦', label: 'Custom', isCustom: true },
];

// Books — optional book name + subjects (less frequent, larger purchases)
const BOOK_TYPES = [
  { id: 'test_paper', icon: '📝', label: 'Test Paper', desc: 'Practice test papers' },
  { id: 'academic_book', icon: '📘', label: 'Academic Book', desc: 'Textbooks, references' },
  { id: 'model_question', icon: '❓', label: 'Model Questions', desc: 'Question bank, suggestions' },
  { id: 'guide_book', icon: '📗', label: 'Guide / Help Book', desc: 'Solution guides, notes' },
  { id: 'note_sheet', icon: '📋', label: 'Note / Sheet', desc: 'Handwritten notes, sheets' },
  { id: 'custom_book', icon: '📦', label: 'Custom', desc: 'Other book type', isCustom: true },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const StudyMaterialsPage = () => {
  const { navigate, theme, expenses, addExpense, editExpense, removeExpense, addToast } = useApp();
  const d = theme === 'dark';

  // Flow: home | supplies | books | add-supply | add-book | edit
  const [view, setView] = useState('home');
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customName, setCustomName] = useState('');
  const [bookName, setBookName] = useState('');
  const [bookSubjects, setBookSubjects] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Data (shared helpers) ───────────────────────────────────

  const allItems = useMemo(() => getByCategory(expenses, 'books'), [expenses]);
  const totalSpent = useMemo(() => getTotalSpent(expenses, 'books'), [expenses]);

  // ── Navigation ──────────────────────────────────────────────

  const handleBack = () => {
    haptics.light();
    if (view === 'add-supply' || view === 'add-book') setView(view === 'add-supply' ? 'supplies' : 'books');
    else if (view === 'supplies' || view === 'books' || view === 'edit') setView('home');
    else navigate('dashboard');
    resetForm();
  };

  const resetForm = () => {
    setSelectedItem(null);
    setEditingExpense(null);
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCustomName('');
    setBookName('');
    setBookSubjects('');
    setEditAmount('');
    setErrors({});
  };

  // ── Save handlers (use createTransaction) ───────────────────

  const handleSaveSupply = async () => {
    const v = validateAmount(parseFloat(amount));
    if (!v.valid) { setErrors({ amount: v.error }); haptics.error(); return; }
    setSaving(true);
    haptics.medium();
    try {
      const label = selectedItem.isCustom ? (customName || 'Custom Item') : selectedItem.label;
      await addExpense(createTransaction({
        type: 'books',
        amount: parseFloat(amount),
        details: label,
        date,
        meta: { category: 'supply', subType: selectedItem.id, label, icon: selectedItem.icon },
      }));
      haptics.success();
      addToast(`${label} · ৳${parseFloat(amount).toLocaleString()} saved`, 'success');
      setView('home');
      resetForm();
    } catch { haptics.error(); addToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleSaveBook = async () => {
    const v = validateAmount(parseFloat(amount));
    if (!v.valid) { setErrors({ amount: v.error }); haptics.error(); return; }
    setSaving(true);
    haptics.medium();
    try {
      const typeLabel = selectedItem.isCustom ? (customName || 'Book') : selectedItem.label;
      const subjects = bookSubjects.trim();
      const fullLabel = [typeLabel, bookName, subjects ? `(${subjects})` : ''].filter(Boolean).join(' — ');
      await addExpense(createTransaction({
        type: 'books',
        amount: parseFloat(amount),
        details: fullLabel || typeLabel,
        date,
        meta: {
          category: 'book', subType: selectedItem.id, label: fullLabel || typeLabel,
          icon: selectedItem.icon, bookName: bookName || null, subjects: subjects || null,
        },
      }));
      haptics.success();
      addToast(`${typeLabel} · ৳${parseFloat(amount).toLocaleString()} saved`, 'success');
      setView('home');
      resetForm();
    } catch { haptics.error(); addToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    const v = validateAmount(parseFloat(editAmount));
    if (!v.valid) { haptics.error(); return; }
    haptics.medium();
    try {
      await editExpense(editingExpense.id, { amount: parseFloat(editAmount) });
      haptics.success();
      addToast('Updated', 'success');
      setView('home');
      resetForm();
    } catch { haptics.error(); addToast('Failed', 'error'); }
  };

  // ── Helpers ─────────────────────────────────────────────────

  const getTitle = () => {
    if (view === 'supplies') return 'Stationery & Supplies';
    if (view === 'books') return 'Books & Papers';
    if (view === 'add-supply') return selectedItem?.label || 'Add Item';
    if (view === 'add-book') return selectedItem?.label || 'Add Book';
    if (view === 'edit') return 'Edit';
    return 'Study Materials';
  };

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
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{getTitle()}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">

        {/* ═══ HOME ═══ */}
        {view === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Section cards */}
            <div className="space-y-2.5">
              {[
                { key: 'supplies', icon: '✏️', label: 'Stationery & Supplies', desc: 'Pen, pencil, notebook, geometry box...' },
                { key: 'books', icon: '📚', label: 'Books & Papers', desc: 'Test papers, academic books, guides...' },
              ].map(section => (
                <motion.button key={section.key} whileTap={{ scale: 0.98 }}
                  onClick={() => { haptics.light(); setView(section.key); }}
                  className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left ${
                    d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                  }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${d ? 'bg-amber-900/30' : 'bg-amber-50'}`}>{section.icon}</div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{section.label}</p>
                    <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>{section.desc}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${d ? 'text-surface-600' : 'text-surface-400'}`} />
                </motion.button>
              ))}
            </div>

            {/* Summary */}
            {totalSpent > 0 && (
              <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Total Spent</p>
                    <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>৳{totalSpent.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Items</p>
                    <p className={`text-lg font-semibold ${d ? 'text-surface-300' : 'text-surface-700'}`}>{allItems.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent — shared TransactionCard */}
            {allItems.length > 0 && (
              <div>
                <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Recent</h2>
                <div className="space-y-2">
                  {allItems.slice(0, 15).map((exp, i) => (
                    <TransactionCard
                      key={exp.id || i}
                      transaction={exp}
                      dark={d}
                      icon={exp.meta?.icon}
                      animationDelay={i * 0.02}
                      onEdit={() => { haptics.light(); setEditingExpense(exp); setEditAmount(String(exp.amount || '')); setView('edit'); }}
                      onDelete={() => { haptics.medium(); removeExpense(exp.id); addToast('Removed', 'success'); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {allItems.length === 0 && (
              <div className={`text-center py-10 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                <span className="text-4xl block mb-3">📚</span>
                <p className="text-sm">No study materials recorded yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ SUPPLIES GRID ═══ */}
        {view === 'supplies' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <p className={`text-sm mb-3 ${d ? 'text-surface-400' : 'text-surface-500'}`}>What did you buy?</p>
            <div className="grid grid-cols-3 gap-2">
              {SUPPLY_ITEMS.map(item => (
                <motion.button key={item.id} whileTap={{ scale: 0.95 }}
                  onClick={() => { haptics.light(); setSelectedItem(item); setAmount(''); setDate(new Date().toISOString().split('T')[0]); setCustomName(''); setView('add-supply'); }}
                  className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border transition ${
                    d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                  }`}>
                  <span className="text-2xl">{item.icon}</span>
                  <span className={`text-xs font-medium text-center leading-tight ${d ? 'text-surface-300' : 'text-surface-700'}`}>{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ BOOKS LIST ═══ */}
        {view === 'books' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <p className={`text-sm mb-3 ${d ? 'text-surface-400' : 'text-surface-500'}`}>What type of book?</p>
            <div className="space-y-2">
              {BOOK_TYPES.map(item => (
                <motion.button key={item.id} whileTap={{ scale: 0.98 }}
                  onClick={() => { haptics.light(); setSelectedItem(item); setAmount(''); setDate(new Date().toISOString().split('T')[0]); setBookName(''); setBookSubjects(''); setCustomName(''); setView('add-book'); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                    d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                  }`}>
                  <span className="text-xl w-8 text-center">{item.icon}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{item.label}</p>
                    <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>{item.desc}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${d ? 'text-surface-600' : 'text-surface-400'}`} />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ ADD SUPPLY (amount + date) ═══ */}
        {view === 'add-supply' && selectedItem && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${d ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
              <span>{selectedItem.icon}</span> {selectedItem.isCustom ? 'Custom Item' : selectedItem.label}
            </div>

            {selectedItem.isCustom && (
              <div>
                <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Item Name</label>
                <input type="text" placeholder="e.g., Highlighter, Ruler" value={customName}
                  onChange={(e) => setCustomName(e.target.value)} className={inputCls} autoFocus />
              </div>
            )}

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount *</label>
              <AmountInput value={amount} onChange={(v) => { setAmount(v); if (errors.amount) setErrors({}); }}
                dark={d} error={errors.amount} autoFocus={!selectedItem.isCustom} />
            </div>

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>

            <GButton fullWidth size="lg" onClick={handleSaveSupply} loading={saving} disabled={saving || parseFloat(amount) <= 0}>Save</GButton>
          </motion.div>
        )}

        {/* ═══ ADD BOOK (amount + optional name/subjects + date) ═══ */}
        {view === 'add-book' && selectedItem && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${d ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
              <span>{selectedItem.icon}</span> {selectedItem.isCustom ? 'Custom' : selectedItem.label}
            </div>

            {selectedItem.isCustom && (
              <div>
                <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Type Name</label>
                <input type="text" placeholder="e.g., Reference Book" value={customName}
                  onChange={(e) => setCustomName(e.target.value)} className={inputCls} />
              </div>
            )}

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount *</label>
              <AmountInput value={amount} onChange={(v) => { setAmount(v); if (errors.amount) setErrors({}); }}
                dark={d} error={errors.amount} autoFocus />
            </div>

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Book Name <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <input type="text" placeholder="e.g., Physics 1st Paper" value={bookName}
                onChange={(e) => setBookName(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Subject(s) <span className="text-surface-400 font-normal">(optional — separate with commas)</span>
              </label>
              <input type="text" placeholder="e.g., Physics, Chemistry, Math" value={bookSubjects}
                onChange={(e) => setBookSubjects(e.target.value)} className={inputCls} />
              {bookSubjects.includes(',') && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {bookSubjects.split(',').map((s, i) => s.trim() && (
                    <span key={i} className={`text-xs px-2 py-1 rounded-full ${d ? 'bg-primary-900/30 text-primary-300' : 'bg-primary-100 text-primary-700'}`}>
                      {s.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>

            <GButton fullWidth size="lg" onClick={handleSaveBook} loading={saving} disabled={saving || parseFloat(amount) <= 0}>Save</GButton>
          </motion.div>
        )}

        {/* ═══ EDIT ═══ */}
        {view === 'edit' && editingExpense && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
              <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
                {editingExpense.details || editingExpense.meta?.label || 'Study Material'}
              </p>
              <p className={`text-xs mt-1 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                {formatTransactionDate(editingExpense.date, { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount</label>
              <AmountInput value={editAmount} onChange={setEditAmount} dark={d} autoFocus />
            </div>

            <GButton fullWidth size="lg" onClick={handleSaveEdit} disabled={parseFloat(editAmount) <= 0}>Update</GButton>
          </motion.div>
        )}

      </main>
      {view === 'home' && <LayoutBottomNav />}
    </motion.div>
  );
};

export default StudyMaterialsPage;
