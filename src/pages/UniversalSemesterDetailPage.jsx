import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Check, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useUniversalSemesters } from '../contexts/UniversalSemesterContext';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import {
  FEE_TYPES, SCHOLARSHIP_LABELS, fmt, calcFee, calcTotals, planLabel,
  splitIntoInstallments, sumPaisa, generateBillingDates, replanUnpaid,
  daysFromNow, fmtShortDate, fmtFullDate, dayOrdinal, todayISO, newInstId,
} from '../lib/installmentEngine';

// ═══════════════════════════════════════════════════════════════
// UNIVERSAL INSTALLMENT SEMESTER DETAIL
// (ported from semester-detail-with-universal-installments-v1.html)
// ═══════════════════════════════════════════════════════════════

const CORE_FEE_KEYS = ['tuition', 'lab', 'dev', 'library', 'exam', 'registration'];
const MORE_FEE_KEYS = ['hostel', 'club', 'transport', 'study_materials'];
const SCHOLARSHIPS = [
  { id: 'merit', label: '🏆 Merit' }, { id: 'need-based', label: '🤝 Need-Based' },
  { id: 'dept', label: '🏛️ Department' }, { id: 'ff-quota', label: '🇧🇩 FF Quota' },
  { id: 'sibling', label: '👫 Sibling' }, { id: 'special', label: '✨ Special Grant' },
];

const statusStyles = {
  pending: 'bg-amber-500/[0.18] text-amber-500',
  partial: 'bg-sky-500/[0.18] text-sky-500',
  paid: 'bg-emerald-500/[0.18] text-emerald-500',
  overdue: 'bg-rose-500/[0.18] text-rose-500',
};

