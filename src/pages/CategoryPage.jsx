import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { LayoutBottomNav } from '../components/layout/LayoutBottomNav';
import { haptics } from '../lib/haptics';
import { makeFmt } from '../utils/format';

const BG = '#0a0a14';
const CARD = '#12121a';
const BORDER = '#1e1e2e';
const ACCENT = '#6366f1';
const TEXT1 = '#f4f4f5';
const TEXT2 = '#71717a';
const TEXT3 = '#52525b';

const CATEGORY_CONFIG = {
  transport: {
    label: 'Transport', icon: '🚌', color: '#3b82f6',
    subs: ['bus', 'pathao', 'rickshaw', 'cng', 'train', 'uber', 'walking'],
  },
  food: {
    label: 'Food', icon: '🍽️', color: '#f97316',
    subs: ['breakfast', 'lunch', 'dinner', 'snacks', 'tiffin'],
  },
  books: {
    label: 'Materials', icon: '📚', color: '#eab308',
    subs: ['textbooks', 'stationery', 'digital'],
  },
  other: {
    label: 'Other', icon: '📦', color: '#64748b',
    subs: [],
  },
};

function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
}

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const CategoryPage = ({ category }) => {
  const { goBack, addToast, user } = useApp();
  const { allEntries, recordPayment, scopedTotals } = useV3();
  const fmt = makeFmt(user?.profile?.currency || 'BDT');
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [subCat, setSubCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Stats
  const thisMonth = scopedTotals.thisMonth?.byCategory?.[category] || 0;
  const lastMonth = scopedTotals.lastMonth?.byCategory?.[category] || 0;
  const now = new Date();
  const dayOfMonth = now.getDate();
  const dailyAvg = dayOfMonth > 0 ? Math.round(thisMonth / dayOfMonth) : 0;

  // History: entries for this category, grouped by day
  const history = useMemo(() => {
    const filtered = (allEntries || []).filter(e => e.category === category && e.direction === 'DEBIT');
    const groups = {};
    for (const e of filtered) {
      const key = new Date(e.date).toDateString();
      if (!groups[key]) groups[key] = { date: e.date, entries: [] };
      groups[key].entries.push(e);
    }
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);
  }, [allEntries, category]);

  const handleSave = useCallback(async () => {
    const num = Number(amount);
    if (!num || num <= 0) { addToast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    haptics.medium();
    try {
      await recordPayment({
        type: 'PAYMENT',
        direction: 'DEBIT',
        category,
        subCategory: subCat || null,
        amountMinor: Math.round(num * 100),
        date: new Date().toISOString(),
        note: note || null,
      });
      setAmount('');
      setNote('');
      setSubCat('');
      haptics.success();
      addToast('Saved!', 'success');
    } catch (err) {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }, [amount, note, subCat, category, recordPayment, addToast]);

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 backdrop-blur-xl"
        style={{ background: 'rgba(10,10,20,0.9)', borderBottom: `0.5px solid ${BORDER}` }}>
        <button onClick={() => { haptics.light(); goBack(); }} className="p-1">
          <ArrowLeft size={20} color={TEXT2} />
        </button>
        <span className="text-lg">{config.icon}</span>
        <p className="text-[15px] font-medium" style={{ color: TEXT1 }}>{config.label}</p>
      </header>

      <div className="max-w-[420px] mx-auto px-4 pt-4 space-y-5">
        {/* Stats */}
        <div className="flex gap-2">
          {[
            { label: 'This month', value: thisMonth },
            { label: 'Last month', value: lastMonth },
            { label: 'Daily avg', value: dailyAvg },
          ].map(s => (
            <div key={s.label} className="flex-1 rounded-xl p-3 text-center" style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
              <p className="text-[10px]" style={{ color: TEXT3 }}>{s.label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: TEXT1 }}>{fmt(s.value / 100)}</p>
            </div>
          ))}
        </div>

        {/* Sub-category chips */}
        {config.subs.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button onClick={() => setSubCat('')}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium"
              style={{ background: !subCat ? config.color : 'transparent', color: !subCat ? 'white' : TEXT3, border: `0.5px solid ${!subCat ? config.color : BORDER}` }}>
              All
            </button>
            {config.subs.map(s => (
              <button key={s} onClick={() => { haptics.light(); setSubCat(subCat === s ? '' : s); }}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize"
                style={{ background: subCat === s ? config.color : 'transparent', color: subCat === s ? 'white' : TEXT3, border: `0.5px solid ${subCat === s ? config.color : BORDER}` }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Quick add */}
        <div className="rounded-xl p-4" style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
          <div className="flex items-center rounded-xl overflow-hidden mb-3" style={{ background: BG, border: `0.5px solid ${BORDER}` }}>
            <span className="pl-3 text-lg" style={{ color: TEXT3 }}>৳</span>
            <input type="text" inputMode="decimal" value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0" autoFocus
              className="flex-1 px-2 py-3 text-2xl font-semibold bg-transparent outline-none"
              style={{ color: TEXT1 }} />
          </div>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)" maxLength={80}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
            style={{ background: BG, border: `0.5px solid ${BORDER}`, color: TEXT1 }} />
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-medium text-white"
            style={{ background: saving ? TEXT3 : config.color }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: TEXT2 }}>History</p>
            <div className="space-y-3">
              {history.map((group, gi) => (
                <div key={gi}>
                  <p className="text-[11px] font-medium mb-1.5" style={{ color: TEXT3 }}>{dayLabel(group.date)}</p>
                  <div className="space-y-1">
                    {group.entries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{ background: CARD }}>
                        <div className="flex items-center gap-2">
                          {entry.subCategory && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                              style={{ background: `${config.color}15`, color: config.color }}>
                              {entry.subCategory}
                            </span>
                          )}
                          <span className="text-[11px]" style={{ color: TEXT3 }}>{fmtTime(entry.date)}</span>
                        </div>
                        <span className="text-sm font-medium" style={{ color: TEXT1 }}>{fmt(entry.amountMinor / 100)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <LayoutBottomNav onAddPress={() => setSheetOpen(true)} />
    </div>
  );
};

export default CategoryPage;
