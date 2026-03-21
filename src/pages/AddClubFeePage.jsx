import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { getThemeColors } from '../lib/themeColors';
import { haptics } from '../lib/haptics';
import { makeFmt } from '../utils/format';

const FEE_TYPES = [
  { id: 'coaching_monthly', label: 'Monthly Fee' },
  { id: 'registration_fee', label: 'Registration Fee' },
  { id: 'admission_fee', label: 'Event Fee' },
  { id: 'other', label: 'Other' },
];

export const AddClubFeePage = () => {
  const { goBack, addToast, routeParams, user, theme = 'dark' } = useApp();
  const { recordPayment } = useV3();
  const c = getThemeColors(theme === 'dark');
  const fmt = makeFmt(user?.profile?.currency || 'BDT');
  const { entityId, entityName } = routeParams || {};

  const [feeType, setFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const num = Number(amount);
    if (!feeType) { addToast('Select a fee type', 'error'); return; }
    if (!num || num <= 0) { addToast('Enter a valid amount', 'error'); return; }
    setSaving(true);
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
      goBack();
    } catch (err) {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: c.bg }}>
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 backdrop-blur-xl"
        style={{ background: c.headerBg, borderBottom: `0.5px solid ${c.border}` }}>
        <button onClick={() => { haptics.light(); goBack(); }}>
          <ArrowLeft size={20} style={{ color: c.text2 }} />
        </button>
        <div>
          <p className="text-[15px] font-medium" style={{ color: c.text1 }}>Add fee</p>
          <p className="text-[11px]" style={{ color: c.text3 }}>{entityName || 'Club'}</p>
        </div>
      </header>

      <div className="max-w-[420px] mx-auto px-4 pt-6 space-y-5">
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: c.text2 }}>Fee type</p>
          <div className="flex flex-wrap gap-2">
            {FEE_TYPES.map(ft => (
              <button key={ft.id} onClick={() => { haptics.light(); setFeeType(ft.id); }}
                className="px-4 py-2.5 rounded-xl text-xs font-medium"
                style={{
                  background: feeType === ft.id ? c.accent : c.card,
                  color: feeType === ft.id ? 'white' : c.text2,
                  border: `0.5px solid ${feeType === ft.id ? c.accent : c.border}`,
                }}>
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium mb-2" style={{ color: c.text2 }}>Amount</p>
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

        <div>
          <p className="text-xs font-medium mb-2" style={{ color: c.text2 }}>Note (optional)</p>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g., March monthly fee" maxLength={80}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: c.card, border: `0.5px solid ${c.border}`, color: c.text1 }} />
        </div>

        <button onClick={handleSave} disabled={saving || !feeType || !amount}
          className="w-full py-3.5 rounded-xl text-sm font-medium text-white"
          style={{ background: saving || !feeType || !amount ? c.text3 : c.accent }}>
          {saving ? 'Saving...' : 'Record fee'}
        </button>
      </div>
    </div>
  );
};

export default AddClubFeePage;