export const UniversalSemesterDetailPage = () => {
  const { navigate, goBack, theme, routeParams } = useApp();
  const { getSemester, updateProfile, addFee, updateFee, removeFee } = useUniversalSemesters();
  const d = theme !== 'light';
  const { semesterId } = routeParams || {};
  const sem = getSemester(semesterId);

  const [expandedFeeId, setExpandedFeeId] = useState(null);
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [feeSheet, setFeeSheet] = useState(null); // { type }
  const [moreFees, setMoreFees] = useState(false);

  const profile = sem?.profile;
  const fees = sem?.fees || [];
  const eligibleSet = useMemo(() => new Set(profile?.eligibleFeeTypes || []), [profile?.eligibleFeeTypes]);
  const totals = useMemo(
    () => calcTotals(fees, profile?.waiverPercent || 0),
    [fees, profile?.waiverPercent]
  );

  // ── theme helpers ──────────────────────────────────────────────
  const page = d ? 'bg-surface-950' : 'bg-surface-50';
  const card = d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200';
  const titleC = d ? 'text-white' : 'text-surface-900';
  const muted = d ? 'text-surface-400' : 'text-surface-500';
  const subtle = d ? 'text-surface-500' : 'text-surface-400';

  if (!sem) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-6 ${page}`}>
        <p className={`text-sm ${muted} mb-4`}>This semester plan was not found.</p>
        <button onClick={() => navigate('semester-landing')} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600">
          Back to Semesters
        </button>
      </div>
    );
  }

  // ── installment-level actions (persist via updateFee) ──────────
  const setFeeInstallments = (feeId, mapper) => {
    const f = fees.find((x) => x.id === feeId);
    if (!f) return;
    updateFee(semesterId, feeId, { installments: mapper(f.installments || []) });
  };
  const toggleInstallment = (feeId, instId) => {
    haptics.light();
    setFeeInstallments(feeId, (insts) =>
      insts.map((i) => (i.id === instId
        ? { ...i, paid: !i.paid, paidDate: !i.paid ? todayISO() : null }
        : i)));
  };
  const editInstallmentAmount = (feeId, instId, v) =>
    setFeeInstallments(feeId, (insts) => insts.map((i) => (i.id === instId ? { ...i, amount: Math.max(0, Number(v) || 0) } : i)));
  const editInstallmentDate = (feeId, instId, v) =>
    setFeeInstallments(feeId, (insts) => insts.map((i) => (i.id === instId ? { ...i, dueDate: v || '' } : i)));
  const deleteInstallment = (feeId, instId) =>
    setFeeInstallments(feeId, (insts) => insts.filter((i) => i.id !== instId));
  const addInstallmentToFee = (feeId) =>
    setFeeInstallments(feeId, (insts) => [...insts, { id: newInstId(), amount: 0, dueDate: '', paid: false, paidDate: null }]);
  const rePlanFee = (feeId) => {
    const f = fees.find((x) => x.id === feeId);
    if (!f) return;
    const c = calcFee(f, profile.waiverPercent);
    setFeeInstallments(feeId, (insts) => replanUnpaid(insts, c.final));
    updateFee(semesterId, feeId, { waiverPctAtCreation: f.waiverEligible ? profile.waiverPercent : 0 });
  };
  const deleteFee = (feeId) => { haptics.medium(); removeFee(semesterId, feeId); if (expandedFeeId === feeId) setExpandedFeeId(null); };

  // ── derived schedule lists ─────────────────────────────────────
  const scheduleItems = useMemo(() => {
    const items = [];
    for (const f of fees) for (const i of f.installments || []) {
      if (!i.paid && i.dueDate) items.push({ fee: f, inst: i, days: daysFromNow(i.dueDate) });
    }
    return items.sort((a, b) => a.days - b.days);
  }, [fees]);
  const nextPayment = scheduleItems[0] || null;
  const overdue = scheduleItems.filter((x) => x.days < 0);
  const upcoming = scheduleItems.filter((x) => x.days >= 0).slice(0, 5);

  const eligibleCount = eligibleSet.size;
  const totalTypes = Object.keys(FEE_TYPES).length;

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-10 ${page}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 backdrop-blur-sm border-b ${d ? 'bg-surface-950/95 border-surface-800' : 'bg-white/95 border-surface-200'}`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => { haptics.light(); goBack(); }} className={`w-10 h-10 flex items-center justify-center rounded-full transition ${d ? 'hover:bg-surface-800' : 'hover:bg-surface-100'}`} aria-label="Back">
            <ArrowLeft className={`w-5 h-5 ${d ? 'text-surface-300' : 'text-surface-700'}`} />
          </button>
          <h1 className={`text-lg font-semibold ${titleC}`}>
            {sem.universityName ? `${sem.universityName} · ${sem.semesterName}` : sem.semesterName || 'Semester'}
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* ── SEMESTER SETTINGS / WAIVER PROFILE ── */}
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${d ? 'border-surface-800' : 'border-surface-200'}`}>
            <div className="flex items-center gap-2.5">
              <span className="text-lg">⚙️</span>
              <div>
                <p className={`text-[11px] uppercase tracking-wide font-semibold ${subtle}`}>Semester Settings</p>
                <p className="text-sm font-semibold text-primary-500">
                  {profile.waiverPercent > 0
                    ? `${profile.waiverPercent}% waiver · ${planLabel(profile.installmentPreference)}`
                    : `${planLabel(profile.installmentPreference)} · billed on the ${dayOrdinal(profile.billingDay)}`}
                </p>
                <p className={`text-[10px] mt-0.5 ${subtle}`}>
                  {profile.scholarshipType ? `${SCHOLARSHIP_LABELS[profile.scholarshipType]} · ` : ''}Applies to {eligibleCount}/{totalTypes} fee types
                </p>
              </div>
            </div>
            <button onClick={() => { haptics.light(); setWaiverOpen(true); }} className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary-500 bg-primary-500/10 border border-primary-500/30 hover:bg-primary-500/20 transition">Edit</button>
          </div>

          {/* 4-cell profile grid */}
          <div className={`grid grid-cols-2 gap-px ${d ? 'bg-surface-800' : 'bg-surface-200'}`}>
            {[
              ['Waiver', profile.waiverPercent > 0 ? `${profile.waiverPercent}%` : 'None'],
              ['Billing Day', `${dayOrdinal(profile.billingDay)} of every month`],
              ['Plan', planLabel(profile.installmentPreference)],
              ['Eligible Types', `${eligibleCount} of ${totalTypes}`],
            ].map(([k, v]) => (
              <div key={k} className={`px-4 py-3 ${d ? 'bg-surface-900' : 'bg-white'}`}>
                <p className={`text-[10px] uppercase tracking-wide mb-0.5 ${subtle}`}>{k}</p>
                <p className={`text-sm font-semibold ${titleC}`}>{v}</p>
              </div>
            ))}
          </div>

          {/* Money summary */}
          <div className={`px-4 py-3 border-t space-y-1.5 ${d ? 'border-surface-800' : 'border-surface-200'}`}>
            <Row muted={muted} label="Original Cost" value={fmt(totals.original)} valueCls={titleC} />
            <Row muted={muted} label="Eligible for Waiver" value={fmt(totals.eligible)} valueCls={d ? 'text-surface-300' : 'text-surface-600'} />
            {totals.discount > 0 && (
              <Row muted={muted} label={`Discount (${profile.waiverPercent}%)`} value={`-${fmt(totals.discount)}`} valueCls="text-rose-400" />
            )}
            <div className={`flex items-center justify-between pt-2 mt-1 border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
              <span className="text-primary-500 font-semibold">Final Payable</span>
              <span className={`text-xl font-bold ${titleC}`}>{fmt(totals.final)}</span>
            </div>
          </div>

          {/* Paid progress */}
          <div className={`px-4 py-3 border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] uppercase tracking-wide font-semibold ${subtle}`}>Paid</span>
              <span className="text-xs font-medium text-emerald-500">{fmt(totals.paid)} of {fmt(totals.final)} ({totals.pct}%)</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${d ? 'bg-surface-800' : 'bg-surface-200'}`}>
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${totals.pct}%` }} />
            </div>
            <div className={`flex items-center justify-between mt-2 text-[11px] ${subtle}`}>
              <span>Remaining: <span className={titleC}>{fmt(totals.remaining)}</span></span>
              <span><span className={titleC}>{totals.paidInst}</span>/<span className={titleC}>{totals.totalInst}</span> installments</span>
            </div>
          </div>
        </div>

        {/* ── NEXT PAYMENT ── */}
        {nextPayment && (
          <div className="rounded-2xl border border-primary-500/30 bg-primary-500/[0.08] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-primary-500">Next Payment</p>
              <StatusBadge days={nextPayment.days} />
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{nextPayment.fee.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${titleC}`}>
                  {nextPayment.fee.label} · Installment #{(nextPayment.fee.installments.indexOf(nextPayment.inst) + 1)}
                </p>
                <p className="text-xs text-primary-500 mt-0.5">
                  Reminder: {fmtFullDate(nextPayment.inst.dueDate)} · {nextPayment.days < 0 ? `${Math.abs(nextPayment.days)} day(s) overdue` : nextPayment.days === 0 ? 'Due today' : `In ${nextPayment.days} day(s)`}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${titleC}`}>{fmt(nextPayment.inst.amount)}</p>
                <p className={`text-[10px] mt-0.5 ${muted}`}>{nextPayment.fee.installments.filter((i) => !i.paid).length} left on this fee</p>
              </div>
            </div>
          </div>
        )}

        {/* ── UPCOMING SCHEDULE ── */}
        {(overdue.length > 0 || upcoming.length > 0) && (
          <div className={`rounded-2xl border p-4 ${card}`}>
            <p className={`text-[11px] uppercase tracking-wide font-semibold mb-3 ${subtle}`}>Upcoming Schedule</p>
            <div className="space-y-1.5">
              {overdue.map((x, idx) => (
                <div key={`o${idx}`} className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                  <span className="text-[10px] font-semibold text-rose-500 shrink-0">{Math.abs(x.days)}d late</span>
                  <span className="text-base">{x.fee.icon}</span>
                  <div className="flex-1 min-w-0"><p className={`text-sm truncate ${titleC}`}>{x.fee.label}</p><p className="text-[10px] text-rose-500/80">{fmtShortDate(x.inst.dueDate)}</p></div>
                  <p className="text-sm font-semibold text-rose-500">{fmt(x.inst.amount)}</p>
                </div>
              ))}
              {upcoming.map((x, idx) => (
                <div key={`u${idx}`} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${d ? 'border-surface-800 bg-surface-950/40' : 'border-surface-200 bg-surface-50'}`}>
                  <span className={`text-[10px] font-semibold shrink-0 ${muted}`}>{x.days === 0 ? 'Today' : `in ${x.days}d`}</span>
                  <span className="text-base">{x.fee.icon}</span>
                  <div className="flex-1 min-w-0"><p className={`text-sm truncate ${titleC}`}>{x.fee.label}</p><p className={`text-[10px] ${subtle}`}>{fmtShortDate(x.inst.dueDate)}</p></div>
                  <p className={`text-sm font-semibold ${titleC}`}>{fmt(x.inst.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FEES ── */}
        <h2 className={`text-sm font-semibold mt-2 ${titleC}`}>Fees in this Semester</h2>
        {fees.length === 0 ? (
          <div className={`rounded-xl border border-dashed p-6 text-center ${d ? 'border-surface-800' : 'border-surface-300'}`}>
            <div className="text-3xl mb-2">🎓</div>
            <p className={`text-sm ${muted}`}>No fees yet</p>
            <p className={`text-xs mt-1 ${subtle}`}>Every fee type supports installment plans — even Hostel, Club, Transport, and Materials</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fees.map((f) => (
              <FeeRow
                key={f.id} f={f} d={d} profile={profile}
                expanded={expandedFeeId === f.id}
                onToggleExpand={() => setExpandedFeeId(expandedFeeId === f.id ? null : f.id)}
                onToggleInst={toggleInstallment} onEditAmount={editInstallmentAmount}
                onEditDate={editInstallmentDate} onDeleteInst={deleteInstallment}
                onAddInst={addInstallmentToFee} onReplan={rePlanFee} onDeleteFee={deleteFee}
              />
            ))}
          </div>
        )}

        {/* ── ADD FEE ── */}
        <div className={`rounded-2xl border p-4 mt-2 ${card}`}>
          <p className={`text-sm font-semibold mb-3 ${titleC}`}>Add Fee</p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {CORE_FEE_KEYS.map((k) => (
              <FeeChip key={k} d={d} conf={FEE_TYPES[k]} label={FEE_TYPES[k].label.replace(' Fee', '')} onClick={() => { haptics.light(); setFeeSheet({ type: k }); }} />
            ))}
          </div>
          <button onClick={() => setMoreFees(!moreFees)} className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-dashed transition ${d ? 'text-surface-400 hover:text-white bg-surface-950/50 hover:bg-surface-800 border-surface-700' : 'text-surface-500 hover:text-surface-900 bg-surface-50 hover:bg-surface-100 border-surface-300'}`}>
            {moreFees ? 'Hide more types' : 'More fee types'}
            {moreFees ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {moreFees && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {MORE_FEE_KEYS.map((k) => (
                <FeeChip key={k} d={d} conf={FEE_TYPES[k]} label={FEE_TYPES[k].label.replace(' Fee', '')} span={k === 'study_materials'} onClick={() => { haptics.light(); setFeeSheet({ type: k }); }} />
              ))}
            </div>
          )}
          <FeeChip d={d} conf={FEE_TYPES.custom} label="Custom Fee" full onClick={() => { haptics.light(); setFeeSheet({ type: 'custom' }); }} />
          <p className={`text-[10px] mt-3 leading-relaxed ${subtle}`}>
            Every fee supports Full / 2× / 3× / 4× / Custom installments · Amounts stored AFTER waiver so receipts never drift
          </p>
        </div>

        {/* ── SUMMARY ── */}
        <div className={`rounded-2xl border p-4 ${card}`}>
          <p className={`text-[11px] uppercase tracking-wide font-semibold mb-3 ${subtle}`}>Semester Summary</p>
          <dl className={`grid grid-cols-2 gap-3 text-sm mb-3 pb-3 border-b ${d ? 'border-surface-800' : 'border-surface-200'}`}>
            <Stat muted={subtle} titleC={titleC} k="Waiver" v={profile.waiverPercent > 0 ? `${profile.waiverPercent}%` : 'None'} />
            <Stat muted={subtle} titleC={titleC} k="Billing Day" v={dayOrdinal(profile.billingDay)} right />
            <Stat muted={subtle} titleC={titleC} k="Payment Plan" v={planLabel(profile.installmentPreference)} />
            <Stat muted={subtle} titleC={titleC} k="Installments Left" v={Math.max(0, totals.totalInst - totals.paidInst)} right />
          </dl>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat muted={subtle} titleC={titleC} k="Total Original Cost" v={fmt(totals.original)} big />
            <Stat muted={subtle} titleC="text-rose-400" k="Total Waiver" v={fmt(totals.discount)} big right />
            <Stat muted={subtle} titleC="text-emerald-500" k="Total Paid" v={fmt(totals.paid)} big />
            <Stat muted={subtle} titleC="text-amber-500" k="Total Remaining" v={fmt(totals.remaining)} big right />
          </dl>
        </div>
      </main>

      {waiverOpen && (
        <WaiverSheet d={d} profile={profile} fees={fees}
          onClose={() => setWaiverOpen(false)}
          onSave={(patch) => {
            // Re-plan unpaid installments where eligibility flipped or pct changed.
            const newPct = patch.waiverPercent;
            const newEligible = new Set(patch.eligibleFeeTypes);
            for (const f of fees) {
              const willBeEligible = newEligible.has(f.type);
              const flipped = !!f.waiverEligible !== willBeEligible;
              const pctChanged = willBeEligible && f.waiverPctAtCreation !== newPct;
              if (!flipped && !pctChanged) continue;
              const newFinal = willBeEligible ? f.originalAmount * (1 - newPct / 100) : f.originalAmount;
              updateFee(semesterId, f.id, {
                waiverEligible: willBeEligible,
                waiverPctAtCreation: willBeEligible ? newPct : 0,
                installments: replanUnpaid(f.installments, newFinal),
              });
            }
            updateProfile(semesterId, patch);
            setWaiverOpen(false);
          }}
        />
      )}

      {feeSheet && (
        <FeeSheet d={d} type={feeSheet.type} profile={profile} eligibleSet={eligibleSet}
          onClose={() => setFeeSheet(null)}
          onSubmit={(fee) => { addFee(semesterId, fee); haptics.success(); setFeeSheet(null); }}
        />
      )}
    </motion.div>
  );
};

// ── small presentational helpers ─────────────────────────────────
function Row({ muted, label, value, valueCls }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted}>{label}</span>
      <span className={valueCls}>{value}</span>
    </div>
  );
}
function Stat({ muted, titleC, k, v, big, right }) {
  return (
    <div className={right ? 'text-right' : ''}>
      <dt className={`text-xs ${muted}`}>{k}</dt>
      <dd className={`${big ? 'text-base' : 'text-sm'} font-semibold mt-0.5 ${titleC}`}>{v}</dd>
    </div>
  );
}
function StatusBadge({ days }) {
  const [txt, cls] = days < 0
    ? ['Overdue', 'bg-rose-500/20 text-rose-500']
    : days === 0 ? ['Today', 'bg-amber-500/20 text-amber-500'] : ['Upcoming', 'bg-primary-500/20 text-primary-500'];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{txt}</span>;
}
function FeeChip({ d, conf, label, onClick, full, span }) {
  return (
    <button onClick={onClick}
      className={`fee-chip flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition ${full ? 'w-full mt-2' : ''} ${span ? 'col-span-3' : ''} ${
        d ? 'border-surface-700 bg-surface-800 text-white hover:border-primary-500' : 'border-surface-200 bg-surface-100 text-surface-800 hover:border-primary-500'
      }`}>
      <span>{conf.icon}</span><span>{label}</span>
    </button>
  );
}

