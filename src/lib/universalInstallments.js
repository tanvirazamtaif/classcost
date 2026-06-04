/**
 * Universal Installment System — financial core (pure, no React/context).
 *
 * This is the deterministic heart of the redesigned semester system. All money
 * math runs through integer PAISA in-memory to avoid float drift, but values
 * are PERSISTED as whole-BDT numbers (2-dp) for back-compat with every existing
 * reader (useUnifiedTotals, the AI assistant's feeAmount, SemesterDetailPage).
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ FROZEN PERSISTENCE CONTRACT (a "semester" is one EducationFeeContext fee  │
 * │ with feeType:'semester_container'). DO NOT rename these fields — the AI   │
 * │ assistant + dashboard totals + legacy readers depend on them.            │
 * │                                                                          │
 * │ fee = {                                                                  │
 * │   id, feeType:'semester_container', name:'<Inst> · <Term>',              │
 * │   amount: <netTotal BDT>,            // = sum(semester.fees[].amount)     │
 * │   institutionName, institutionType, // for institution-page filtering    │
 * │   semester: {                                                            │
 * │     semesterName:'<Term>',          // legacy display field (kept)        │
 * │     totalAmount: <netTotal BDT>,    // = fee.amount (AI reads this)       │
 * │     entityId: <id|null>,            // for EntityDetailV3 filtering       │
 * │     profile: SemesterProfile,                                            │
 * │     fees: UFee[],                   // the universal fee list             │
 * │   },                                                                     │
 * │ }                                                                        │
 * │                                                                          │
 * │ SemesterProfile = { waiverPercent:0..100, scholarshipType:string|null,   │
 * │   billingDay:1..28, installmentPreference:1|2|3|4|'custom',              │
 * │   semesterEndDate:''|ISO, eligibleFeeTypes:string[] (array, serializable) │
 * │ }                                                                        │
 * │                                                                          │
 * │ UFee = { id, type, label, icon, note:'',                                 │
 * │   originalAmount:<BDT pre-waiver>, amount:<BDT net = Σ installments>,     │
 * │   waiverEligible:bool, waiverPctAtCreation:number,                       │
 * │   breakdown:{creditPrice,credits}|null,                                  │
 * │   installments: UInstallment[],                                          │
 * │   // back-compat rollup, maintained on every mutation:                   │
 * │   paidAmount:<BDT>, isPaid:bool, paidAt:ISO|null, addedAt:ISO }          │
 * │                                                                          │
 * │ UInstallment = { id, amount:<BDT net>, dueDate:''|ISO,                    │
 * │   paid:bool, paidDate:null|ISO }                                         │
 * │                                                                          │
 * │ INVARIANTS (always true after any mutation):                             │
 * │  • Σ installments[].amount === fee.amount (to the paisa)                 │
 * │  • fee.paidAmount === Σ (installments where paid).amount                 │
 * │  • semester.fees Σ amount === semester.totalAmount === top-level         │
 * │    container fee.amount  (keeps AI + dashboard totals correct)            │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ── Paisa-safe money ─────────────────────────────────────────────────────────
export const toPaisa = (bdt) => Math.round((Number(bdt) || 0) * 100);
export const fromPaisa = (p) => p / 100;
// Sum a list of BDT amounts without float drift; returns BDT.
export const sumBdt = (amounts) => fromPaisa(amounts.reduce((s, a) => s + toPaisa(a), 0));

/**
 * Split a final (post-waiver) BDT amount into n equal installments, paisa-exact.
 * The remainder lands on the LAST installment so the sum equals `final` exactly.
 */
export function splitIntoInstallments(finalBdt, n) {
  const count = Math.max(1, Math.floor(n) || 1);
  const totalP = toPaisa(finalBdt);
  const base = Math.trunc(totalP / count);
  const remainder = totalP - base * count;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(fromPaisa(base + (i === count - 1 ? remainder : 0)));
  }
  return out;
}

// ── Waiver math (post-waiver NET, paisa-exact) ───────────────────────────────
// finalPayable for a fee given current eligibility + semester waiver %.
export function finalPayable(originalAmount, eligible, waiverPct) {
  const origP = toPaisa(originalAmount);
  if (!eligible || !waiverPct) return fromPaisa(origP);
  const netP = Math.round(origP * (1 - (Number(waiverPct) || 0) / 100));
  return fromPaisa(netP);
}
export function waiverAmount(originalAmount, eligible, waiverPct) {
  return fromPaisa(toPaisa(originalAmount) - toPaisa(finalPayable(originalAmount, eligible, waiverPct)));
}

// ── Dates ────────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const daysInMonth = (year, monthIdx) => new Date(year, monthIdx + 1, 0).getDate();
export const clampDay = (year, monthIdx, day) => Math.min(Math.max(1, day), daysInMonth(year, monthIdx));

