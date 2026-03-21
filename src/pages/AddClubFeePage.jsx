import React, { useState, useMemo, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { getThemeColors } from '../lib/themeColors';
import { haptics } from '../lib/haptics';
import { makeFmt } from '../utils/format';
import { LayoutBottomNav } from '../components/layout/LayoutBottomNav';

const FEE_TYPES = [
  { id: 'coaching_monthly', label: 'Monthly fee', icon: '💰' },
  { id: 'registration_fee', label: 'Registration', icon: '📋' },
  { id: 'admission_fee', label: 'Event fee', icon: '🎪' },
  { id: 'uniform', label: 'Kit / Jersey', icon: '👕' },
];

const FEE_CATS = FEE_TYPES.map(f => f.id);

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

export const AddClubFeePage = () => {
  const { goBack, addToast, routeParams, user, theme = 'dark' } = useApp();
  const { allEntries, recordPayment } = useV3();
  const c = getThemeColors(theme === 'dark');
  const fmt = makeFmt(user?.profile?.currency || 'BDT');
  const { entityId, entityName } = routeParams || {};

  const [feeType, setFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const feeEntries = useMemo(() => {
    return (allEntries || [])
      .filter(e => e.entityId === entityId && e.direction === 'DEBIT' && FEE_CATS.includes(e.category))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allEntries, entityId]);

  const totalPaid = useMemo(() => feeEntries.reduce((s, e) => s + e.amountMinor, 0), [feeEntries]);
  const thisYear = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    return feeEntries.filter(e => new Date(e.date) >= yearStart).reduce((s, e) => s + e.amountMinor, 0);
  }, [feeEntries]);

  const history = useMemo(() => {
    const groups = {};
    for (const e of feeEntries) {
      const key = new Date(e.date).toDateString();
      if (!groups[key]) groups[key] = { date: e.date, entries: [] };
      groups[key].entries.push(e);
    }
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
  }, [feeEntries]);

  const handleSave = useCallback(async () => {
    const num = Number(amount);
    if (!feeType) { addToast('Select a fee type', 'error'); return; }
    if (!num || num <= 0) { addToast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    haptics.medium();
    try {
      await recordPayment({
        type: 'PAYMENT',
        direction: 'DEBIT',
        category: feeType,
        amountMinor: Math.round(num * 100),
        date: new Date().toISOString(),
        note: note || FEE_TYPES.find(f => f.id === feeType)?.label || '',
        entityId: entityId || null,
      });
      haptics.success();
      addToast('Fee recorded', 'success');
      setAmount('');
      setNote('');
      setFeeType('');
    } catch (err) {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }, [amount, note, feeType, entityId, recordPayment, addToast]);

  return (
    <div className="min-h-screen pb-24" style={{ background: c.bg }}>
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 backdrop-blur-xl"
        style={{ background: c.headerBg, borderBottom: `0.5px solid ${c.border}` }}>
        <button onClick={() => { haptics.light(); goBack(); }}>
          <ArrowLeft size={20} style={{ color: c.text2 }} />
        </button>
        <div>
          <p className="text-[15px] font-medium" style={{ color: c.text1 }}>{entityName || 'Club'} Fees</p>
          <p className="text-[11px]" style={{ color: c.text3 }}>Record club payments</p>
        </div>
      </header>

      <div className="max-w-[420px] mx-auto px-4 pt-4 space-y-4">
        {/* Stats */}
        <div className="flex gap-2">
          {[
            { label: 'Total paid', value: totalPaid },
            { label: 'This year', value: thisYear },
            { label: 'Payments', value: feeEntries.length, raw: true },
          ].map(s => (
            <div key={s.label} className="flex-1 rounded-xl p-3 text-center"
              style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
              <p className="text-[10px]" style={{ color: c.text3 }}>{s.label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: c.text1 }}>
                {s.raw ? s.value : fmt(s.value / 100)}
              </p>
            </div>
          ))}
        </div>

        {/* Fee type grid */}
        <div>
          <p className="text-[10px] font-medium mb-2 uppercase tracking-wide" style={{ color: c.text3 }}>Fee type</p>
          <div className="grid grid-cols-2 gap-2">
            {FEE_TYPES.map(ft => (
              <button key={ft.id} onClick={() => { haptics.light(); setFeeType(ft.id); }}
                className="rounded-xl p-3 text-center"
                style={{
                  background: feeType === ft.id ? 'rgba(99,102,241,0.08)' : c.card,
                  border: `0.5px solid ${feeType === ft.id ? c.accent : c.border}`,
                }}>
                <span className="text-xl block mb-1">{ft.icon}</span>
                <span className="text-[11px] font-medium"
                  style={{ color: feeType === ft.id ? c.accent : c.text2 }}>{ft.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <p className="text-[10px] font-medium mb-2 uppercase tracking-wide" style={{ color: c.text3 }}>Amount</p>
          <div className="flex items-center rounded-xl overflow-hidden"
            style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
            <span className="pl-3 text-lg" style={{ color: c.text3 }}>৳</span>
            <input type="text" inputMode="decimal" value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0" autoFocus
              className="flex-1 px-2 py-3 text-2xl font-semibold bg-transparent outline-none"
              style={{ color: c.text1 }} />
          </div>
        </div>

        {/* Note */}
        <div>
          <p className="text-[10px] font-medium mb-2 uppercase tracking-wide" style={{ color: c.text3 }}>Note</p>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g., March monthly fee" maxLength={80}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: c.card, border: `0.5px solid ${c.border}`, color: c.text1 }} />
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving || !feeType || !amount}
          className="w-full py-3.5 rounded-xl text-sm font-medium text-white"
          style={{ background: saving || !feeType || !amount ? c.text3 : c.accent }}>
          {saving ? 'Saving...' : 'Save fee'}
        </button>

        {/* History */}
        <div>
          <p className="text-[10px] font-medium mb-2 uppercase tracking-wide" style={{ color: c.text3 }}>History</p>
          {history.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
              <p className="text-sm" style={{ color: c.text3 }}>No fees recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((group, gi) => (
                <div key={gi}>
                  <p className="text-[11px] font-medium mb-1.5" style={{ color: c.text3 }}>{dayLabel(group.date)}</p>
                  <div className="space-y-1">
                    {group.entries.map(entry => {
                      const ft = FEE_TYPES.find(f => f.id === entry.category);
                      return (
                        <div key={entry.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: c.card }}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{ft?.icon || '📦'}</span>
                            <div>
                              <p className="text-[12px]" style={{ color: c.text1 }}>{entry.note || ft?.label || entry.category}</p>
                              <p className="text-[10px]" style={{ color: c.text3 }}>{fmtTime(entry.date)}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium" style={{ color: c.text1 }}>{fmt(entry.amountMinor / 100)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LayoutBottomNav />
    </div>
  );
};

export default AddClubFeePage;
