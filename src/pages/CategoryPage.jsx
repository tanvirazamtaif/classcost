import React, { useState, useMemo, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { LayoutBottomNav } from '../components/layout/LayoutBottomNav';
import { haptics } from '../lib/haptics';
import { makeFmt } from '../utils/format';
import { getThemeColors } from '../lib/themeColors';

const CATEGORY_CONFIG = {
  transport: {
    label: 'Transport', icon: '🚌', color: '#3b82f6',
    subs: ['bus', 'pathao', 'rickshaw', 'cng', 'train', 'uber'],
    quickDefaults: [
      { label: 'Bus', sub: 'bus', amount: 20 },
      { label: 'Pathao', sub: 'pathao', amount: 100 },
      { label: 'Rickshaw', sub: 'rickshaw', amount: 30 },
      { label: 'CNG', sub: 'cng', amount: 50 },
    ],
  },
  food: {
    label: 'Food', icon: '🍽️', color: '#f97316',
    subs: ['breakfast', 'lunch', 'dinner', 'snacks', 'tiffin'],
    quickDefaults: [
      { label: 'Lunch', sub: 'lunch', amount: 80 },
      { label: 'Breakfast', sub: 'breakfast', amount: 50 },
      { label: 'Dinner', sub: 'dinner', amount: 100 },
      { label: 'Snacks', sub: 'snacks', amount: 30 },
    ],
  },
  books: {
    label: 'Materials', icon: '📚', color: '#eab308',
    subs: ['textbooks', 'stationery', 'digital'],
    quickDefaults: [
      { label: 'Photocopy', sub: 'stationery', amount: 20 },
      { label: 'Pen/Pencil', sub: 'stationery', amount: 15 },
    ],
  },
  other: {
    label: 'Other', icon: '📦', color: '#64748b',
    subs: [],
    quickDefaults: [],
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

export const CategoryPage = ({ category, scopedEntityId = null }) => {
  const { goBack, addToast, user, theme = 'dark', routeParams } = useApp();
  const { allEntries, recordPayment, entities } = useV3();
  const c = getThemeColors(theme === 'dark');
  const fmt = makeFmt(user?.profile?.currency || 'BDT');
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  const lockedEntity = scopedEntityId || routeParams?.scopedEntityId || null;
  const isScoped = !!lockedEntity;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [subCat, setSubCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');

  const savedDefault = localStorage.getItem('cc_last_entity_' + category);
  const [entityId, setEntityId] = useState(
    lockedEntity || (savedDefault && savedDefault !== 'personal' ? savedDefault : null)
  );

  const activeEntities = useMemo(() => (entities || []).filter(e => e.isActive), [entities]);

  const scopedEntityName = useMemo(() => {
    if (!lockedEntity) return null;
    return activeEntities.find(e => e.id === lockedEntity)?.name || null;
  }, [lockedEntity, activeEntities]);

  // Stats — scoped to entity if in institution mode
  const stats = useMemo(() => {
    const filtered = (allEntries || []).filter(e => {
      if (e.category !== category || e.direction !== 'DEBIT') return false;
      if (isScoped) return e.entityId === lockedEntity;
      return true;
    });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = filtered.filter(e => new Date(e.date) >= monthStart).reduce((s, e) => s + e.amountMinor, 0);
    const lastMonth = filtered.filter(e => new Date(e.date) >= lastMonthStart && new Date(e.date) < monthStart).reduce((s, e) => s + e.amountMinor, 0);
    const dailyAvg = now.getDate() > 0 ? Math.round(thisMonth / now.getDate()) : 0;
    return { thisMonth, lastMonth, dailyAvg };
  }, [allEntries, category, isScoped, lockedEntity]);

  // History — filtered by entity in dashboard mode
  const history = useMemo(() => {
    const filtered = (allEntries || []).filter(e => {
      if (e.category !== category || e.direction !== 'DEBIT') return false;
      if (isScoped) return e.entityId === lockedEntity;
      if (historyFilter === 'all') return true;
      if (historyFilter === 'personal') return !e.entityId;
      return e.entityId === historyFilter;
    });
    const groups = {};
    for (const e of filtered) {
      const key = new Date(e.date).toDateString();
      if (!groups[key]) groups[key] = { date: e.date, entries: [] };
      groups[key].entries.push(e);
    }
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);
  }, [allEntries, category, historyFilter, isScoped, lockedEntity]);

  // Smart quick entries
  const quickEntries = useMemo(() => {
    const defaults = (config.quickDefaults || []).map(q => ({ ...q, source: 'default' }));
    const freq = {};
    for (const group of history) {
      for (const entry of group.entries) {
        const key = (entry.subCategory || 'none') + '_' + entry.amountMinor;
        if (!freq[key]) freq[key] = { sub: entry.subCategory, amount: entry.amountMinor / 100, count: 0 };
        freq[key].count++;
      }
    }
    const repeated = Object.values(freq)
      .filter(f => f.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(f => ({ label: f.sub ? f.sub.charAt(0).toUpperCase() + f.sub.slice(1) : 'Quick', sub: f.sub || '', amount: f.amount, source: 'repeated' }));
    const recentEntry = history[0]?.entries?.[0];
    const recent = recentEntry ? [{
      label: recentEntry.subCategory ? recentEntry.subCategory.charAt(0).toUpperCase() + recentEntry.subCategory.slice(1) : 'Last',
      sub: recentEntry.subCategory || '',
      amount: recentEntry.amountMinor / 100,
      source: 'recent',
    }] : [];
    const all = [...recent, ...repeated, ...defaults];
    const seen = new Set();
    return all.filter(q => {
      const key = q.label + '_' + q.amount;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [history, config]);

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
        entityId: isScoped ? lockedEntity : (entityId || null),
      });
      setAmount('');
      setNote('');
      setSubCat('');
      haptics.success();
      addToast('Saved!', 'success');
      localStorage.setItem('cc_last_entity_' + category, isScoped ? lockedEntity : (entityId || 'personal'));
    } catch (err) {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }, [amount, note, subCat, category, recordPayment, addToast, entityId, isScoped, lockedEntity]);

  return (
    <div className="min-h-screen pb-24" style={{ background: c.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 backdrop-blur-xl"
        style={{ background: c.headerBg, borderBottom: `0.5px solid ${c.border}` }}>
        <button onClick={() => { haptics.light(); goBack(); }} className="p-1">
          <ArrowLeft size={20} color={c.text2} />
        </button>
        <span className="text-lg">{config.icon}</span>
        <div>
          <p className="text-[15px] font-medium" style={{ color: c.text1 }}>{config.label}</p>
          {scopedEntityName && (
            <p className="text-[11px]" style={{ color: c.text3 }}>{scopedEntityName}</p>
          )}
        </div>
      </header>

      <div className="max-w-[420px] mx-auto px-4 pt-4 space-y-5">
        {/* Stats */}
        <div className="flex gap-2">
          {[
            { label: 'This month', value: stats.thisMonth },
            { label: 'Last month', value: stats.lastMonth },
            { label: 'Daily avg', value: stats.dailyAvg },
          ].map(s => (
            <div key={s.label} className="flex-1 rounded-xl p-3 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
              <p className="text-[10px]" style={{ color: c.text3 }}>{s.label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: c.text1 }}>{fmt(s.value / 100)}</p>
            </div>
          ))}
        </div>

        {/* Sub-category chips */}
        {config.subs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {config.subs.map(s => (
              <button key={s} onClick={() => { haptics.light(); setSubCat(subCat === s ? '' : s); }}
                className="px-4 py-2 rounded-xl text-xs font-medium capitalize"
                style={{
                  background: subCat === s ? config.color : c.card,
                  color: subCat === s ? 'white' : c.text2,
                  border: `0.5px solid ${subCat === s ? config.color : c.border}`,
                }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Quick add card */}
        <div className="rounded-xl p-4" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
          {/* Entity attribution — dashboard mode only, hidden when no entities */}
          {!isScoped && activeEntities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => setEntityId(null)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium"
                style={!entityId ? { background: c.accent, color: 'white' } : { color: c.text3, border: `0.5px solid ${c.border}` }}>
                Personal
              </button>
              {activeEntities.map(entity => (
                <button key={entity.id} onClick={() => setEntityId(entity.id)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium"
                  style={entityId === entity.id ? { background: c.accent, color: 'white' } : { color: c.text3, border: `0.5px solid ${c.border}` }}>
                  {entity.name}
                </button>
              ))}
            </div>
          )}

          {/* Quick entry chips */}
          {quickEntries.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {quickEntries.map((q, i) => (
                <button key={i} onClick={() => { haptics.light(); setAmount(String(q.amount)); setSubCat(q.sub); }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
                  style={{ background: c.bg, border: `0.5px solid ${c.border}`, color: c.text2 }}>
                  {q.label} <span style={{ color: config.color }}>৳{q.amount}</span>
                </button>
              ))}
            </div>
          )}

          {/* Amount input */}
          <div className="flex items-center rounded-xl overflow-hidden mb-3" style={{ background: c.bg, border: `0.5px solid ${c.border}` }}>
            <span className="pl-3 text-lg" style={{ color: c.text3 }}>৳</span>
            <input type="text" inputMode="decimal" value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0" autoFocus
              className="flex-1 px-2 py-3 text-2xl font-semibold bg-transparent outline-none"
              style={{ color: c.text1 }} />
          </div>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)" maxLength={80}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
            style={{ background: c.bg, border: `0.5px solid ${c.border}`, color: c.text1 }} />
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-medium text-white"
            style={{ background: saving ? c.text3 : config.color }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* History */}
        {(history.length > 0 || !isScoped) && (
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: c.text2 }}>History</p>

            {/* Entity filter tabs — dashboard mode only */}
            {!isScoped && activeEntities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button onClick={() => setHistoryFilter('all')}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
                  style={{ background: historyFilter === 'all' ? c.accent : c.card, color: historyFilter === 'all' ? 'white' : c.text3, border: `0.5px solid ${historyFilter === 'all' ? c.accent : c.border}` }}>
                  All
                </button>
                {activeEntities.map(entity => (
                  <button key={entity.id} onClick={() => setHistoryFilter(historyFilter === entity.id ? 'all' : entity.id)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
                    style={{ background: historyFilter === entity.id ? c.accent : c.card, color: historyFilter === entity.id ? 'white' : c.text3, border: `0.5px solid ${historyFilter === entity.id ? c.accent : c.border}` }}>
                    {entity.name}
                  </button>
                ))}
                <button onClick={() => setHistoryFilter(historyFilter === 'personal' ? 'all' : 'personal')}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
                  style={{ background: historyFilter === 'personal' ? c.accent : c.card, color: historyFilter === 'personal' ? 'white' : c.text3, border: `0.5px solid ${historyFilter === 'personal' ? c.accent : c.border}` }}>
                  Personal
                </button>
              </div>
            )}

            {history.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                <p className="text-sm" style={{ color: c.text3 }}>No entries yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((group, gi) => (
                  <div key={gi}>
                    <p className="text-[11px] font-medium mb-1.5" style={{ color: c.text3 }}>{dayLabel(group.date)}</p>
                    <div className="space-y-1">
                      {group.entries.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: c.card }}>
                          <div className="flex items-center gap-2">
                            {entry.subCategory && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                                style={{ background: `${config.color}15`, color: config.color }}>
                                {entry.subCategory}
                              </span>
                            )}
                            {!isScoped && entry.entityId && (
                              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: c.accentLight, color: c.accent }}>
                                {activeEntities.find(e => e.id === entry.entityId)?.name || 'Unknown'}
                              </span>
                            )}
                            {!isScoped && !entry.entityId && (
                              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: c.border, color: c.text3 }}>
                                Personal
                              </span>
                            )}
                            <span className="text-[11px]" style={{ color: c.text3 }}>{fmtTime(entry.date)}</span>
                          </div>
                          <span className="text-sm font-medium" style={{ color: c.text1 }}>{fmt(entry.amountMinor / 100)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <LayoutBottomNav />
    </div>
  );
};

export default CategoryPage;