/** ISO date of the next occurrence of `billingDay` (1-28) on/after `from` (Date). */
export function nextBillingDay(billingDay, from = new Date()) {
  const day = Math.min(Math.max(1, Number(billingDay) || 1), 28);
  let year = from.getFullYear();
  let monthIdx = from.getMonth();
  const candidateDay = clampDay(year, monthIdx, day);
  if (from.getDate() > candidateDay) {
    monthIdx += 1;
    if (monthIdx > 11) { monthIdx = 0; year += 1; }
  }
  return `${year}-${pad(monthIdx + 1)}-${pad(clampDay(year, monthIdx, day))}`;
}

/** n monthly ISO dates anchored to billingDay, starting at the next occurrence. */
export function generateBillingDates(n, billingDay, from = new Date()) {
  const count = Math.max(1, Math.floor(n) || 1);
  const first = nextBillingDay(billingDay, from);
  const [fy, fm] = first.split('-').map(Number);
  const day = Math.min(Math.max(1, Number(billingDay) || 1), 28);
  const dates = [];
  for (let i = 0; i < count; i += 1) {
    let monthIdx = fm - 1 + i;
    let year = fy + Math.floor(monthIdx / 12);
    monthIdx %= 12;
    dates.push(`${year}-${pad(monthIdx + 1)}-${pad(clampDay(year, monthIdx, day))}`);
  }
  return dates;
}

export function daysFromNow(isoDate) {
  if (!isoDate) return null;
  const due = new Date(isoDate + 'T00:00:00');
  const now = new Date(todayISO() + 'T00:00:00');
  return Math.round((due - now) / 86400000);
}

// ── IDs ──────────────────────────────────────────────────────────────────────
export const genId = (prefix = 'x') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ── Installment builders ─────────────────────────────────────────────────────
const mkInst = (amount, dueDate) => ({ id: genId('i'), amount, dueDate: dueDate || '', paid: false, paidDate: null });

/**
 * Build installments for a final (post-waiver) amount.
 * plan: 1 | 2 | 3 | 4 | 'custom'. For 'custom', pass customRows [{amount,dueDate}].
 */
export function buildInstallments(finalBdt, plan, { billingDay = 10, from = new Date(), customRows } = {}) {
  if (plan === 'custom' && Array.isArray(customRows) && customRows.length) {
    return customRows.map((r) => mkInst(Number(r.amount) || 0, r.dueDate || ''));
  }
  const n = plan === 'custom' ? Math.max(1, (customRows || []).length || 1) : Math.max(1, Number(plan) || 1);
  const amounts = splitIntoInstallments(finalBdt, n);
  const dates = generateBillingDates(n, billingDay, from);
  return amounts.map((amount, i) => mkInst(amount, dates[i]));
}

/** ISO date n months after `iso`, keeping day-of-month (clamped to month length). */
export function addMonthsToISO(iso, n) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  let monthIdx = (m - 1) + n;
  const year = y + Math.floor(monthIdx / 12);
  monthIdx = ((monthIdx % 12) + 12) % 12;
  return `${year}-${pad(monthIdx + 1)}-${pad(clampDay(year, monthIdx, d))}`;
}

/**
 * Wizard schedule: installment #1 uses (firstAmount, firstDate); the remaining
 * (final - first) is paisa-split across n-1 installments on the same day in the
 * following months. Used by the Payment Wizard's step-5 entry.
 */
export function buildWizardInstallments(finalBdt, n, firstAmount, firstDate) {
  const count = Math.max(1, Math.floor(n) || 1);
  if (count === 1) return [mkInst(finalBdt, firstDate)];
  const firstP = Math.min(toPaisa(firstAmount), toPaisa(finalBdt));
  const restAmounts = splitIntoInstallments(fromPaisa(toPaisa(finalBdt) - firstP), count - 1);
  const out = [mkInst(fromPaisa(firstP), firstDate)];
  for (let i = 0; i < count - 1; i += 1) {
    out.push(mkInst(restAmounts[i], firstDate ? addMonthsToISO(firstDate, i + 1) : ''));
  }
  return out;
}

// ── Rollup + status ──────────────────────────────────────────────────────────
/** Recompute a fee's back-compat rollup fields from its installments. Returns a NEW fee. */
export function recomputeFee(fee) {
  const insts = fee.installments || [];
  const amount = sumBdt(insts.map((i) => i.amount));
  const paidInsts = insts.filter((i) => i.paid);
  const paidAmount = sumBdt(paidInsts.map((i) => i.amount));
  const isPaid = insts.length > 0 && paidInsts.length === insts.length;
  const paidAt = paidInsts.reduce((latest, i) => (i.paidDate && (!latest || i.paidDate > latest) ? i.paidDate : latest), null);
  return { ...fee, amount, paidAmount, isPaid, paidAt };
}

