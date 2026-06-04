import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { GCard, GCardContent, GButton, BottomSheet } from '../components/ui';
import { pageTransition } from '../lib/animations';
import { makeFmt } from '../utils/format';
import { getSchedules, createRecurringSchedule, getScheduleSlots, paySlot, applyAdvance } from '../api';

/**
 * Phase 3 — server-side recurring payments (RecurringSchedule + PaymentSlot).
 * Behind ENABLE_RECURRING_UI. Wired to /api/recurring. Replaces the legacy
 * localStorage scheduledPayments view when enabled.
 */

const CATEGORIES = [
  { id: 'rent', label: '🏠 Rent' },
  { id: 'school_tuition', label: '🏫 School fee' },
  { id: 'coaching_monthly', label: '🎒 Coaching' },
  { id: 'other', label: '📦 Other' },
];
const CADENCES = [
  { id: 'MONTHLY', label: 'Monthly' },
  { id: 'QUARTERLY', label: 'Quarterly' },
  { id: 'YEARLY', label: 'Yearly' },
];
const SLOT_STATUS = {
  PENDING: { label: 'Pending', cls: 'bg-amber-500/18 text-amber-400' },
  PAID: { label: 'Paid', cls: 'bg-emerald-500/18 text-emerald-400' },
  PAID_ADVANCE: { label: 'Advance', cls: 'bg-sky-500/18 text-sky-400' },
  SKIPPED: { label: 'Skipped', cls: 'bg-surface-500/18 text-surface-400' },
  VOID: { label: 'Void', cls: 'bg-surface-500/18 text-surface-400' },
};
const fmtPeriod = (p) => {
  const [y, m] = String(p).split('-');
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

export function RecurringV2() {
  const { user, theme, addToast } = useApp();
  const d = theme === 'dark';
  const userId = user?.id;
  const fmt = makeFmt(user?.profile?.currency || 'BDT');
  const m = (minor) => fmt((Number(minor) || 0) / 100);

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [expanded, setExpanded] = useState(null);
  const [slots, setSlots] = useState({}); // scheduleId → slots[]
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: '', category: 'rent', amount: '', dueDay: 1, cadence: 'MONTHLY' });

  useEffect(() => { document.title = 'Schedule — ClassCost'; }, []);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    getSchedules(userId)
      .then((rows) => { if (alive) { setSchedules(rows || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  const openSchedule = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!slots[id]) {
      try {
        const rows = await getScheduleSlots(userId, id);
        setSlots((s) => ({ ...s, [id]: rows || [] }));
      } catch { /* leave empty */ }
    }
  };

  const submit = async () => {
    const amountMinor = Math.round((Number(form.amount) || 0) * 100);
    if (!form.label.trim() || amountMinor <= 0 || !userId) {
      addToast?.('Enter a name and amount', 'error');
      return;
    }
    setSaving(true);
    try {
      const { schedule } = await createRecurringSchedule(userId, {
        label: form.label.trim(),
        category: form.category,
        amountMinor,
        dueDay: Number(form.dueDay) || 1,
        cadence: form.cadence,
        startDate: new Date().toISOString(),
      });
      setSchedules((s) => [schedule, ...s]);
      setAddOpen(false);
      setForm({ label: '', category: 'rent', amount: '', dueDay: 1, cadence: 'MONTHLY' });
      addToast?.(`${schedule.label} scheduled`, 'success');
    } catch (e) {
      addToast?.(e.message || 'Could not create schedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (scheduleId, slot) => {
    try {
      const updated = await paySlot(userId, slot.id);
      setSlots((s) => ({ ...s, [scheduleId]: (s[scheduleId] || []).map((x) => (x.id === slot.id ? updated : x)) }));
    } catch (e) {
      addToast?.(e.message || 'Failed', 'error');
    }
  };

  const payAdvance = async (schedule) => {
    const monthsStr = prompt('How many months to pay in advance?', '3');
    const months = parseInt(monthsStr, 10);
    if (!months || months < 1) return;
    const amountMinor = (schedule.amountMinor || 0) * months;
    try {
      await applyAdvance(userId, schedule.id, { amountMinor, monthsCovered: months });
      setSlots((s) => { const c = { ...s }; delete c[schedule.id]; return c; }); // force refetch
      if (expanded === schedule.id) { setExpanded(null); setTimeout(() => openSchedule(schedule.id), 0); }
      addToast?.(`${months} months paid in advance`, 'success');
    } catch (e) {
      addToast?.(e.message || 'Advance failed', 'error');
    }
  };

  const label = (txt) => `text-sm ${d ? 'text-surface-400' : 'text-surface-500'}`;

  return (
    <motion.div {...pageTransition} className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-surface-900'}`} style={{ fontFamily: "'Fraunces',serif" }}>Schedule</h2>
          <p className={label()}>Recurring payments — auto-tracked</p>
        </div>
        <GButton onClick={() => setAddOpen(true)}>+ Add</GButton>
      </div>

      {loading ? (
        <p className={label()}>Loading…</p>
      ) : schedules.length === 0 ? (
        <GCard><GCardContent className="py-8 text-center">
          <div className="text-3xl mb-2">📆</div>
          <p className={`text-sm ${d ? 'text-surface-400' : 'text-surface-500'}`}>No recurring payments yet.</p>
          <p className={`text-xs mt-1 ${d ? 'text-surface-500' : 'text-surface-400'}`}>Add rent, school fee, or coaching — we'll generate the monthly schedule and reminders.</p>
        </GCardContent></GCard>
      ) : (
        schedules.map((sc) => {
          const isOpen = expanded === sc.id;
          const list = slots[sc.id] || [];
          const cat = CATEGORIES.find((c) => c.id === sc.category)?.label || sc.category;
          return (
            <GCard key={sc.id}>
              <GCardContent>
                <button onClick={() => openSchedule(sc.id)} className="w-full flex items-center justify-between">
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{sc.label}</p>
                    <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>{cat} · {m(sc.amountMinor)} / {sc.cadence.toLowerCase()} · due {sc.dueDay}</p>
                  </div>
                  <span className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="mt-3 flex flex-col gap-2">
                    {list.length === 0 ? (
                      <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>No slots yet.</p>
                    ) : list.map((slot) => {
                      const st = SLOT_STATUS[slot.status] || SLOT_STATUS.PENDING;
                      return (
                        <div key={slot.id} className={`flex items-center gap-2 rounded-xl border ${d ? 'border-surface-800' : 'border-surface-200'} px-3 py-2`}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${d ? 'text-white' : 'text-surface-900'}`}>{fmtPeriod(slot.period)}</p>
                            <p className={`text-[10px] ${d ? 'text-surface-500' : 'text-surface-400'}`}>{m(slot.expectedMinor)}</p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                          {slot.status === 'PENDING' && (
                            <button onClick={() => markPaid(sc.id, slot)}
                              className="text-[11px] font-semibold text-primary-400 hover:text-primary-300 px-2 py-1">Mark paid</button>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={() => payAdvance(sc)} className="text-[11px] text-primary-400 hover:text-primary-300 self-start mt-1">Pay several months in advance →</button>
                  </div>
                )}
              </GCardContent>
            </GCard>
          );
        })
      )}

      {/* Add schedule sheet */}
      <BottomSheet isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add recurring payment">
        <div className="flex flex-col gap-4 pb-2">
          <div>
            <label className={`text-xs font-semibold ${d ? 'text-surface-400' : 'text-surface-500'}`}>Name</label>
            <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Banani flat rent"
              className={`mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none border ${d ? 'bg-surface-900 border-surface-700 text-white' : 'bg-white border-surface-200 text-surface-900'}`} />
          </div>
          <div>
            <label className={`text-xs font-semibold ${d ? 'text-surface-400' : 'text-surface-500'}`}>Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => setForm((f) => ({ ...f, category: c.id }))}
                  className={`py-2 rounded-xl text-xs font-medium border ${form.category === c.id ? 'border-primary-500 bg-primary-500/10 text-primary-300' : (d ? 'border-surface-700 text-surface-300' : 'border-surface-200 text-surface-600')}`}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${d ? 'text-surface-400' : 'text-surface-500'}`}>Amount (৳)</label>
              <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="15000"
                className={`mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none border ${d ? 'bg-surface-900 border-surface-700 text-white' : 'bg-white border-surface-200 text-surface-900'}`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${d ? 'text-surface-400' : 'text-surface-500'}`}>Due day (1–28)</label>
              <input type="number" min="1" max="28" value={form.dueDay} onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
                className={`mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none border ${d ? 'bg-surface-900 border-surface-700 text-white' : 'bg-white border-surface-200 text-surface-900'}`} />
            </div>
          </div>
          <div>
            <label className={`text-xs font-semibold ${d ? 'text-surface-400' : 'text-surface-500'}`}>Frequency</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {CADENCES.map((c) => (
                <button key={c.id} onClick={() => setForm((f) => ({ ...f, cadence: c.id }))}
                  className={`py-2 rounded-xl text-xs font-medium border ${form.cadence === c.id ? 'border-primary-500 bg-primary-500/10 text-primary-300' : (d ? 'border-surface-700 text-surface-300' : 'border-surface-200 text-surface-600')}`}>{c.label}</button>
              ))}
            </div>
          </div>
          <GButton onClick={submit} disabled={saving}>{saving ? 'Adding…' : 'Create schedule'}</GButton>
        </div>
      </BottomSheet>
    </motion.div>
  );
}

export default RecurringV2;
