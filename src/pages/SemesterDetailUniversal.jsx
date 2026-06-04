import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

import { GCard, GCardContent, GButton } from '../components/ui';
import { FeePlanSheet } from '../components/semester/FeePlanSheet';
import { SemesterSettingsSheet } from '../components/semester/SemesterSettingsSheet';
import {
  recomputeFee,
  feeStatus,
  driftPaisa,
  rePlanUnpaid,
  semesterTotals,
  upcomingInstallments,
  sumBdt,
  daysFromNow,
  todayISO,
  genId,
} from '../lib/universalInstallments';
import {
  FEE_TYPES,
  CORE_FEE_TYPES,
  MORE_FEE_TYPES,
  PLAN_OPTIONS,
  feeTypeInfo,
  defaultProfile,
} from '../lib/feeTypeConfig';
import { makeFmt } from '../utils/format';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';

/* ── small presentation helpers (dark hub from the mockup) ───────────────── */
const fmtShortDate = (iso) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
const fmtFullDate = (iso) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
const dayOrdinal = (d) => {
  const n = Number(d) || 0;
  if (n >= 11 && n <= 13) return `${n}th`;
  const last = n % 10;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' }[last] || 'th')}`;
};
const planLabelFor = (p) => PLAN_OPTIONS.find((o) => String(o.value) === String(p))?.label || 'Full';
const relativeDue = (iso) => {
  const d = daysFromNow(iso);
  if (d == null) return '';
  if (d < 0) return `${Math.abs(d)} days overdue`;
  if (d === 0) return 'Due today';
  return `In ${d} days`;
};