/** Per-fee status: 'paid' | 'partial' | 'overdue' | 'pending'. */
export function feeStatus(fee) {
  const insts = fee.installments || [];
  const instSumP = toPaisa(sumBdt(insts.map((i) => i.amount)));
  const paidP = toPaisa(sumBdt(insts.filter((i) => i.paid).map((i) => i.amount)));
  const hasOverdue = insts.some((i) => !i.paid && i.dueDate && daysFromNow(i.dueDate) < 0);
  if (instSumP > 0 && paidP >= instSumP) return 'paid';
  if (hasOverdue) return 'overdue';
  if (paidP > 0) return 'partial';
  return 'pending';
}

/** Drift in paisa between stored installments and the final implied by the CURRENT semester waiver. */
export function driftPaisa(fee, profile) {
  const eligible = isEligible(fee, profile);
  const final = finalPayable(fee.originalAmount, eligible, profile?.waiverPercent || 0);
  const instSum = sumBdt((fee.installments || []).map((i) => i.amount));
  return toPaisa(instSum) - toPaisa(final);
}

export function isEligible(fee, profile) {
  const set = new Set(profile?.eligibleFeeTypes || []);
  return set.has(fee.type);
}

/**
 * Re-plan ONLY the unpaid installments of a fee to match a (possibly new) waiver.
 * Paid installments are frozen. Returns a NEW fee (rolled up). Used on settings save,
 * eligibility toggle, and manual re-plan.
 */
export function rePlanUnpaid(fee, profile) {
  const eligible = isEligible(fee, profile);
  const pct = profile?.waiverPercent || 0;
  const newFinal = finalPayable(fee.originalAmount, eligible, pct);
  const insts = fee.installments || [];
  const paid = insts.filter((i) => i.paid);
  const unpaid = insts.filter((i) => !i.paid);

  const paidSumP = toPaisa(sumBdt(paid.map((i) => i.amount)));
  const remainderP = Math.max(0, toPaisa(newFinal) - paidSumP);

  let reUnpaid;
  if (unpaid.length === 0) {
    reUnpaid = [];
  } else {
    const amounts = splitIntoInstallments(fromPaisa(remainderP), unpaid.length);
    reUnpaid = unpaid.map((inst, i) => ({ ...inst, amount: amounts[i] }));
  }
  // Preserve original order (paid + unpaid interleaving): map by id.
  const reById = new Map(reUnpaid.map((i) => [i.id, i]));
  const installments = insts.map((i) => (i.paid ? i : reById.get(i.id) || i));

  return recomputeFee({
    ...fee,
    waiverEligible: eligible,
    waiverPctAtCreation: eligible ? pct : 0,
    installments,
  });
}

// ── Semester-level aggregates ────────────────────────────────────────────────
export function semesterTotals(fees = []) {
  const original = sumBdt(fees.map((f) => f.originalAmount || 0));
  const finalNet = sumBdt(fees.map((f) => f.amount || 0));
  const paid = sumBdt(fees.map((f) => f.paidAmount || 0));
  const discount = fromPaisa(toPaisa(original) - toPaisa(finalNet));
  const remaining = fromPaisa(Math.max(0, toPaisa(finalNet) - toPaisa(paid)));
  const eligibleOriginal = sumBdt(fees.filter((f) => f.waiverEligible).map((f) => f.originalAmount || 0));
  const allInst = fees.flatMap((f) => (f.installments || []).map((i) => ({ ...i, feeLabel: f.label, feeIcon: f.icon })));
  const paidCount = allInst.filter((i) => i.paid).length;
  return {
    original, finalNet, paid, discount, remaining, eligibleOriginal,
    installmentsTotal: allInst.length, installmentsPaid: paidCount,
    installmentsLeft: allInst.length - paidCount,
    pct: toPaisa(finalNet) > 0 ? Math.min(100, Math.round((toPaisa(paid) / toPaisa(finalNet)) * 100)) : 0,
  };
}

/** Upcoming + overdue unpaid installments across all fees, sorted (overdue first, then soonest). */
export function upcomingInstallments(fees = []) {
  const rows = [];
  (fees || []).forEach((f) => {
    (f.installments || []).forEach((inst, idx) => {
      if (inst.paid) return;
      rows.push({
        feeId: f.id, feeLabel: f.label, feeIcon: f.icon,
        part: idx + 1, total: (f.installments || []).length,
        amount: inst.amount, dueDate: inst.dueDate,
        days: daysFromNow(inst.dueDate),
        overdue: inst.dueDate ? daysFromNow(inst.dueDate) < 0 : false,
        instId: inst.id,
      });
    });
  });
  return rows.sort((a, b) => {
    if (a.overdue && !b.overdue) return -1;
    if (b.overdue && !a.overdue) return 1;
    if (a.days == null) return 1;
    if (b.days == null) return -1;
    return a.days - b.days;
  });
}
