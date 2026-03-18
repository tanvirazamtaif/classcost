import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronRight, Pencil, Check, X, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GButton } from '../components/ui';
import { LayoutBottomNav } from '../components/layout';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';

// ═══════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════

// Stationery & supplies — quick add, amount + date only
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

// Books sub-categories — can have book name, subjects
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

  // Navigation flow
  const [view, setView] = useState('home'); // home | supplies | books | add-supply | add-book | edit
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  // Add supply form
  const [supplyAmount, setSupplyAmount] = useState('');
  const [supplyDate, setSupplyDate] = useState(new Date().toISOString().split('T')[0]);
  const [customSupplyName, setCustomSupplyName] = useState('');

  // Add book form
  const [bookAmount, setBookAmount] = useState('');
  const [bookDate, setBookDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookName, setBookName] = useState('');
  const [bookSubjects, setBookSubjects] = useState('');
  const [customBookName, setCustomBookName] = useState('');

  // Edit form
  const [editAmount, setEditAmount] = useState('');

  const [saving, setSaving] = useState(false);

  // ── Data ────────────────────────────────────────────────────

  const allItems = useMemo(() => {
    return (expenses || [])
      .filter(e => e.type === 'books')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [expenses]);

  const totalSpent = useMemo(() => allItems.reduce((s, e) => s + (Number(e.amount) || 0), 0), [allItems]);

  // ── Handlers ────────────────────────────────────────────────

  const handleBack = () => {
    haptics.light();
    if (view === 'add-supply' || view === 'add-book') setView(view === 'add-supply' ? 'supplies' : 'books');
    else if (view === 'supplies' || view === 'books' || view === 'edit') setView('home');
    else navigate('dashboard');
    setSelectedItem(null);
    setEditingExpense(null);
  };

  const handleSelectSupply = (item) => {
    haptics.light();
    setSelectedItem(item);
    setSupplyAmount('');
    setSupplyDate(new Date().toISOString().split('T')[0]);
    setCustomSupplyName('');
    setView('add-supply');
  };

  const handleSelectBook = (item) => {
    haptics.light();
    setSelectedItem(item);
    setBookAmount('');
    setBookDate(new Date().toISOString().split('T')[0]);
    setBookName('');
    setBookSubjects('');
    setCustomBookName('');
    setView('add-book');
  };

  const handleSaveSupply = async () => {
    const amt = parseFloat(supplyAmount);
    if (!amt || amt <= 0) { haptics.error(); addToast('Enter amount', 'error'); return; }
    setSaving(true);
    haptics.medium();
    try {
      const label = selectedItem.isCustom ? (customSupplyName || 'Custom Item') : selectedItem.label;
      await addExpense({
        type: 'books',
        amount: amt,
        label: 'Study Materials',
        details: label,
        date: supplyDate,
        meta: { category: 'supply', subType: selectedItem.id, label, icon: selectedItem.icon },
      });
      haptics.success();
      addToast(`${label} · ৳${amt.toLocaleString()} saved`, 'success');
      setView('home');
      setSelectedItem(null);
    } catch { haptics.error(); addToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleSaveBook = async () => {
    const amt = parseFloat(bookAmount);
    if (!amt || amt <= 0) { haptics.error(); addToast('Enter amount', 'error'); return; }
    setSaving(true);
    haptics.medium();
    try {
      const typeLabel = selectedItem.isCustom ? (customBookName || 'Book') : selectedItem.label;
      const subjects = bookSubjects.trim();
      const fullLabel = [typeLabel, bookName, subjects ? `(${subjects})` : ''].filter(Boolean).join(' — ');
      await addExpense({
        type: 'books',
        amount: amt,
        label: 'Study Materials',
        details: fullLabel || typeLabel,
        date: bookDate,
        meta: {
          category: 'book', subType: selectedItem.id, label: fullLabel || typeLabel,
          icon: selectedItem.icon, bookName: bookName || null, subjects: subjects || null,
        },
      });
      haptics.success();
      addToast(`${typeLabel} · ৳${amt.toLocaleString()} saved`, 'success');
      setView('home');
      setSelectedItem(null);
    } catch { haptics.error(); addToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleStartEdit = (exp) => {
    haptics.light();
    setEditingExpense(exp);
    setEditAmount(String(exp.amount || ''));
    setView('edit');
  };

  const handleSaveEdit = async () => {
    const amt = parseFloat(editAmount);
    if (!amt || amt <= 0) { haptics.error(); return; }
    haptics.medium();
    try {
      await editExpense(editingExpense.id, { amount: amt });
      haptics.success();
      addToast('Updated', 'success');
      setView('home');
      setEditingExpense(null);
    } catch { haptics.error(); addToast('Failed', 'error'); }
  };

  const handleDelete = async (expId) => {
    haptics.medium();
    try {
      await removeExpense(expId);
      addToast('Removed', 'success');
    } catch { haptics.error(); }
  };

  // ── Shared styles ───────────────────────────────────────────

  const cardCls = `w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
    d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
  }`;

  const inputCls = `w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
    d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
  }`;

  const getTitle = () => {
    if (view === 'supplies') return 'Stationery & Supplies';
    if (view === 'books') return 'Books & Papers';
    if (view === 'add-supply') return selectedItem?.label || 'Add Item';
    if (view === 'add-book') return selectedItem?.label || 'Add Book';
    if (view === 'edit') return 'Edit';
    return 'Study Materials';
  };

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
            {/* Two main sections */}
            <div className="space-y-2.5">
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => { haptics.light(); setView('supplies'); }}
                className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left ${
                  d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                }`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${d ? 'bg-amber-900/30' : 'bg-amber-50'}`}>✏️</div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Stationery & Supplies</p>
                  <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>Pen, pencil, notebook, geometry box...</p>
                </div>
                <ChevronRight className={`w-4 h-4 ${d ? 'text-surface-600' : 'text-surface-400'}`} />
              </motion.button>

              <motion.button whileTap={{ scale: 0.98 }} onClick={() => { haptics.light(); setView('books'); }}
                className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left ${
                  d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                }`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${d ? 'bg-amber-900/30' : 'bg-amber-50'}`}>📚</div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Books & Papers</p>
                  <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>Test papers, academic books, guides...</p>
                </div>
                <ChevronRight className={`w-4 h-4 ${d ? 'text-surface-600' : 'text-surface-400'}`} />
              </motion.button>
            </div>

            {/* Summary */}
            {totalSpent > 0 && (
              <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
                <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Total Spent</p>
                <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>৳{totalSpent.toLocaleString()}</p>
              </div>
            )}

            {/* Recent items */}
            {allItems.length > 0 && (
              <div>
                <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Recent</h2>
                <div className="space-y-2">
                  {allItems.slice(0, 15).map((exp, i) => {
                    const meta = exp.meta || {};
                    return (
                      <motion.div key={exp.id || i}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        className={`flex items-center justify-between p-3 rounded-xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
                        <button onClick={() => handleStartEdit(exp)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                          <span className="text-base">{meta.icon || '📚'}</span>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-surface-900'}`}>
                              {exp.details || meta.label || 'Study Material'}
                            </p>
                            <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                              {exp.date ? new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>৳{(Number(exp.amount) || 0).toLocaleString()}</p>
                          <button onClick={() => handleDelete(exp.id)}
                            className={`p-1.5 rounded-lg ${d ? 'hover:bg-surface-800' : 'hover:bg-surface-100'}`}>
                            <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
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
                <motion.button key={item.id} whileTap={{ scale: 0.95 }} onClick={() => handleSelectSupply(item)}
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
                <motion.button key={item.id} whileTap={{ scale: 0.98 }} onClick={() => handleSelectBook(item)}
                  className={cardCls}>
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

        {/* ═══ ADD SUPPLY FORM (amount + date only) ═══ */}
        {view === 'add-supply' && selectedItem && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${d ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
              <span>{selectedItem.icon}</span> {selectedItem.isCustom ? 'Custom Item' : selectedItem.label}
            </div>

            {selectedItem.isCustom && (
              <div>
                <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Item Name</label>
                <input type="text" placeholder="e.g., Highlighter, Ruler" value={customSupplyName}
                  onChange={(e) => setCustomSupplyName(e.target.value)} className={inputCls} autoFocus />
              </div>
            )}

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount *</label>
              <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${d ? 'border-surface-800 bg-surface-900' : 'border-surface-200 bg-white'} focus-within:border-primary-500`}>
                <span className="text-xl text-surface-400 mr-2">৳</span>
                <input type="text" inputMode="decimal" placeholder="0" value={supplyAmount}
                  onChange={(e) => setSupplyAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`}
                  autoFocus={!selectedItem.isCustom} />
              </div>
            </div>

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Date</label>
              <input type="date" value={supplyDate} onChange={(e) => setSupplyDate(e.target.value)} className={inputCls} />
            </div>

            <GButton fullWidth size="lg" onClick={handleSaveSupply} loading={saving} disabled={saving || parseFloat(supplyAmount) <= 0}>
              Save
            </GButton>
          </motion.div>
        )}

        {/* ═══ ADD BOOK FORM (amount + date + optional name/subjects) ═══ */}
        {view === 'add-book' && selectedItem && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${d ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
              <span>{selectedItem.icon}</span> {selectedItem.isCustom ? 'Custom' : selectedItem.label}
            </div>

            {selectedItem.isCustom && (
              <div>
                <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Type Name</label>
                <input type="text" placeholder="e.g., Reference Book" value={customBookName}
                  onChange={(e) => setCustomBookName(e.target.value)} className={inputCls} />
              </div>
            )}

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount *</label>
              <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${d ? 'border-surface-800 bg-surface-900' : 'border-surface-200 bg-white'} focus-within:border-primary-500`}>
                <span className="text-xl text-surface-400 mr-2">৳</span>
                <input type="text" inputMode="decimal" placeholder="0" value={bookAmount}
                  onChange={(e) => setBookAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`} autoFocus />
              </div>
            </div>

            {/* Book name — optional */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                Book Name <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <input type="text" placeholder="e.g., Physics 1st Paper" value={bookName}
                onChange={(e) => setBookName(e.target.value)} className={inputCls} />
            </div>

            {/* Subjects — optional, can be many */}
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

            {/* Date */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Date</label>
              <input type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} className={inputCls} />
            </div>

            <GButton fullWidth size="lg" onClick={handleSaveBook} loading={saving} disabled={saving || parseFloat(bookAmount) <= 0}>
              Save
            </GButton>
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
                {editingExpense.date ? new Date(editingExpense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </p>
            </div>

            <div>
              <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount</label>
              <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition ${d ? 'border-surface-800 bg-surface-900' : 'border-surface-200 bg-white'} focus-within:border-primary-500`}>
                <span className="text-xl text-surface-400 mr-2">৳</span>
                <input type="text" inputMode="decimal" value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={`text-2xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`} autoFocus />
              </div>
            </div>

            <GButton fullWidth size="lg" onClick={handleSaveEdit} disabled={parseFloat(editAmount) <= 0}>
              Update
            </GButton>
          </motion.div>
        )}

      </main>
      {view === 'home' && <LayoutBottomNav />}
    </motion.div>
  );
};

export default StudyMaterialsPage;