/* Status pill styling matching the mockup's status-* classes. */
const STATUS_PILL = {
  pending: 'bg-amber-500/[0.18] text-amber-400',
  partial: 'bg-sky-500/[0.18] text-sky-300',
  paid: 'bg-emerald-500/[0.18] text-emerald-300',
  overdue: 'bg-rose-500/[0.18] text-rose-300',
};
const STATUS_LABEL = { pending: 'Pending', partial: 'Partial', paid: 'Paid', overdue: 'Overdue' };
const StatusPill = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_PILL[status] || STATUS_PILL.pending}`}>
    {STATUS_LABEL[status] || 'Pending'}
  </span>
);

/* Migrate a single legacy fee[] item that predates the universal-installment shape. */
function migrateFee(item) {
  let f = { ...item };
  if (!Array.isArray(f.installments) || f.installments.length === 0) {
    f.installments = [
      {
        id: genId('i'),
        amount: Number(f.amount) || 0,
        dueDate: '',
        paid: !!f.isPaid,
        paidDate: f.paidAt || null,
      },
    ];
  }
  if (f.originalAmount == null) f.originalAmount = Number(f.amount) || 0;
  if (f.amount == null) f.amount = f.originalAmount;
  if (f.waiverEligible == null) f.waiverEligible = false;
  if (f.waiverPctAtCreation == null) f.waiverPctAtCreation = 0;
  if (!f.type) f.type = 'custom';
  const info = feeTypeInfo(f.type);
  if (!f.label) f.label = info.label;
  if (!f.icon) f.icon = info.icon;
  return f;
}

export function SemesterDetailUniversal() {
  const { routeParams, navigate, goBack, addToast, user } = useApp();
  const { getFeeById, updateFee } = useEducationFees();

  const containerId = routeParams?.semesterId;
  const fee = getFeeById(containerId);

  const currency = user?.profile?.currency || 'BDT';
  const fmt = useMemo(() => makeFmt(currency), [currency]);

  const [expandedFeeId, setExpandedFeeId] = useState(null);
  const [moreFeeOpen, setMoreFeeOpen] = useState(false);
  const [addType, setAddType] = useState(null); // fee type for FeePlanSheet, or null
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* ── derive profile + migrated, always-recomputed fees ──
     (all hooks run unconditionally — the "not found" guard returns AFTER them) */
  const profile = fee?.semester?.profile || defaultProfile();
  const fees = useMemo(() => {
    const raw = fee?.semester?.fees || [];
    return raw.map((item) => recomputeFee(migrateFee(item)));
  }, [fee?.semester?.fees]);

  /* ── single source of writes — keeps fee.amount === totalAmount === Σ amounts ── */
  const persist = useCallback(
    (nextFees, nextProfile) => {
      if (!fee) return;
      const recomputed = nextFees.map(recomputeFee);
      const totalAmount = sumBdt(recomputed.map((f) => f.amount));
      updateFee(
        containerId,
        {
          amount: totalAmount,
          name: fee.name,
          semester: {
            ...fee.semester,
            semesterName: fee.semester?.semesterName,
            totalAmount,
            profile: nextProfile || profile,
            fees: recomputed,
          },
        },
        'Updated via semester detail'
      );
    },
    [containerId, fee, profile, updateFee]
  );

  /* ── aggregates ── */
  const totals = useMemo(() => semesterTotals(fees), [fees]);
  const upcoming = useMemo(() => upcomingInstallments(fees), [fees]);
  const overdueRows = useMemo(() => upcoming.filter((r) => r.overdue), [upcoming]);
  const upcomingRows = useMemo(
    () => upcoming.filter((r) => !r.overdue && r.dueDate).slice(0, 5),
    [upcoming]
  );
  const next = upcoming[0];

  const eligibleCount = (profile.eligibleFeeTypes || []).length;
  const totalTypes = Object.keys(FEE_TYPES).length;

  /* ── installment paid toggle ── */
  const toggleInstallment = useCallback(
    (feeId, instId) => {
      const nextFees = fees.map((f) => {
        if (f.id !== feeId) return f;
        const installments = (f.installments || []).map((i) => {
          if (i.id !== instId) return i;
          const paid = !i.paid;
          return { ...i, paid, paidDate: paid ? todayISO() : null };
        });
        return recomputeFee({ ...f, installments });
      });
      persist(nextFees);
    },
    [fees, persist]
  );

  const handleRePlan = useCallback(
    (feeId) => {
      const nextFees = fees.map((f) => (f.id === feeId ? rePlanUnpaid(f, profile) : f));
      persist(nextFees);
      addToast('Installments re-planned', 'success');
    },
    [fees, profile, persist, addToast]
  );

  const handleDeleteFee = useCallback(
    (feeId) => {
      persist(fees.filter((f) => f.id !== feeId));
      if (expandedFeeId === feeId) setExpandedFeeId(null);
      addToast('Fee removed', 'success');
    },
    [fees, persist, expandedFeeId, addToast]
  );

  /* ── missing semester guard (after all hooks — Rules of Hooks) ── */
  if (!fee) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <div className="max-w-md mx-auto px-4 py-10">
          <GCard className="!bg-surface-900 !border-surface-800">
            <GCardContent className="text-center space-y-3">
              <div className="text-3xl">🔍</div>
              <p className="text-sm font-semibold text-white">Semester not found</p>
              <p className="text-xs text-surface-500">
                This semester may have been removed or the link is out of date.
              </p>
              <GButton variant="secondary" onClick={() => navigate('dashboard')}>
                Back
              </GButton>
            </GCardContent>
          </GCard>
        </div>
      </div>
    );
  }

  const headerTitle = fee.name || fee.semester?.semesterName || 'Semester';

  return (
    <div className="min-h-screen pb-8" style={{ background: '#09090f' }}>
      <div className="max-w-md mx-auto min-h-screen pb-8" style={{ background: '#09090f' }}>
        {/* ── HEADER ── */}
        <header
          className="sticky top-0 z-30 backdrop-blur-sm"
          style={{ background: 'rgba(9,9,15,.95)', borderBottom: '1px solid #1e293b' }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => goBack()}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-800 transition"
              aria-label="Back"
            >
              <ArrowLeft size={20} className="text-surface-300" />
            </button>
            <h1 className="text-lg font-semibold text-white truncate">{headerTitle}</h1>
          </div>
        </header>

        <main className="px-4 py-4 space-y-4">
          {/* ════════ (b) SEMESTER SETTINGS CARD ════════ */}
          <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⚙️</span>
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-surface-500">
                    Semester Settings
                  </p>
                  <p className="text-sm font-semibold text-primary-300">
                    {profile.waiverPercent > 0
                      ? `${profile.waiverPercent}% waiver · ${planLabelFor(profile.installmentPreference)}`
                      : `${planLabelFor(profile.installmentPreference)} · billed on the ${dayOrdinal(profile.billingDay)}`}
                  </p>
                  <p className="text-[10px] text-surface-500 mt-0.5">
                    Applies to {eligibleCount}/{totalTypes} fee types
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary-300 bg-primary-500/10 border border-primary-500/30 hover:bg-primary-500/20 transition"
              >
                Edit
              </button>
            </div>

            {/* profile grid */}
            <div className="grid grid-cols-2 gap-px bg-surface-800">
              <div className="bg-surface-900 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-0.5">Waiver</p>
                <p className="text-sm font-semibold text-white">
                  {profile.waiverPercent > 0 ? `${profile.waiverPercent}%` : 'None'}
                </p>
              </div>
              <div className="bg-surface-900 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-0.5">Billing Day</p>
                <p className="text-sm font-semibold text-white">{dayOrdinal(profile.billingDay)} of every month</p>
              </div>
              <div className="bg-surface-900 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-0.5">Plan</p>
                <p className="text-sm font-semibold text-white">{planLabelFor(profile.installmentPreference)}</p>
              </div>
              <div className="bg-surface-900 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-0.5">Eligible Types</p>
                <p className="text-sm font-semibold text-white">
                  {eligibleCount} of {totalTypes}
                </p>
              </div>
            </div>

            {/* summary rows */}
            <div className="px-4 py-3 border-t border-surface-800 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-400">Original Cost</span>
                <span className="text-white">{fmt(totals.original)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-400">Eligible for Waiver</span>
                <span className="text-surface-300">{fmt(totals.eligibleOriginal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-400">
                    Discount <span className="text-surface-500">({profile.waiverPercent}%)</span>
                  </span>
                  <span className="text-rose-300">-{fmt(totals.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-surface-800">
                <span className="text-primary-300 font-semibold">Final Payable</span>
                <span className="text-xl font-bold text-white">{fmt(totals.finalNet)}</span>
              </div>
            </div>

            {/* paid progress */}
            <div className="px-4 py-3 border-t border-surface-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] uppercase tracking-wide font-semibold text-surface-500">Paid</span>
                <span className="text-xs font-medium text-emerald-400">
                  {fmt(totals.paid)} of {fmt(totals.finalNet)} ({totals.pct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-surface-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${totals.pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-surface-500">
                <span>
                  Remaining: <span className="text-white">{fmt(totals.remaining)}</span>
                </span>
                <span>
                  <span className="text-white">{totals.installmentsPaid}</span>/
                  <span className="text-white">{totals.installmentsTotal}</span> installments
                </span>
              </div>
            </div>
          </div>

          {/* ════════ (c) NEXT PAYMENT ════════ */}
          {next && (
            <div className="rounded-2xl border border-primary-500/30 bg-primary-500/[0.08] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-primary-300">Next Payment</p>
                <NextStatusPill days={next.days} />
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{next.feeIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {next.feeLabel} · Installment #{next.part}/{next.total}
                  </p>
                  <p className="text-xs text-primary-200 mt-0.5">
                    {next.dueDate ? `Reminder: ${fmtFullDate(next.dueDate)} · ${relativeDue(next.dueDate)}` : 'No due date set'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{fmt(next.amount)}</p>
                  <NextStatusText days={next.days} dueDate={next.dueDate} />
                </div>
              </div>
            </div>
          )}

          {/* ════════ (d) UPCOMING SCHEDULE ════════ */}
          {(overdueRows.length > 0 || upcomingRows.length > 0) && (
            <div className="rounded-2xl border border-surface-800 bg-surface-900 p-4">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-surface-500 mb-3">
                Upcoming Schedule
              </p>
              {overdueRows.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {overdueRows.map((x) => (
                    <div
                      key={x.instId}
                      className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2"
                    >
                      <span className="text-[10px] font-semibold text-rose-300 shrink-0">
                        {Math.abs(x.days)}d late
                      </span>
                      <span className="text-base">{x.feeIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{x.feeLabel}</p>
                        <p className="text-[10px] text-rose-300/80">{fmtShortDate(x.dueDate)}</p>
                      </div>
                      <p className="text-sm font-semibold text-rose-300">{fmt(x.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
              {upcomingRows.length > 0 && (
                <div className="space-y-1.5">
                  {upcomingRows.map((x) => (
                    <div
                      key={x.instId}
                      className="flex items-center gap-2 rounded-lg border border-surface-800 bg-surface-950/40 px-3 py-2"
                    >
                      <span className="text-[10px] font-semibold text-surface-400 shrink-0">
                        {x.days === 0 ? 'Today' : `in ${x.days}d`}
                      </span>
                      <span className="text-base">{x.feeIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{x.feeLabel}</p>
                        <p className="text-[10px] text-surface-500">{fmtShortDate(x.dueDate)}</p>
                      </div>
                      <p className="text-sm font-semibold text-white">{fmt(x.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════ (e) FEES LIST ════════ */}
          <h2 className="text-sm font-semibold text-white mt-2">Fees in this Semester</h2>
          {fees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-800 p-6 text-center">
              <div className="text-3xl mb-2">🎓</div>
              <p className="text-sm text-surface-400">No fees yet</p>
              <p className="text-xs text-surface-500 mt-1">
                Every fee type supports installment plans — even Hostel, Club, Transport, and Materials
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {fees.map((f) => (
                <FeeRow
                  key={f.id}
                  fee={f}
                  fmt={fmt}
                  profile={profile}
                  expanded={expandedFeeId === f.id}
                  onToggleExpand={() => setExpandedFeeId(expandedFeeId === f.id ? null : f.id)}
                  onToggleInstallment={(instId) => toggleInstallment(f.id, instId)}
                  onRePlan={() => handleRePlan(f.id)}
                  onDelete={() => handleDeleteFee(f.id)}
                />
              ))}
            </div>
          )}

          {/* ════════ (f) ADD FEE PANEL ════════ */}
          <div className="rounded-2xl border border-surface-800 bg-surface-900 p-4 mt-2">
            <p className="text-sm font-semibold text-white mb-3">Add Fee</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {CORE_FEE_TYPES.map((t) => (
                <FeeChip key={t} type={t} onClick={() => setAddType(t)} />
              ))}
            </div>
            <button
              onClick={() => setMoreFeeOpen((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-surface-400 hover:text-white bg-surface-950/50 hover:bg-surface-800 border border-dashed border-surface-700 transition"
            >
              <span>{moreFeeOpen ? 'Hide more types' : 'More fee types'}</span>
              {moreFeeOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {moreFeeOpen && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {MORE_FEE_TYPES.map((t) => (
                  <FeeChip
                    key={t}
                    type={t}
                    className={t === 'study_materials' ? 'col-span-3' : ''}
                    onClick={() => setAddType(t)}
                  />
                ))}
              </div>
            )}
            <FeeChip type="custom" className="w-full mt-2" onClick={() => setAddType('custom')} />
            <p className="text-[10px] text-surface-600 mt-3 leading-relaxed">
              Every fee supports Full / 2× / 3× / 4× / Custom installments · Amounts are stored AFTER waiver so
              receipts never drift
            </p>
          </div>

          {/* ════════ (g) SEMESTER SUMMARY ════════ */}
          <div className="rounded-2xl border border-surface-800 bg-surface-900 p-4">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-surface-500 mb-3">Semester Summary</p>
            <dl className="grid grid-cols-2 gap-3 text-sm mb-3 pb-3 border-b border-surface-800">
              <div>
                <dt className="text-xs text-surface-500">Waiver</dt>
                <dd className="text-sm font-semibold text-white mt-0.5">
                  {profile.waiverPercent > 0 ? `${profile.waiverPercent}%` : 'None'}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-xs text-surface-500">Billing Day</dt>
                <dd className="text-sm font-semibold text-white mt-0.5">{dayOrdinal(profile.billingDay)}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Payment Plan</dt>
                <dd className="text-sm font-semibold text-white mt-0.5">
                  {planLabelFor(profile.installmentPreference)}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-xs text-surface-500">Installments Left</dt>
                <dd className="text-sm font-semibold text-white mt-0.5">{totals.installmentsLeft}</dd>
              </div>
            </dl>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-surface-500">Total Original Cost</dt>
                <dd className="text-base font-semibold text-white mt-0.5">{fmt(totals.original)}</dd>
              </div>
              <div className="text-right">
                <dt className="text-xs text-surface-500">Total Waiver</dt>
                <dd className="text-base font-semibold text-rose-300 mt-0.5">{fmt(totals.discount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Total Paid</dt>
                <dd className="text-base font-semibold text-emerald-400 mt-0.5">{fmt(totals.paid)}</dd>
              </div>
              <div className="text-right">
                <dt className="text-xs text-surface-500">Total Remaining</dt>
                <dd className="text-base font-semibold text-amber-300 mt-0.5">{fmt(totals.remaining)}</dd>
              </div>
            </dl>
          </div>
        </main>
      </div>

      {/* ── ADD FEE SHEET ── */}
      {addType && (
        <FeePlanSheet
          isOpen
          onClose={() => setAddType(null)}
          feeType={addType}
          profile={profile}
          currency={currency}
          onManageWaiver={() => {
            setAddType(null);
            setSettingsOpen(true);
          }}
          onSubmit={(uFee) => {
            persist([...fees, uFee]);
            setAddType(null);
            addToast('Fee added', 'success');
          }}
        />
      )}

      {/* ── SETTINGS SHEET ── */}
      {settingsOpen && (
        <SemesterSettingsSheet
          isOpen
          onClose={() => setSettingsOpen(false)}
          profile={profile}
          fees={fees}
          currency={currency}
          onSave={(newProfile) => {
            const replanned = fees.map((f) => rePlanUnpaid(f, newProfile));
            persist(replanned, newProfile);
            setSettingsOpen(false);
            addToast('Settings saved', 'success');
          }}
        />
      )}
    </div>
  );
}

/* ── Next-payment status pill (header) ── */
function NextStatusPill({ days }) {
  if (days == null) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-200">
        Upcoming
      </span>
    );
  }
  if (days < 0)
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">Overdue</span>
    );
  if (days === 0)
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">Today</span>
    );
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-200">
      Upcoming
    </span>
  );
}

function NextStatusText({ days, dueDate }) {
  if (!dueDate) return <p className="text-[10px] text-surface-400 mt-0.5">No due date</p>;
  return <p className="text-[10px] text-surface-400 mt-0.5">{relativeDue(dueDate)}</p>;
}

/* ── Add-fee chip ── */
function FeeChip({ type, className = '', onClick }) {
  const info = feeTypeInfo(type);
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border border-surface-700 bg-surface-800 text-white text-xs flex items-center justify-center gap-1.5 transition hover:border-primary-500 active:scale-[0.96] ${className}`}
    >
      <span>{info.icon}</span>
      <span>{info.label}</span>
    </button>
  );
}

