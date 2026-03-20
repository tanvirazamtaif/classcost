import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Clock, AlertTriangle, Plus, MoreVertical } from 'lucide-react';
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
const AMBER = '#f59e0b';

const BILLING_COLORS = {
  per_credit: { bg: 'rgba(99,102,241,0.1)', color: ACCENT },
  fixed: { bg: 'rgba(113,113,122,0.1)', color: TEXT2 },
  yearly: { bg: 'rgba(234,179,8,0.1)', color: AMBER },
  one_time: { bg: 'rgba(113,113,122,0.1)', color: TEXT2 },
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShortDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysFromNow(d) {
  if (!d) return 0;
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
}

export const SemesterDetailPageV3 = () => {
  const { goBack, navigate, addToast, routeParams, user } = useApp();
  const { trackerId } = routeParams || {};
  const fmt = makeFmt(user?.profile?.currency || 'BDT');

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!trackerId) return;
    setLoading(true);
    try {
      const data = await api.getSemesterSummaryV3(trackerId);
      setSummary(data);
    } catch (err) {
      console.error('Load semester summary error:', err);
      addToast('Failed to load semester', 'error');
    } finally {
      setLoading(false);
    }
  }, [trackerId, addToast]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const obligations = useMemo(() => {
    if (!summary?.obligations) return [];
    return [...summary.obligations].sort((a, b) => (a.installmentSeq || 0) - (b.installmentSeq || 0));
  }, [summary]);

  const adjustments = useMemo(() => {
    if (!summary?.feeItems) return [];
    return summary.feeItems.filter(f => f.adjustmentType);
  }, [summary]);

  const scholarshipEntries = useMemo(() => {
    if (!summary?.ledgerEntries) return [];
    return summary.ledgerEntries.filter(e => e.type === 'SCHOLARSHIP_CASH');
  }, [summary]);

  const hasAdjustments = adjustments.length > 0 || scholarshipEntries.length > 0;

  const overdueObl = useMemo(() => obligations.find(o => o.status === 'OVERDUE'), [obligations]);

  const paidPct = useMemo(() => {
    if (!summary || summary.netMinor <= 0) return 0;
    return Math.min(100, Math.round((summary.paidMinor / summary.netMinor) * 100));
  }, [summary]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="animate-spin w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: BG }}>
        <p style={{ color: TEXT3 }}>Semester not found</p>
        <button onClick={() => goBack()} className="mt-4 px-4 py-2 rounded-xl text-sm text-white" style={{ background: ACCENT }}>Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG, paddingBottom: overdueObl ? 80 : 24 }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between backdrop-blur-xl"
        style={{ background: 'rgba(10,10,20,0.9)', borderBottom: `0.5px solid ${BORDER}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { haptics.light(); goBack(); }} className="p-1">
            <ArrowLeft size={20} color={TEXT2} />
          </button>
          <div>
            <p className="text-[15px] font-medium" style={{ color: TEXT1 }}>{summary.feeItems?.[0]?.chargedInPeriod || 'Semester'}</p>
            <p className="text-[11px]" style={{ color: TEXT3 }}>Semester detail</p>
          </div>
        </div>
        <button className="p-1"><MoreVertical size={18} color={TEXT3} /></button>
      </header>

      <div className="max-w-[420px] mx-auto px-4 pt-4 space-y-5">

        {/* 5-Stat Summary */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex gap-1.5 mb-2">
            {[
              { label: 'GROSS', value: summary.grossMinor, color: TEXT1 },
              { label: 'WAIVERS', value: summary.waiverMinor, color: GREEN },
              { label: 'NET', value: summary.netMinor, color: ACCENT },
              { label: 'PAID', value: summary.paidMinor, color: GREEN },
              { label: 'DUE', value: summary.outstandingMinor, color: AMBER },
            ].map(stat => (
              <div key={stat.label} className="flex-1 rounded-lg p-2 text-center" style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
                <p className="text-[9px] font-medium tracking-wider" style={{ color: TEXT3 }}>{stat.label}</p>
                <p className="text-[13px] font-bold mt-0.5" style={{ color: stat.color }}>{fmt(stat.value / 100)}</p>
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: BORDER }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${paidPct}%`, background: ACCENT }} />
          </div>
          <p className="text-[10px] text-right mt-1" style={{ color: TEXT3 }}>{paidPct}% paid</p>
        </motion.div>

        {/* Installments */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: TEXT2 }}>Installments</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: ACCENT }}>
              {obligations.length} part{obligations.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {obligations.map(obl => {
              const isPaid = obl.status === 'PAID';
              const isOverdue = obl.status === 'OVERDUE';
              const days = daysFromNow(obl.dueDate);
              const borderColor = isPaid ? GREEN : isOverdue ? AMBER : '#2a2a3a';

              return (
                <div key={obl.id} className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: CARD, borderLeft: `3px solid ${borderColor}`, opacity: isPaid ? 0.7 : 1 }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: isPaid ? 'rgba(34,197,94,0.1)' : isOverdue ? 'rgba(245,158,11,0.1)' : 'rgba(42,42,58,0.5)' }}>
                    {isPaid ? <Check size={14} color={GREEN} /> : isOverdue ? <AlertTriangle size={14} color={AMBER} /> : <Clock size={14} color={TEXT3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: TEXT1, textDecoration: isPaid ? 'line-through' : 'none' }}>
                      {obl.label || `Installment ${obl.installmentSeq || '?'}/${obl.installmentOf || '?'}`}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: isOverdue ? AMBER : TEXT3 }}>
                      {isPaid && obl.meta?.paidAt ? `Paid ${fmtShortDate(obl.meta.paidAt)}` : ''}
                      {isOverdue ? `${Math.abs(days)} days overdue · Due ${fmtShortDate(obl.dueDate)}` : ''}
                      {!isPaid && !isOverdue && obl.dueDate ? `Due ${fmtShortDate(obl.dueDate)} · ${days} days left` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold" style={{ color: isPaid ? TEXT3 : TEXT1 }}>{fmt(obl.amountMinor / 100)}</p>
                    {isOverdue && (
                      <button onClick={() => navigate('record-payment', { params: { obligationId: obl.id, trackerId } })}
                        className="text-[10px] mt-1 px-2.5 py-1 rounded-lg text-white" style={{ background: ACCENT }}>
                        Record payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Fees */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: TEXT2 }}>Fees</p>
            <button onClick={() => navigate('education-fee-form', { params: { trackerId } })}
              className="text-[10px] px-2.5 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: ACCENT }}>
              Add fee
            </button>
          </div>
          <div className="space-y-2">
            {(summary.feeItems || []).filter(f => !f.adjustmentType).map(fee => {
              const bc = BILLING_COLORS[fee.billingBasis] || BILLING_COLORS.fixed;
              return (
                <div key={fee.id} className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm" style={{ color: TEXT1 }}>{fee.label}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: bc.bg, color: bc.color }}>{fee.billingBasis}</span>
                    </div>
                    {fee.billingBasis === 'per_credit' && fee.creditCount && fee.ratePerCredit && (
                      <p className="text-[11px] mt-0.5" style={{ color: TEXT3 }}>{fee.creditCount} credits × {fmt(fee.ratePerCredit / 100)}</p>
                    )}
                    {fee.billingBasis === 'yearly' && fee.coveragePeriod && (
                      <p className="text-[11px] mt-0.5" style={{ color: TEXT3 }}>Covers {fee.coveragePeriod}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium" style={{ color: TEXT1 }}>{fmt(fee.amountMinor / 100)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Waivers */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: TEXT2 }}>Waivers</p>
            <button className="text-[10px] px-2.5 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', color: GREEN }}>
              Add waiver
            </button>
          </div>
          {(summary.waivers || []).length === 0 ? (
            <div className="rounded-xl p-4 text-center" style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
              <p className="text-xs" style={{ color: TEXT3 }}>No waivers applied</p>
            </div>
          ) : (
            <div className="space-y-2">
              {summary.waivers.map(w => (
                <div key={w.id} className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: 'rgba(34,197,94,0.04)', border: `0.5px solid rgba(34,197,94,0.15)` }}>
                  <div>
                    <p className="text-sm" style={{ color: TEXT1 }}>{w.label}</p>
                    <p className="text-[11px]" style={{ color: GREEN }}>
                      {w.waiverType === 'percentage' ? `${w.percentage}% on ${w.appliesTo === 'total' ? 'total' : w.feeCategory}` : 'Flat waiver'}
                    </p>
                  </div>
                  <p className="text-sm font-medium" style={{ color: GREEN }}>-{fmt(w.resolvedMinor / 100)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Adjustments (only if exist) */}
        {hasAdjustments && (
          <section>
            <p className="text-xs font-medium mb-3" style={{ color: TEXT2 }}>Adjustments</p>
            <div className="space-y-2">
              {adjustments.map(adj => (
                <div key={adj.id} className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: AMBER }}>adjustment</span>
                    <p className="text-sm" style={{ color: TEXT1 }}>{adj.label}</p>
                  </div>
                  <p className="text-sm font-medium" style={{ color: AMBER }}>{fmt(adj.amountMinor / 100)}</p>
                </div>
              ))}
              {scholarshipEntries.map(entry => (
                <div key={entry.id} className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: GREEN }}>credit</span>
                    <p className="text-sm" style={{ color: TEXT1 }}>{entry.note || 'Scholarship'}</p>
                  </div>
                  <p className="text-sm font-medium" style={{ color: GREEN }}>{fmt(entry.amountMinor / 100)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payment History */}
        {(summary.ledgerEntries || []).length > 0 && (
          <section>
            <p className="text-xs font-medium mb-3" style={{ color: TEXT2 }}>Payment history</p>
            <div className="space-y-1.5">
              {[...summary.ledgerEntries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => (
                <div key={entry.id} className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <Check size={12} color={GREEN} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: TEXT1 }}>{entry.note || entry.category}</p>
                    <p className="text-[10px]" style={{ color: TEXT3 }}>
                      {fmtDate(entry.date)}
                      {entry.meta?.method ? ` · ${entry.meta.method}` : ''}
                      {entry.meta?.receiptNumber ? ` · #${entry.meta.receiptNumber}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-medium flex-shrink-0" style={{ color: TEXT1 }}>{fmt(entry.amountMinor / 100)}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating overdue bar */}
      {overdueObl && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 safe-area-pb"
          style={{ background: 'rgba(245,158,11,0.15)', borderTop: `1px solid ${AMBER}`, backdropFilter: 'blur(12px)' }}>
          <button onClick={() => navigate('general-cost-tracker', { params: { obligationId: overdueObl.id, trackerId } })}
            className="w-full max-w-[420px] mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: AMBER }}>
                Pay {overdueObl.label || `installment ${overdueObl.installmentSeq}/${overdueObl.installmentOf}`} now
              </p>
              <p className="text-[11px]" style={{ color: TEXT2 }}>{Math.abs(daysFromNow(overdueObl.dueDate))} days overdue</p>
            </div>
            <p className="text-lg font-bold" style={{ color: AMBER }}>{fmt(overdueObl.amountMinor / 100)}</p>
          </button>
        </div>
      )}
    </div>
  );
};

export default SemesterDetailPageV3;
