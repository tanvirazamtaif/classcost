import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { haptics } from '../lib/haptics';
import { makeFmt } from '../utils/format';

const BG = '#0a0a14';
const CARD = '#12121a';
const BORDER = '#1e1e2e';
const ACCENT = '#6366f1';
const TEXT1 = '#f4f4f5';
const TEXT2 = '#71717a';
const TEXT3 = '#52525b';
const AMBER = '#f59e0b';

const METHODS = [
  { id: 'bkash', label: 'bKash' },
  { id: 'bank', label: 'Bank' },
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
];

function fmtShortDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const RecordPaymentPage = () => {
  const { goBack, navigate, addToast, routeParams, user } = useApp();
  const { recordPayment, upcomingObligations } = useV3();
  const fmt = makeFmt(user?.profile?.currency || 'BDT');

  const { obligationId, trackerId } = routeParams || {};

  const obligation = upcomingObligations?.find(o => o.id === obligationId);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('bkash');
  const [receipt, setReceipt] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (obligation) {
      const remaining = obligation.amountRemaining ?? obligation.amountMinor;
      setAmount(String(remaining / 100));
    }
  }, [obligation]);

  const daysOverdue = obligation?.dueDate
    ? Math.max(0, Math.floor((Date.now() - new Date(obligation.dueDate).getTime()) / 86400000))
    : 0;

  async function handleConfirm() {
    const num = Number(amount);
    if (!num || num <= 0) { addToast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    haptics.medium();
    try {
      await recordPayment({
        type: 'PAYMENT',
        direction: 'DEBIT',
        category: obligation?.category || 'semester_fee',
        amountMinor: Math.round(num * 100),
        date: new Date(date).toISOString(),
        trackerId: trackerId || obligation?.trackerId || null,
        obligationId: obligationId || null,
        note: note || `Payment for ${obligation?.label || 'installment'}`,
        meta: { method, receiptNumber: receipt || null },
      });
      haptics.success();
      addToast('Payment recorded!', 'success');
      goBack();
    } catch (err) {
      console.error('Record payment error:', err);
      addToast('Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: BG }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 backdrop-blur-xl"
        style={{ background: 'rgba(10,10,20,0.9)', borderBottom: `0.5px solid ${BORDER}` }}>
        <button onClick={() => { haptics.light(); goBack(); }} className="p-1">
          <ArrowLeft size={20} color={TEXT2} />
        </button>
        <div>
          <p className="text-[15px] font-medium" style={{ color: TEXT1 }}>
            Pay {obligation?.label || 'installment'}
          </p>
          <p className="text-[11px]" style={{ color: TEXT3 }}>
            {obligation?.entity?.name || 'Semester payment'}
          </p>
        </div>
      </header>

      <div className="max-w-[420px] mx-auto px-4 pt-4 space-y-5">
        {/* Info card */}
        {obligation && (
          <div className="rounded-xl p-4" style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px]" style={{ color: TEXT3 }}>Amount due</p>
                <p className="text-xl font-bold" style={{ color: AMBER }}>
                  {fmt((obligation.amountRemaining ?? obligation.amountMinor) / 100)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px]" style={{ color: TEXT3 }}>Due date</p>
                <p className="text-sm" style={{ color: TEXT1 }}>{fmtShortDate(obligation.dueDate)}</p>
                {daysOverdue > 0 && (
                  <p className="text-[11px] mt-0.5" style={{ color: AMBER }}>{daysOverdue} days overdue</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: TEXT2 }}>Payment amount</label>
          <div className="flex items-center rounded-xl overflow-hidden" style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
            <span className="pl-3 text-lg" style={{ color: TEXT3 }}>৳</span>
            <input type="text" inputMode="decimal" value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              className="flex-1 px-2 py-3 text-2xl font-semibold bg-transparent outline-none"
              style={{ color: TEXT1 }} />
          </div>
          <p className="text-[11px] mt-1" style={{ color: TEXT3 }}>Auto-filled from obligation. Change if paying partial.</p>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: TEXT2 }}>Payment date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: CARD, border: `0.5px solid ${BORDER}`, color: TEXT1, colorScheme: 'dark' }} />
        </div>

        {/* Method */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: TEXT2 }}>Payment method</label>
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map(m => (
              <button key={m.id} onClick={() => { haptics.light(); setMethod(m.id); }}
                className="py-2.5 rounded-xl text-[12px] font-medium"
                style={{
                  background: method === m.id ? ACCENT : CARD,
                  color: method === m.id ? 'white' : TEXT3,
                  border: `0.5px solid ${method === m.id ? ACCENT : BORDER}`,
                }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Receipt */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: TEXT2 }}>Receipt number</label>
          <input type="text" value={receipt} onChange={e => setReceipt(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: CARD, border: `0.5px solid ${BORDER}`, color: TEXT1 }} />
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: TEXT2 }}>Note</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Optional" maxLength={100}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: CARD, border: `0.5px solid ${BORDER}`, color: TEXT1 }} />
        </div>

        {/* Confirm */}
        <button onClick={handleConfirm} disabled={saving || !amount || Number(amount) <= 0}
          className="w-full py-3.5 rounded-xl text-sm font-medium text-white"
          style={{ background: saving ? TEXT3 : ACCENT }}>
          {saving ? 'Recording...' : `Confirm ${fmt(Number(amount) || 0)} payment`}
        </button>
        <p className="text-[11px] text-center" style={{ color: TEXT3 }}>
          This will update your outstanding balance.
        </p>
      </div>
    </div>
  );
};

export default RecordPaymentPage;