/* ── Fee row (expandable, with installments) ── */
function FeeRow({ fee, fmt, profile, expanded, onToggleExpand, onToggleInstallment, onRePlan, onDelete }) {
  const status = feeStatus(fee);
  const insts = fee.installments || [];
  const paidCount = insts.filter((i) => i.paid).length;
  const original = Number(fee.originalAmount) || 0;
  const hasDiscount = original > (Number(fee.amount) || 0) + 0.0001;
  const drift = driftPaisa(fee, profile);
  // Only surface drift when there are UNPAID installments to re-plan — a
  // fully-paid fee can't be re-planned, so a residual drift there is not actionable.
  const hasDrift = drift !== 0 && insts.some((i) => !i.paid);

  let subLabel = '';
  if (fee.type === 'tuition' && fee.breakdown) {
    subLabel = `${fee.breakdown.credits} credits × ${fmt(fee.breakdown.creditPrice)}/credit`;
  } else if (fee.note) {
    subLabel = fee.note;
  }

  return (
    <div className="rounded-xl border border-surface-800 bg-surface-900 overflow-hidden">
      {/* top */}
      <div className="flex items-start gap-3 p-3">
        <span className="text-base mt-0.5">{fee.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white truncate">{fee.label}</p>
            <StatusPill status={status} />
          </div>
          {subLabel && <p className="text-[10px] text-surface-500 truncate mt-0.5">{subLabel}</p>}
          <p className="text-[10px] text-surface-500 mt-0.5">
            Installments: {paidCount}/{insts.length} paid
          </p>
          {hasDrift && (
            <p className="text-[10px] text-amber-400 mt-0.5">
              ⚠ Installments out of sync ({fmt(Math.abs(drift) / 100)} drift) — tap Re-plan below
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          {hasDiscount ? (
            <>
              <p className="text-[10px] line-through text-surface-600">{fmt(original)}</p>
              <p className="text-sm font-semibold text-primary-300">{fmt(fee.amount)}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-white">{fmt(fee.amount)}</p>
          )}
        </div>
      </div>

      {/* toggle */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-center gap-1 py-1.5 border-t border-surface-800 text-[10px] text-surface-500 hover:text-surface-300 transition"
      >
        {expanded ? (
          <>
            Hide installments <ChevronUp size={10} />
          </>
        ) : (
          <>
            View installment schedule <ChevronDown size={10} />
          </>
        )}
      </button>

      {/* expanded body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-800 px-3 py-3 space-y-2 bg-surface-950/40">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-surface-500">
                  Installment Schedule
                </p>
                {hasDrift && (
                  <button onClick={onRePlan} className="text-[10px] text-amber-300 hover:text-amber-200">
                    Re-plan
                  </button>
                )}
              </div>

              {insts.length === 0 && (
                <p className="text-xs text-surface-500 italic">No installments.</p>
              )}

              {insts.map((inst, idx) => {
                const isOverdue = !inst.paid && inst.dueDate && daysFromNow(inst.dueDate) < 0;
                return (
                  <div
                    key={inst.id}
                    className={`rounded-lg border p-2.5 ${
                      inst.paid
                        ? 'border-emerald-800/30 bg-emerald-900/10'
                        : isOverdue
                        ? 'border-rose-800/30 bg-rose-900/10'
                        : 'border-surface-800 bg-surface-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => onToggleInstallment(inst.id)}
                        className="shrink-0"
                        aria-label="Toggle paid"
                      >
                        {inst.paid ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check size={12} className="text-white" strokeWidth={3} />
                          </div>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-full border-2 ${
                              isOverdue ? 'border-rose-500' : 'border-surface-600'
                            }`}
                          />
                        )}
                      </button>
                      <span
                        className={`text-[10px] font-semibold shrink-0 ${
                          inst.paid ? 'text-emerald-300' : 'text-surface-400'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-surface-300">
                          {inst.dueDate ? fmtShortDate(inst.dueDate) : 'No due date'}
                        </p>
                        {inst.paid ? (
                          <p className="text-[10px] text-emerald-400 mt-0.5">
                            Paid on {fmtShortDate(inst.paidDate)}
                          </p>
                        ) : isOverdue ? (
                          <p className="text-[10px] text-rose-400 mt-0.5">
                            {Math.abs(daysFromNow(inst.dueDate))}d overdue
                          </p>
                        ) : null}
                      </div>
                      <span className="text-sm font-semibold text-white text-right">{fmt(inst.amount)}</span>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-surface-500">
                  {fee.waiverEligible ? '🎓 Waiver-eligible' : '🚫 Not waiver-eligible'}
                </span>
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 transition"
                >
                  <X size={11} /> Remove fee
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SemesterDetailUniversal;
