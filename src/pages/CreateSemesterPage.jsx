import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { haptics } from '../lib/haptics';
import { makeFmt } from '../utils/format';
import * as api from '../api';

const BG = '#0a0a14';
const CARD = '#12121a';
const BORDER = '#1e1e2e';
const ACCENT = '#6366f1';
const TEXT1 = '#f4f4f5';
const TEXT2 = '#71717a';
const TEXT3 = '#52525b';
const GREEN = '#22c55e';

const FEE_MODES = [
  { id: 'quick', label: 'Quick total' },
  { id: 'credit', label: 'Per credit' },
  { id: 'detailed', label: 'Detailed' },
];

const FEE_CATEGORIES = [
  'tuition', 'lab', 'exam', 'library', 'development', 'registration',
  'deposit', 'fine', 'retake', 'thesis', 'hostel', 'transport', 'activity', 'medical', 'custom',
];

const BILLING_BASES = ['per_credit', 'fixed', 'yearly', 'one_time'];

const INSTALLMENT_OPTIONS = [
  { count: 1, label: 'Full' },
  { count: 2, label: '2 parts' },
  { count: 3, label: '3 parts' },
  { count: 4, label: '4 parts' },
];

function Input({ label, value, onChange, placeholder, type = 'text', prefix, small, ...props }) {
  return (
    <div className={small ? '' : 'mb-3'}>
      {label && <label className="text-xs font-medium mb-1 block" style={{ color: TEXT2 }}>{label}</label>}
      <div className="flex items-center rounded-xl overflow-hidden" style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
        {prefix && <span className="pl-3 text-sm" style={{ color: TEXT3 }}>{prefix}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none"
          style={{ color: TEXT1 }} {...props} />
      </div>
    </div>
  );
}

export const CreateSemesterPage = () => {
  const { goBack, navigate, addToast, routeParams, user } = useApp();
  const { entityId, entityName } = routeParams || {};
  const fmt = makeFmt(user?.profile?.currency || 'BDT');

  // Basic info
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fee mode
  const [feeMode, setFeeMode] = useState('quick');

  // Quick total
  const [quickAmount, setQuickAmount] = useState('');

  // Per credit
  const [credits, setCredits] = useState('');
  const [ratePerCredit, setRatePerCredit] = useState('');
  const [labCredits, setLabCredits] = useState('');
  const [labRate, setLabRate] = useState('');
  const [otherFees, setOtherFees] = useState([]);

  // Detailed
  const [detailedFees, setDetailedFees] = useState([]);
  const [showAddFee, setShowAddFee] = useState(false);
  const [newFee, setNewFee] = useState({ label: '', feeCategory: 'tuition', billingBasis: 'fixed', amount: '' });

  // Waivers
  const [waivers, setWaivers] = useState([]);
  const [showAddWaiver, setShowAddWaiver] = useState(false);
  const [newWaiver, setNewWaiver] = useState({ label: '', waiverType: 'percentage', percentage: '', amount: '', appliesTo: 'total', feeCategory: '', reason: '' });

  // Installments
  const [installmentCount, setInstallmentCount] = useState(3);

  const [creating, setCreating] = useState(false);

  // Compile fee items from current mode
  const compiledFeeItems = useMemo(() => {
    if (feeMode === 'quick') {
      const amt = Math.round(Number(quickAmount) * 100);
      if (amt <= 0) return [];
      return [{ label: 'Total', feeCategory: 'tuition', billingBasis: 'fixed', amountMinor: amt }];
    }

    if (feeMode === 'credit') {
      const items = [];
      const c = Number(credits) || 0;
      const r = Math.round((Number(ratePerCredit) || 0) * 100);
      if (c > 0 && r > 0) {
        items.push({ label: 'Tuition', feeCategory: 'tuition', billingBasis: 'per_credit', amountMinor: c * r, creditCount: c, ratePerCredit: r, creditType: 'standard' });
      }
      const lc = Number(labCredits) || 0;
      const lr = Math.round((Number(labRate) || 0) * 100);
      if (lc > 0 && lr > 0) {
        items.push({ label: 'Lab credits', feeCategory: 'lab', billingBasis: 'per_credit', amountMinor: lc * lr, creditCount: lc, ratePerCredit: lr, creditType: 'lab' });
      }
      for (const of2 of otherFees) {
        const amt = Math.round(Number(of2.amount) * 100);
        if (of2.label && amt > 0) {
          items.push({ label: of2.label, feeCategory: of2.feeCategory || 'custom', billingBasis: of2.billingBasis || 'fixed', amountMinor: amt });
        }
      }
      return items;
    }

    // detailed
    return detailedFees.filter(f => f.label && f.amountMinor > 0);
  }, [feeMode, quickAmount, credits, ratePerCredit, labCredits, labRate, otherFees, detailedFees]);

  const grossMinor = useMemo(() => compiledFeeItems.reduce((s, f) => s + f.amountMinor, 0), [compiledFeeItems]);

  // Client-side waiver estimate
  const waiverMinor = useMemo(() => {
    let total = 0;
    for (const w of waivers) {
      if (w.waiverType === 'percentage') {
        const base = w.appliesTo === 'total' ? grossMinor
          : compiledFeeItems.filter(f => f.feeCategory === w.feeCategory).reduce((s, f) => s + f.amountMinor, 0);
        total += Math.floor(base * (Number(w.percentage) || 0) / 100);
      } else {
        total += Math.round((Number(w.amount) || 0) * 100);
      }
    }
    return Math.min(total, grossMinor);
  }, [waivers, grossMinor, compiledFeeItems]);

  const netMinor = Math.max(0, grossMinor - waiverMinor);

  // Installment preview
  const installments = useMemo(() => {
    if (netMinor <= 0) return [];
    const per = Math.floor(netMinor / installmentCount);
    const rem = netMinor - per * installmentCount;
    return Array.from({ length: installmentCount }, (_, i) => ({
      amount: i === 0 ? per + rem : per,
      seq: i + 1,
    }));
  }, [netMinor, installmentCount]);

  function addOtherFee() {
    setOtherFees(prev => [...prev, { label: '', amount: '', feeCategory: 'custom', billingBasis: 'fixed' }]);
  }

  function addDetailedFee() {
    if (!newFee.label || !newFee.amount) return;
    setDetailedFees(prev => [...prev, {
      label: newFee.label,
      feeCategory: newFee.feeCategory,
      billingBasis: newFee.billingBasis,
      amountMinor: Math.round(Number(newFee.amount) * 100),
    }]);
    setNewFee({ label: '', feeCategory: 'tuition', billingBasis: 'fixed', amount: '' });
    setShowAddFee(false);
  }

  function addWaiverItem() {
    if (!newWaiver.label) return;
    setWaivers(prev => [...prev, { ...newWaiver }]);
    setNewWaiver({ label: '', waiverType: 'percentage', percentage: '', amount: '', appliesTo: 'total', feeCategory: '', reason: '' });
    setShowAddWaiver(false);
  }

  async function handleCreate() {
    if (!name || !startDate || compiledFeeItems.length === 0) {
      addToast('Fill in name, start date, and at least one fee', 'error');
      return;
    }
    setCreating(true);
    try {
      const data = {
        entityId,
        label: name,
        periodType: 'semester',
        startDate,
        endDate: endDate || null,
        obligationMode: 'pooled',
        installmentCount,
        feeItems: compiledFeeItems,
        waivers: waivers.map(w => ({
          label: w.label,
          waiverType: w.waiverType,
          amountMinor: w.waiverType === 'flat' ? Math.round(Number(w.amount) * 100) : null,
          percentage: w.waiverType === 'percentage' ? Number(w.percentage) : null,
          appliesTo: w.appliesTo,
          feeCategory: w.appliesTo === 'fee_category' ? w.feeCategory : null,
          reason: w.reason || null,
        })),
      };

      const result = await api.createSemesterV3(user.id, data);
      haptics.success();
      addToast('Semester created!', 'success');
      navigate('semester-detail', { params: { trackerId: result.tracker?.id } });
    } catch (err) {
      console.error('Create semester error:', err);
      addToast('Failed to create semester', 'error');
    } finally {
      setCreating(false);
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
          <p className="text-[15px] font-medium" style={{ color: TEXT1 }}>New semester</p>
          <p className="text-[11px]" style={{ color: TEXT3 }}>{entityName || 'Institution'}</p>
        </div>
      </header>

      <div className="max-w-[420px] mx-auto px-4 pt-4 space-y-5">

        {/* 1. Basic Info */}
        <section>
          <Input label="Semester name" value={name} onChange={setName} placeholder="Summer 2026" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start date" type="month" value={startDate} onChange={setStartDate} />
            <Input label="End date" type="month" value={endDate} onChange={setEndDate} />
          </div>
        </section>

        {/* 2. Fee Entry */}
        <section>
          <p className="text-xs font-medium mb-2" style={{ color: TEXT2 }}>Fees</p>
          <div className="flex rounded-xl p-[3px] mb-4" style={{ background: '#0f0f1a', border: `0.5px solid ${BORDER}` }}>
            {FEE_MODES.map(m => (
              <button key={m.id} onClick={() => { haptics.light(); setFeeMode(m.id); }}
                className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-all"
                style={{ background: feeMode === m.id ? ACCENT : 'transparent', color: feeMode === m.id ? 'white' : TEXT3 }}>
                {m.label}
              </button>
            ))}
          </div>

          {feeMode === 'quick' && (
            <div>
              <Input label="Total semester cost" value={quickAmount} onChange={setQuickAmount} prefix="৳" placeholder="85,000" inputMode="decimal" />
              <p className="text-[11px] mt-1" style={{ color: TEXT3 }}>You can add detailed breakdown anytime later.</p>
            </div>
          )}

          {feeMode === 'credit' && (
            <div>
              <div className="rounded-xl p-4 mb-3" style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Credits" value={credits} onChange={setCredits} placeholder="15" type="number" small />
                  <Input label="Rate/credit (৳)" value={ratePerCredit} onChange={setRatePerCredit} placeholder="5,500" inputMode="decimal" small />
                </div>
                {Number(credits) > 0 && Number(ratePerCredit) > 0 && (
                  <p className="text-xs mt-2" style={{ color: ACCENT }}>
                    Tuition: {fmt(Number(credits) * Number(ratePerCredit))}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setLabCredits(labCredits ? '' : '0')}
                    className="text-[11px] px-3 py-1.5 rounded-lg"
                    style={{ background: labCredits ? 'rgba(99,102,241,0.15)' : 'transparent', color: labCredits ? ACCENT : TEXT3, border: `0.5px solid ${BORDER}` }}>
                    + Lab credits
                  </button>
                </div>
                {labCredits !== '' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Input label="Lab credits" value={labCredits} onChange={setLabCredits} placeholder="3" type="number" small />
                    <Input label="Lab rate (৳)" value={labRate} onChange={setLabRate} placeholder="6,500" inputMode="decimal" small />
                  </div>
                )}
              </div>

              <p className="text-xs font-medium mb-2" style={{ color: TEXT2 }}>Other fees</p>
              {otherFees.map((of2, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_32px] gap-2 mb-2 items-end">
                  <Input value={of2.label} onChange={v => { const u = [...otherFees]; u[i].label = v; setOtherFees(u); }} placeholder="Fee name" small />
                  <Input value={of2.amount} onChange={v => { const u = [...otherFees]; u[i].amount = v; setOtherFees(u); }} prefix="৳" placeholder="0" inputMode="decimal" small />
                  <button onClick={() => setOtherFees(prev => prev.filter((_, j) => j !== i))} className="p-1.5 mb-0.5">
                    <X size={14} color={TEXT3} />
                  </button>
                </div>
              ))}
              <button onClick={addOtherFee} className="text-[11px] font-medium flex items-center gap-1 mt-1" style={{ color: ACCENT }}>
                <Plus size={12} /> Add fee
              </button>
            </div>
          )}

          {feeMode === 'detailed' && (
            <div>
              {detailedFees.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl p-3 mb-2"
                  style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
                  <div>
                    <p className="text-sm" style={{ color: TEXT1 }}>{f.label}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.1)', color: ACCENT }}>{f.billingBasis}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: TEXT1 }}>{fmt(f.amountMinor / 100)}</p>
                    <button onClick={() => setDetailedFees(prev => prev.filter((_, j) => j !== i))}>
                      <X size={14} color={TEXT3} />
                    </button>
                  </div>
                </div>
              ))}

              {showAddFee ? (
                <div className="rounded-xl p-3 mb-2 space-y-2" style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
                  <Input value={newFee.label} onChange={v => setNewFee(p => ({ ...p, label: v }))} placeholder="Fee name" small />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newFee.feeCategory} onChange={e => setNewFee(p => ({ ...p, feeCategory: e.target.value }))}
                      className="text-xs px-2 py-2 rounded-lg outline-none" style={{ background: BG, color: TEXT1, border: `0.5px solid ${BORDER}` }}>
                      {FEE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={newFee.billingBasis} onChange={e => setNewFee(p => ({ ...p, billingBasis: e.target.value }))}
                      className="text-xs px-2 py-2 rounded-lg outline-none" style={{ background: BG, color: TEXT1, border: `0.5px solid ${BORDER}` }}>
                      {BILLING_BASES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <Input value={newFee.amount} onChange={v => setNewFee(p => ({ ...p, amount: v }))} prefix="৳" placeholder="0" inputMode="decimal" small />
                  <div className="flex gap-2">
                    <button onClick={addDetailedFee} className="text-xs px-4 py-2 rounded-lg text-white" style={{ background: ACCENT }}>Add</button>
                    <button onClick={() => setShowAddFee(false)} className="text-xs px-4 py-2 rounded-lg" style={{ color: TEXT3 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddFee(true)}
                  className="w-full py-3 rounded-xl text-[12px] font-medium flex items-center justify-center gap-1"
                  style={{ border: `1.5px dashed #2a2a3a`, color: ACCENT }}>
                  <Plus size={14} /> Add fee
                </button>
              )}
            </div>
          )}

          {/* Running total */}
          {grossMinor > 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: '#0f0f1a', border: `0.5px solid ${BORDER}` }}>
              <p className="text-xs" style={{ color: TEXT2 }}>Gross total: <span style={{ color: TEXT1 }}>{fmt(grossMinor / 100)}</span></p>
            </div>
          )}
        </section>

        {/* 3. Waivers */}
        <section>
          <p className="text-xs font-medium mb-1" style={{ color: TEXT2 }}>Waivers & scholarships</p>
          <p className="text-[11px] mb-3" style={{ color: TEXT3 }}>Reduces what you owe. Add multiple if needed.</p>

          {waivers.map((w, i) => {
            let desc = '';
            if (w.waiverType === 'percentage') {
              const base = w.appliesTo === 'total' ? grossMinor
                : compiledFeeItems.filter(f => f.feeCategory === w.feeCategory).reduce((s, f) => s + f.amountMinor, 0);
              const reduction = Math.floor(base * (Number(w.percentage) || 0) / 100);
              desc = `${w.percentage}% on ${w.appliesTo === 'total' ? 'total' : w.feeCategory} = -${fmt(reduction / 100)}`;
            } else {
              desc = `Flat -${fmt(Number(w.amount) || 0)}`;
            }
            return (
              <div key={i} className="flex items-center justify-between rounded-xl p-3 mb-2"
                style={{ background: 'rgba(34,197,94,0.05)', border: `0.5px solid rgba(34,197,94,0.15)` }}>
                <div>
                  <p className="text-sm" style={{ color: TEXT1 }}>{w.label}</p>
                  <p className="text-[11px]" style={{ color: GREEN }}>{desc}</p>
                </div>
                <button onClick={() => setWaivers(prev => prev.filter((_, j) => j !== i))}>
                  <X size={14} color={TEXT3} />
                </button>
              </div>
            );
          })}

          {showAddWaiver ? (
            <div className="rounded-xl p-3 mb-2 space-y-2" style={{ background: CARD, border: `0.5px solid rgba(34,197,94,0.2)` }}>
              <Input value={newWaiver.label} onChange={v => setNewWaiver(p => ({ ...p, label: v }))} placeholder="Merit scholarship" small />
              <div className="flex gap-2">
                {['percentage', 'flat'].map(t => (
                  <button key={t} onClick={() => setNewWaiver(p => ({ ...p, waiverType: t }))}
                    className="text-[11px] px-3 py-1.5 rounded-lg"
                    style={{ background: newWaiver.waiverType === t ? ACCENT : 'transparent', color: newWaiver.waiverType === t ? 'white' : TEXT3, border: `0.5px solid ${BORDER}` }}>
                    {t === 'percentage' ? 'Percentage' : 'Flat amount'}
                  </button>
                ))}
              </div>
              {newWaiver.waiverType === 'percentage' ? (
                <Input value={newWaiver.percentage} onChange={v => setNewWaiver(p => ({ ...p, percentage: v }))} placeholder="20" type="number" prefix="%" small />
              ) : (
                <Input value={newWaiver.amount} onChange={v => setNewWaiver(p => ({ ...p, amount: v }))} prefix="৳" placeholder="10,000" inputMode="decimal" small />
              )}
              <div className="flex gap-2 flex-wrap">
                {['total', 'fee_category'].map(s => (
                  <button key={s} onClick={() => setNewWaiver(p => ({ ...p, appliesTo: s }))}
                    className="text-[11px] px-3 py-1.5 rounded-lg"
                    style={{ background: newWaiver.appliesTo === s ? ACCENT : 'transparent', color: newWaiver.appliesTo === s ? 'white' : TEXT3, border: `0.5px solid ${BORDER}` }}>
                    {s === 'total' ? 'On total' : 'On category'}
                  </button>
                ))}
              </div>
              {newWaiver.appliesTo === 'fee_category' && (
                <select value={newWaiver.feeCategory} onChange={e => setNewWaiver(p => ({ ...p, feeCategory: e.target.value }))}
                  className="text-xs px-2 py-2 rounded-lg outline-none w-full" style={{ background: BG, color: TEXT1, border: `0.5px solid ${BORDER}` }}>
                  <option value="">Select category</option>
                  {FEE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <Input value={newWaiver.reason} onChange={v => setNewWaiver(p => ({ ...p, reason: v }))} placeholder="Reason (optional)" small />
              <div className="flex gap-2">
                <button onClick={addWaiverItem} className="text-xs px-4 py-2 rounded-lg text-white" style={{ background: GREEN }}>Add</button>
                <button onClick={() => setShowAddWaiver(false)} className="text-xs px-4 py-2 rounded-lg" style={{ color: TEXT3 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddWaiver(true)}
              className="w-full py-3 rounded-xl text-[12px] font-medium flex items-center justify-center gap-1"
              style={{ border: `1.5px dashed rgba(34,197,94,0.3)`, color: GREEN }}>
              <Plus size={14} /> Add waiver
            </button>
          )}

          {/* Summary strip */}
          {grossMinor > 0 && (
            <div className="mt-3 rounded-xl p-3 space-y-1" style={{ background: '#0f0f1a', border: `0.5px solid ${BORDER}` }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: TEXT3 }}>Gross</span>
                <span style={{ color: TEXT2 }}>{fmt(grossMinor / 100)}</span>
              </div>
              {waiverMinor > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: GREEN }}>Waivers</span>
                  <span style={{ color: GREEN }}>-{fmt(waiverMinor / 100)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-medium pt-1" style={{ borderTop: `0.5px solid ${BORDER}` }}>
                <span style={{ color: '#f59e0b' }}>You owe</span>
                <span style={{ color: '#f59e0b' }}>{fmt(netMinor / 100)}</span>
              </div>
            </div>
          )}
        </section>

        {/* 4. Payment Plan */}
        {netMinor > 0 && (
          <section>
            <p className="text-xs font-medium mb-1" style={{ color: TEXT2 }}>Payment plan</p>
            <p className="text-[11px] mb-3" style={{ color: TEXT3 }}>How will you pay {fmt(netMinor / 100)}?</p>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {INSTALLMENT_OPTIONS.map(opt => (
                <button key={opt.count} onClick={() => { haptics.light(); setInstallmentCount(opt.count); }}
                  className="py-2.5 rounded-xl text-[12px] font-medium transition-all"
                  style={{ background: installmentCount === opt.count ? ACCENT : CARD, color: installmentCount === opt.count ? 'white' : TEXT3, border: `0.5px solid ${installmentCount === opt.count ? ACCENT : BORDER}` }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {installments.map((inst, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl p-3"
                  style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: TEXT1 }}>
                      {installmentCount === 1 ? 'Full payment' : `Part ${inst.seq}`}
                    </p>
                    <p className="text-[11px]" style={{ color: TEXT3 }}>Due 15th of month {inst.seq}</p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: TEXT1 }}>{fmt(inst.amount / 100)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Create Button */}
        <button onClick={handleCreate} disabled={creating || !name || grossMinor <= 0}
          className="w-full py-3.5 rounded-xl text-sm font-medium text-white transition-all"
          style={{ background: creating || !name || grossMinor <= 0 ? TEXT3 : ACCENT }}>
          {creating ? 'Creating...' : `Create ${name || 'semester'}`}
        </button>
      </div>
    </div>
  );
};

export default CreateSemesterPage;
