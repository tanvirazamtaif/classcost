// ═══════════════════════════════════════════════════════════════
// UNIVERSAL INSTALLMENT ENGINE
// ───────────────────────────────────────────────────────────────
// Ported from the Semester Setup mockups (payment-wizard +
// universal-installments). Pure functions only — no React, no DOM.
//
// Invariants:
//  1. All money math runs in INTEGER PAISA to avoid float drift.
//  2. Installments store POST-waiver (absolute) amounts. The waiver
//     multiplier is "baked in" at plan creation so receipts never
//     silently re-price.
//  3. Each fee snapshots `waiverPctAtCreation` so we can detect drift
//     if the semester waiver changes later.
//  4. Custom plans validate the user's sum against the FINAL payable.
// ═══════════════════════════════════════════════════════════════

// ── Fee type registry ──────────────────────────────────────────
export const FEE_TYPES = {
  tuition:         { icon: '🎓', label: 'Tuition',         eligibleDefault: true,  sheet: 'tuition' },
  lab:             { icon: '🔬', label: 'Lab Fee',         eligibleDefault: true,  sheet: 'simple' },
  dev:             { icon: '🏗️', label: 'Development Fee', eligibleDefault: true,  sheet: 'simple' },
  library:         { icon: '📚', label: 'Library Fee',     eligibleDefault: true,  sheet: 'simple' },
  exam:            { icon: '📝', label: 'Exam Fee',        eligibleDefault: false, sheet: 'simple' },
  registration:    { icon: '📋', label: 'Registration Fee',eligibleDefault: false, sheet: 'simple' },
  hostel:          { icon: '🏨', label: 'Hostel Fee',      eligibleDefault: false, sheet: 'simple' },
  club:            { icon: '🎭', label: 'Club Fee',        eligibleDefault: false, sheet: 'simple' },
  transport:       { icon: '🚌', label: 'Transport Fee',   eligibleDefault: false, sheet: 'simple' },
  study_materials: { icon: '📖', label: 'Study Materials', eligibleDefault: false, sheet: 'simple' },
  custom:          { icon: '📦', label: 'Custom Fee',      eligibleDefault: false, sheet: 'simple', editableName: true },
};

export const SCHOLARSHIP_LABELS = {
  merit: 'Merit Scholarship',
  'need-based': 'Need-Based Scholarship',
  dept: 'Department Waiver',
  'ff-quota': 'Freedom Fighter Quota',
  sibling: 'Sibling Discount',
  special: 'Special Grant',
};

export const DEFAULT_ELIGIBLE_TYPES = Object.keys(FEE_TYPES).filter(
  (k) => FEE_TYPES[k].eligibleDefault === true
);

// ── Paisa-exact money math ──────────────────────────────────────

/**
 * Split a final payable amount into N installments whose sum EXACTLY
 * equals finalAmount (to the paisa). Remainder lands on the last part.
 */
export function splitIntoInstallments(finalAmount, n) {
  if (!Number.isFinite(finalAmount) || finalAmount < 0) return [];
  if (!Number.isInteger(n) || n < 1) return [];
  const totalPaisa = Math.round(finalAmount * 100);
  const basePaisa = Math.trunc(totalPaisa / n);
  const remainderPaisa = totalPaisa - basePaisa * n;
  const out = new Array(n);
  for (let i = 0; i < n - 1; i++) out[i] = basePaisa / 100;
  out[n - 1] = (basePaisa + remainderPaisa) / 100;
  return out;
}

/** Sum amounts in paisa-space (exact). */
export function sumPaisa(arr) {
  return (arr || []).reduce((s, x) => s + Math.round((Number(x) || 0) * 100), 0);
}

/** BDT formatter — always 2 decimals so columns line up. */
export function fmt(amount) {
  const n = Number(amount) || 0;
  return '৳' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Date helpers ────────────────────────────────────────────────
export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => toISO(new Date());
export const fmtShortDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const fmtFullDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
export const daysFromNow = (iso) =>
  Math.round((new Date(iso) - new Date(todayISO())) / 86400000);

/** Anchor to a valid day-of-month if the month is shorter (31 → Feb 28/29). */
export const clampDay = (year, monthIdx, day) => {
  const last = new Date(year, monthIdx + 1, 0).getDate();
  return Math.min(day, last);
};

export const dayOrdinal = (d) => {
  const n = Number(d) || 0;
  if (n >= 11 && n <= 13) return n + 'th';
  const last = n % 10;
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[last] || 'th');
};

/** Next occurrence of `billingDay` on or after `fromIso`. */
export function nextBillingDay(billingDay, fromIso) {
  const d = new Date(fromIso || todayISO());
  const billing = billingDay || 1;
  let y = d.getFullYear(), m = d.getMonth();
  let target = new Date(y, m, clampDay(y, m, billing));
  if (target < d) {
    m += 1; if (m > 11) { m = 0; y += 1; }
    target = new Date(y, m, clampDay(y, m, billing));
  }
  return toISO(target);
}