// ── Fee row ──────────────────────────────────────────────────────
function FeeRow({ f, d, profile, expanded, onToggleExpand, onToggleInst, onEditAmount, onEditDate, onDeleteInst, onAddInst, onReplan, onDeleteFee }) {
  const c = calcFee(f, profile.waiverPercent);
  const titleC = d ? 'text-white' : 'text-surface-900';
  const subtle = d ? 'text-surface-500' : 'text-surface-400';
  const insts = f.installments || [];
  const subLabel = f.type === 'tuition' && f.breakdown
    ? `${f.breakdown.credits} credits × ${fmt(f.breakdown.creditPrice)}/credit`
    : f.note || '';

  return (
    <div className={`rounded-xl border overflow-hidden ${d ? 'border-surface-800 bg-surface-900' : 'border-surface-200 bg-white'}`}>
      <div className="flex items-start gap-3 p-3">
        <span className="text-base mt-0.5">{f.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium truncate ${titleC}`}>{f.label}</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyles[c.status]}`}>
              {{ pending: 'Pending', partial: 'Partial', paid: 'Paid', overdue: 'Overdue' }[c.status]}
            </span>
          </div>
          {subLabel && <p className={`text-[10px] truncate mt-0.5 ${subtle}`}>{subLabel}</p>}
          <p className={`text-[10px] mt-0.5 ${subtle}`}>Installments: {c.paidCount}/{c.totalCount} paid</p>
          {c.hasDrift && <p className="text-[10px] text-amber-500 mt-0.5">⚠ Installments out of sync ({fmt(Math.abs(c.driftPaisa) / 100)} drift) — tap Re-plan</p>}
        </div>
        <div className="text-right shrink-0">
          {c.waiverAmt > 0 ? (
            <>
              <p className={`text-[10px] line-through ${subtle}`}>{fmt(c.original)}</p>
              <p className="text-sm font-semibold text-primary-500">{fmt(c.instSum)}</p>
            </>
          ) : <p className={`text-sm font-semibold ${titleC}`}>{fmt(c.instSum)}</p>}
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className={`h-1.5 rounded-full overflow-hidden ${d ? 'bg-surface-800' : 'bg-surface-200'}`}>
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${c.pct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[10px]">
          <span className="text-emerald-500">Paid {fmt(c.paid)} ({c.pct}%)</span>
          <span className={subtle}>Remaining {fmt(c.remaining)}</span>
        </div>
      </div>
      <button onClick={onToggleExpand} className={`w-full flex items-center justify-center gap-1 py-1.5 border-t text-[10px] transition ${d ? 'border-surface-800 text-surface-500 hover:text-surface-300' : 'border-surface-200 text-surface-400 hover:text-surface-600'}`}>
        {expanded ? <>Hide installments <ChevronUp className="w-2.5 h-2.5" /></> : <>View installment schedule <ChevronDown className="w-2.5 h-2.5" /></>}
      </button>
      {expanded && (
        <div className={`border-t px-3 py-3 space-y-2 ${d ? 'border-surface-800 bg-surface-950/40' : 'border-surface-200 bg-surface-50'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-[11px] uppercase tracking-wide font-semibold ${subtle}`}>Installment Schedule</p>
            <div className="flex items-center gap-2">
              {c.hasDrift && <button onClick={() => onReplan(f.id)} className="text-[10px] text-amber-500 hover:text-amber-400">Re-plan</button>}
              <button onClick={() => onAddInst(f.id)} className="text-[10px] text-primary-500 hover:text-primary-400">+ Add</button>
            </div>
          </div>
          {insts.length === 0 && <p className={`text-xs italic ${subtle}`}>No installments. Tap + Add to create one.</p>}
          {insts.map((inst, idx) => {
            const isOverdue = !inst.paid && inst.dueDate && daysFromNow(inst.dueDate) < 0;
            return (
              <div key={inst.id} className={`rounded-lg border p-2.5 ${inst.paid ? 'border-emerald-800/30 bg-emerald-900/10' : isOverdue ? 'border-rose-800/30 bg-rose-900/10' : d ? 'border-surface-800 bg-surface-900' : 'border-surface-200 bg-white'}`}>
                <div className="flex items-center gap-2.5">
                  <button onClick={() => onToggleInst(f.id, inst.id)} className="shrink-0" aria-label="Toggle paid">
                    {inst.paid
                      ? <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                      : <div className={`w-5 h-5 rounded-full border-2 ${isOverdue ? 'border-rose-500' : d ? 'border-surface-600' : 'border-surface-300'}`} />}
                  </button>
                  <span className={`text-[10px] font-semibold shrink-0 ${inst.paid ? 'text-emerald-500' : subtle}`}>#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <input type="date" value={inst.dueDate || ''} onChange={(e) => onEditDate(f.id, inst.id, e.target.value)}
                      className={`px-2 py-1 rounded text-[11px] outline-none border w-full focus:border-primary-500 ${d ? 'bg-surface-950 border-surface-700 text-surface-300' : 'bg-white border-surface-200 text-surface-600'}`} style={{ colorScheme: d ? 'dark' : 'light' }} />
                    {inst.paid ? <p className="text-[10px] text-emerald-500 mt-1">Paid on {fmtShortDate(inst.paidDate)}</p>
                      : isOverdue ? <p className="text-[10px] text-rose-500 mt-1">{Math.abs(daysFromNow(inst.dueDate))}d overdue</p> : null}
                  </div>
                  <input type="number" value={inst.amount} min="0" step="0.01" onChange={(e) => onEditAmount(f.id, inst.id, e.target.value)}
                    className={`w-24 px-2 py-1 rounded text-sm font-semibold text-right outline-none border focus:border-primary-500 ${d ? 'bg-surface-950 border-surface-700 text-white' : 'bg-white border-surface-200 text-surface-900'}`} />
                  <button onClick={() => onDeleteInst(f.id, inst.id)} className={`p-1 rounded hover:text-rose-500 ${subtle}`} aria-label="Remove installment"><X className="w-3 h-3" /></button>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-2">
            <span className={`text-[10px] ${subtle}`}>{f.waiverEligible ? '🎓 Waiver-eligible' : '🚫 Not waiver-eligible'}</span>
            <button onClick={() => onDeleteFee(f.id)} className="text-[10px] text-rose-400 hover:text-rose-300 transition flex items-center gap-1"><Trash2 className="w-2.5 h-2.5" />Remove fee</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Waiver / Settings sheet ──────────────────────────────────────
function WaiverSheet({ d, profile, fees, onClose, onSave }) {
  const [pct, setPct] = useState(profile.waiverPercent || 0);
  const [scholarship, setScholarship] = useState(profile.scholarshipType || null);
  const [billingDay, setBillingDay] = useState(profile.billingDay || 10);
  const [planPref, setPlanPref] = useState(profile.installmentPreference);
  const [endDate, setEndDate] = useState(profile.semesterEndDate || '');
  const [eligible, setEligible] = useState(new Set(profile.eligibleFeeTypes || []));

  const titleC = d ? 'text-white' : 'text-surface-900';
  const muted = d ? 'text-surface-400' : 'text-surface-500';
  const subtle = d ? 'text-surface-500' : 'text-surface-400';
  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm outline-none border focus:border-primary-500 ${d ? 'bg-surface-900 border-surface-700 text-white placeholder-surface-600' : 'bg-white border-surface-200 text-surface-900'}`;
  const chip = (a) => `px-3 py-2 rounded-xl border text-sm font-semibold transition ${a ? 'border-primary-500 bg-primary-500/15 text-primary-500' : d ? 'border-surface-700 bg-surface-800 text-white' : 'border-surface-200 bg-surface-100 text-surface-700'}`;

  const willChange = fees.filter((f) => {
    const wasE = !!f.waiverEligible, willE = eligible.has(f.type);
    if (wasE !== willE) return true;
    if (willE && f.waiverPctAtCreation !== pct) return true;
    return false;
  }).length;

  const toggleType = (k) => setEligible((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <Sheet d={d} onClose={onClose} title="Semester Settings" subtitle="Billing & reminder profile · applies to every new fee"
      footer={
        <div className="flex items-center gap-2">
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${d ? 'text-surface-300 bg-surface-800 hover:bg-surface-700' : 'text-surface-700 bg-surface-100 hover:bg-surface-200'}`}>Cancel</button>
          <button onClick={() => onSave({ waiverPercent: pct, scholarshipType: scholarship, billingDay, installmentPreference: planPref, semesterEndDate: endDate, eligibleFeeTypes: [...eligible] })}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 transition">Save</button>
        </div>
      }>
      {/* Waiver % */}
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-primary-500 mb-2.5">① Waiver Percentage</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[0, 25, 50, 75].map((p) => <button key={p} className={chip(pct === p)} onClick={() => setPct(p)}>{p}%</button>)}
          <button className={`${chip(pct === 100)} col-span-4`} onClick={() => setPct(100)}>100% Full Waiver</button>
        </div>
        <label className={`text-xs font-medium block mb-1.5 ${muted}`}>Custom Percentage</label>
        <div className="relative">
          <input type="number" min="0" max="100" step="0.5" placeholder="e.g. 35" value={pct || ''} onChange={(e) => setPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className={`${inputCls} pr-10`} />
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${muted}`}>%</span>
        </div>
      </div>
      {/* Billing day */}
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-primary-500 mb-2.5">② Monthly Billing Date</p>
        <div className="grid grid-cols-6 gap-1.5">
          {[1, 5, 10, 15, 20, 25].map((day) => <button key={day} className={`${chip(billingDay === day)} text-xs py-2`} onClick={() => setBillingDay(day)}>{dayOrdinal(day)}</button>)}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className={`text-xs shrink-0 ${muted}`}>Custom day:</label>
          <input type="number" min="1" max="28" step="1" placeholder="1-28" onChange={(e) => { const v = Math.min(28, Math.max(1, Number(e.target.value) || 0)); if (v) setBillingDay(v); }} className={`flex-1 ${inputCls}`} />
        </div>
      </div>
      {/* Default plan */}
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-primary-500 mb-2.5">③ Default Payment Plan</p>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4].map((p) => <button key={p} className={chip(String(planPref) === String(p))} onClick={() => setPlanPref(p)}>{p === 1 ? 'Full' : `${p}×`}</button>)}
          <button className={`${chip(planPref === 'custom')} col-span-2`} onClick={() => setPlanPref('custom')}>Custom</button>
        </div>
      </div>
      {/* Semester end */}
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-primary-500 mb-2.5">④ Semester End Date <span className={`normal-case font-normal ${subtle}`}>(optional)</span></p>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} style={{ colorScheme: d ? 'dark' : 'light' }} />
      </div>
      {/* Scholarship */}
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-primary-500 mb-2.5">⑤ Scholarship Type <span className={`normal-case font-normal ${subtle}`}>(optional)</span></p>
        <div className="grid grid-cols-2 gap-2">
          {SCHOLARSHIPS.map((s) => <button key={s.id} className={`${chip(scholarship === s.id)} text-[13px] text-left`} onClick={() => setScholarship(scholarship === s.id ? null : s.id)}>{s.label}</button>)}
        </div>
      </div>
      {/* Eligibility */}
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-primary-500 mb-2.5">⑥ Apply Waiver To These Fee Types</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(FEE_TYPES).map(([k, conf]) => {
            const on = eligible.has(k);
            return (
              <label key={k} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 transition ${on ? 'border-primary-500/40 bg-primary-500/10' : d ? 'border-surface-800 bg-surface-900' : 'border-surface-200 bg-white'}`}>
                <input type="checkbox" checked={on} onChange={() => toggleType(k)} className="w-3.5 h-3.5 accent-primary-500 shrink-0" />
                <span className="text-sm shrink-0">{conf.icon}</span>
                <span className={`text-xs truncate ${on ? 'text-primary-500' : d ? 'text-surface-300' : 'text-surface-600'}`}>{conf.label}</span>
              </label>
            );
          })}
        </div>
      </div>
      {willChange > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-amber-500">Existing fees will re-plan</p>
          <p className="text-[11px] text-amber-500/80 mt-0.5">{willChange} existing fee(s) will have their UNPAID installments re-planned. Paid installments stay frozen.</p>
        </div>
      )}
    </Sheet>
  );
}

// ── Fee setup sheet (3 conceptual steps in one scroll) ───────────
function FeeSheet({ d, type, profile, eligibleSet, onClose, onSubmit }) {
  const conf = FEE_TYPES[type];
  const isTuition = conf.sheet === 'tuition';
  const [creditPrice, setCreditPrice] = useState('');
  const [credits, setCredits] = useState('');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [plan, setPlan] = useState(profile.installmentPreference || 1);
  const [customRows, setCustomRows] = useState([{ amount: '', dueDate: '' }]);

  const titleC = d ? 'text-white' : 'text-surface-900';
  const muted = d ? 'text-surface-400' : 'text-surface-500';
  const subtle = d ? 'text-surface-500' : 'text-surface-400';
  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm outline-none border focus:border-primary-500 ${d ? 'bg-surface-900 border-surface-700 text-white placeholder-surface-600' : 'bg-white border-surface-200 text-surface-900'}`;
  const chip = (a) => `px-3 py-2 rounded-xl border text-sm font-semibold transition ${a ? 'border-primary-500 bg-primary-500/15 text-primary-500' : d ? 'border-surface-700 bg-surface-800 text-white' : 'border-surface-200 bg-surface-100 text-surface-700'}`;

  const eligible = eligibleSet.has(type);
  const original = isTuition
    ? (Math.max(0, Number(creditPrice) || 0) * Math.max(0, Number(credits) || 0))
    : Math.max(0, Number(amount) || 0);
  const finalAmt = eligible ? original * (1 - (profile.waiverPercent || 0) / 100) : original;

  const planInstallments = () => {
    if (plan === 'custom') {
      return customRows.map((r) => ({ amount: Math.max(0, Number(r.amount) || 0), dueDate: r.dueDate || '' }));
    }
    const n = Number(plan) || 1;
    const amounts = splitIntoInstallments(finalAmt, n);
    const dates = generateBillingDates(n, { billingDay: profile.billingDay, semesterEndDate: profile.semesterEndDate });
    return amounts.map((amt, i) => ({ amount: amt, dueDate: dates[i] || '' }));
  };

  // Seed custom rows with an equal split + billing dates when switching to custom
  const selectPlan = (p) => {
    setPlan(p);
    if (p === 'custom' && customRows.every((r) => !r.amount) && finalAmt > 0) {
      const dates = generateBillingDates(3, { billingDay: profile.billingDay, semesterEndDate: profile.semesterEndDate });
      setCustomRows(splitIntoInstallments(finalAmt, 3).map((amt, i) => ({ amount: amt, dueDate: dates[i] || '' })));
    }
  };

  const insts = planInstallments();
  const sumP = sumPaisa(insts.map((i) => i.amount));
  const finalP = Math.round(finalAmt * 100);
  let invalid = null;
  if (original <= 0) invalid = 'Enter a fee amount';
  else if (conf.editableName && !name.trim()) invalid = 'Custom fees need a name';
  else if (plan === 'custom') {
    if (insts.length === 0) invalid = 'Add at least one installment';
    else if (insts.some((i) => i.amount <= 0)) invalid = 'Each installment must be > 0';
    else if (sumP !== finalP) invalid = `Installments sum to ${fmt(sumP / 100)} but final is ${fmt(finalAmt)}`;
  }

  const submit = () => {
    if (invalid) return;
    onSubmit({
      type,
      label: isTuition ? 'Tuition' : (conf.editableName ? name.trim() : conf.label),
      icon: conf.icon,
      originalAmount: original,
      waiverEligible: eligible,
      waiverPctAtCreation: eligible ? (profile.waiverPercent || 0) : 0,
      breakdown: isTuition ? { creditPrice: Number(creditPrice) || 0, credits: Number(credits) || 0 } : null,
      note: !isTuition ? (note.trim() || null) : null,
      installments: insts,
    });
  };

  return (
    <Sheet d={d} onClose={onClose} title={`Add ${conf.label}`} subtitle="Amount · waiver · schedule"
      footer={
        <div className="flex items-center gap-2">
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${d ? 'text-surface-300 bg-surface-800 hover:bg-surface-700' : 'text-surface-700 bg-surface-100 hover:bg-surface-200'}`}>Cancel</button>
          <button onClick={submit} disabled={!!invalid} className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition ${invalid ? 'bg-primary-700/40 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-500'}`}>Add Fee</button>
        </div>
      }>
      {/* Step 1: details */}
      {isTuition ? (
        <div className="grid grid-cols-2 gap-3">
          <div><label className={`text-xs font-medium block mb-1.5 ${muted}`}>Credit Price (৳)</label><input type="number" min="0" step="100" placeholder="6500" value={creditPrice} onChange={(e) => setCreditPrice(e.target.value)} className={inputCls} autoFocus /></div>
          <div><label className={`text-xs font-medium block mb-1.5 ${muted}`}>Credits</label><input type="number" min="0" step="1" placeholder="15" value={credits} onChange={(e) => setCredits(e.target.value)} className={inputCls} /></div>
        </div>
      ) : (
        <div className="space-y-4">
          {conf.editableName && <div><label className={`text-xs font-medium block mb-1.5 ${muted}`}>Fee Name</label><input type="text" placeholder="e.g. Hostel Deposit" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus /></div>}
          <div><label className={`text-xs font-medium block mb-1.5 ${muted}`}>Amount (৳)</label><input type="number" min="0" step="100" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputCls} text-lg font-semibold`} autoFocus={!conf.editableName} /></div>
          <div><label className={`text-xs font-medium block mb-1.5 ${muted}`}>Note <span className="opacity-60">(optional)</span></label><input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></div>
        </div>
      )}

      {/* Step 2: review total */}
      <div className="rounded-2xl border border-primary-500/20 bg-primary-500/[0.06] p-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wide font-semibold text-primary-500">Fee Total</span>
          <span className={`text-[10px] ${subtle}`}>{eligible && profile.waiverPercent > 0 && original > 0 ? 'Original (pre-waiver)' : ''}</span>
        </div>
        <p className={`text-2xl font-bold ${titleC}`}>{fmt(original)}</p>
        {eligible && profile.waiverPercent > 0 && original > 0 && (
          <p className="text-[11px] text-primary-500 mt-1">Final payable after {profile.waiverPercent}% waiver: {fmt(finalAmt)}</p>
        )}
        <p className={`text-[10px] mt-1 ${subtle}`}>{eligible ? '🎓 Waiver-eligible (set in Semester Settings)' : '🚫 Not waiver-eligible'}</p>
      </div>

      {/* Step 3: schedule */}
      <div>
        <div className="flex items-start gap-2 rounded-lg border border-primary-500/20 bg-primary-500/[0.06] px-3 py-2 mb-3">
          <span className="text-sm mt-0.5">⚙️</span>
          <p className="text-[10px] text-primary-500/90 leading-relaxed flex-1">Semester default: {planLabel(profile.installmentPreference)} · billed {dayOrdinal(profile.billingDay)}. Adjust below to override for this fee.</p>
        </div>
        <label className={`text-xs font-medium block mb-2 ${muted}`}>Payment plan</label>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {[1, 2, 3, 4].map((p) => <button key={p} className={`${chip(String(plan) === String(p))} text-xs py-2`} onClick={() => selectPlan(p)}>{p === 1 ? 'Full' : `${p}×`}</button>)}
          <button className={`${chip(plan === 'custom')} text-xs py-2`} onClick={() => selectPlan('custom')}>Custom</button>
        </div>
        <div className="space-y-1.5">
          {insts.map((inst, idx) => (
            <div key={idx} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${d ? 'border-surface-800 bg-surface-900' : 'border-surface-200 bg-white'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${d ? 'bg-surface-800 text-surface-400' : 'bg-surface-200 text-surface-600'}`}>#{idx + 1}</div>
              {plan === 'custom' ? (
                <input type="date" value={inst.dueDate} onChange={(e) => setCustomRows((r) => r.map((x, i) => i === idx ? { ...x, dueDate: e.target.value } : x))} className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none border ${d ? 'bg-surface-950 border-surface-700 text-surface-300' : 'bg-white border-surface-200 text-surface-600'}`} style={{ colorScheme: d ? 'dark' : 'light' }} />
              ) : (
                <div className="flex-1 min-w-0"><span className={`text-xs ${subtle}`}>{fmtShortDate(inst.dueDate)}</span></div>
              )}
              {plan === 'custom' ? (
                <input type="number" min="0" step="0.01" value={inst.amount === 0 ? '' : inst.amount} placeholder="0" onChange={(e) => setCustomRows((r) => r.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x))} className={`w-28 px-2.5 py-1.5 rounded-lg text-sm text-right outline-none border ${d ? 'bg-surface-950 border-surface-700 text-white' : 'bg-white border-surface-200'}`} />
              ) : (
                <span className={`text-sm font-semibold ${titleC}`}>{fmt(inst.amount)}</span>
              )}
              {plan === 'custom' && <button onClick={() => setCustomRows((r) => r.length > 1 ? r.filter((_, i) => i !== idx) : r)} className="p-1 rounded text-rose-400 hover:bg-rose-900/20"><X className="w-3 h-3" /></button>}
            </div>
          ))}
        </div>
        {plan === 'custom' && (
          <button onClick={() => setCustomRows((r) => [...r, { amount: '', dueDate: '' }])} className="w-full mt-2 py-2 rounded-lg text-xs font-medium text-primary-500 border border-dashed border-primary-500/30 hover:bg-primary-500/10 transition">+ Add Installment</button>
        )}
        <p className={`text-[11px] mt-2 ${plan === 'custom' && sumP !== finalP ? 'text-rose-400' : subtle}`}>
          {plan === 'custom'
            ? `Sum: ${fmt(sumP / 100)} · ${sumP === finalP ? 'matches final ✓' : sumP < finalP ? `${fmt((finalP - sumP) / 100)} short` : `over by ${fmt((sumP - finalP) / 100)}`}`
            : finalAmt > 0 ? `Total: ${fmt(finalAmt)} across ${insts.length} installment${insts.length === 1 ? '' : 's'}` : ''}
        </p>
        {invalid && <p className="text-xs text-rose-400 mt-1">{invalid}</p>}
      </div>
    </Sheet>
  );
}

// ── Generic bottom sheet ─────────────────────────────────────────
function Sheet({ d, onClose, title, subtitle, children, footer }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className={`absolute inset-x-0 bottom-0 max-w-md mx-auto rounded-t-3xl border-t border-x max-h-[94vh] flex flex-col ${d ? 'border-surface-800 bg-surface-950' : 'border-surface-200 bg-white'}`}>
        <div className={`shrink-0 px-5 pt-3 pb-4 border-b ${d ? 'border-surface-800' : 'border-surface-200'}`}>
          <div className={`w-10 h-1 rounded-full mx-auto mb-3 ${d ? 'bg-surface-700' : 'bg-surface-300'}`} />
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-base font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{title}</p>
              <p className={`text-xs mt-0.5 ${d ? 'text-surface-500' : 'text-surface-400'}`}>{subtitle}</p>
            </div>
            <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-full ${d ? 'hover:bg-surface-800 text-surface-400' : 'hover:bg-surface-100 text-surface-500'}`}><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">{children}</div>
        <div className={`shrink-0 px-5 py-4 border-t ${d ? 'border-surface-800 bg-surface-950' : 'border-surface-200 bg-white'}`}>{footer}</div>
      </div>
    </div>
  );
}

export default UniversalSemesterDetailPage;