/**
 * Generate `n` monthly billing dates, starting from the next billing
 * day. Stops past `semesterEndDate` (but always emits at least one).
 */
export function generateBillingDates(n, { billingDay = 10, fromIso, semesterEndDate } = {}) {
  const out = [];
  const start = new Date(nextBillingDay(billingDay, fromIso));
  let y = start.getFullYear(), m = start.getMonth();
  for (let i = 0; i < n; i++) {
    const d = new Date(y, m, clampDay(y, m, billingDay));
    if (semesterEndDate && i > 0 && d > new Date(semesterEndDate)) break;
    out.push(toISO(d));
    m += 1; if (m > 11) { m = 0; y += 1; }
  }
  return out;
}

/**
 * Generate `n` monthly dates anchored to an explicit first date
 * (the wizard's "first installment" flow). Subsequent dates fall on
 * the same day-of-month each following month.
 */
export function generateMonthlyFrom(firstIso, n) {
  const out = [];
  const base = new Date(firstIso || todayISO());
  const day = base.getDate();
  for (let i = 0; i < n; i++) {
    let y = base.getFullYear();
    let m = base.getMonth() + i;
    while (m > 11) { m -= 12; y += 1; }
    out.push(toISO(new Date(y, m, clampDay(y, m, day))));
  }
  return out;
}

// ── Plan labels ─────────────────────────────────────────────────
export function planLabel(p) {
  if (p === 'custom') return 'Custom';
  const n = Number(p) || 1;
  return n === 1 ? 'Full Payment' : `${n} Installments`;
}

// ── Per-fee / per-semester calculations ─────────────────────────

/**
 * Compute the live state of one fee against the current semester
 * waiver percent. Installments hold post-waiver amounts; `final` is
 * recomputed from the live waiver so we can surface drift.
 */
export function calcFee(fee, waiverPercent) {
  const original = Number(fee.originalAmount) || 0;
  const eff = fee.waiverEligible ? (Number(waiverPercent) || 0) : 0;
  const waiverAmt = original * (eff / 100);
  const final = Math.max(0, original - waiverAmt);

  const insts = fee.installments || [];
  const instSumPaisa = sumPaisa(insts.map((i) => i.amount));
  const finalPaisa = Math.round(final * 100);
  const instSum = instSumPaisa / 100;
  const driftPaisa = instSumPaisa - finalPaisa;
  const hasDrift = driftPaisa !== 0;

  const paidInst = insts.filter((i) => i.paid);
  const paidPaisa = sumPaisa(paidInst.map((i) => i.amount));
  const paid = paidPaisa / 100;
  const remaining = Math.max(0, instSum - paid);
  const pct = instSum > 0 ? Math.min(100, Math.round((paid / instSum) * 100)) : 0;

  let status = 'pending';
  if (instSum > 0 && paid >= instSum) status = 'paid';
  else if (paid > 0) status = 'partial';
  const hasOverdue = insts.some((i) => !i.paid && i.dueDate && daysFromNow(i.dueDate) < 0);
  if (status !== 'paid' && hasOverdue) status = 'overdue';

  return {
    original, waiverAmt, final, instSum, paid, remaining, pct, status,
    hasDrift, driftPaisa, paidCount: paidInst.length, totalCount: insts.length,
  };
}

/** Aggregate totals across every fee in a semester. */
export function calcTotals(fees, waiverPercent) {
  let original = 0, eligible = 0, discount = 0, final = 0, paid = 0, paidInst = 0, totalInst = 0;
  for (const f of fees || []) {
    const c = calcFee(f, waiverPercent);
    original += c.original;
    if (f.waiverEligible) eligible += c.original;
    discount += c.waiverAmt;
    final += c.instSum; // actual installment sum is what the user owes
    paid += c.paid;
    paidInst += c.paidCount;
    totalInst += c.totalCount;
  }
  return {
    original, eligible, discount, final, paid,
    remaining: Math.max(0, final - paid),
    pct: final > 0 ? Math.min(100, Math.round((paid / final) * 100)) : 0,
    paidInst, totalInst,
  };
}

/**
 * Re-plan a fee's UNPAID installments to match a new final payable.
 * Paid installments stay frozen. Returns a NEW installments array.
 */
export function replanUnpaid(installments, newFinal) {
  const insts = (installments || []).map((i) => ({ ...i }));
  const paidSum = sumPaisa(insts.filter((i) => i.paid).map((i) => i.amount)) / 100;
  const remainingFinal = Math.max(0, newFinal - paidSum);
  const unpaidIdx = insts.map((i, idx) => (!i.paid ? idx : -1)).filter((x) => x >= 0);
  if (unpaidIdx.length > 0) {
    const reSplit = splitIntoInstallments(remainingFinal, unpaidIdx.length);
    unpaidIdx.forEach((idx, k) => { insts[idx].amount = reSplit[k]; });
  }
  return insts;
}

// ── ID helpers ──────────────────────────────────────────────────
export const newFeeId = () => 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const newInstId = () => 'i_' + Math.random().toString(36).slice(2, 9);
export const newSemesterId = () => 'usem_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
