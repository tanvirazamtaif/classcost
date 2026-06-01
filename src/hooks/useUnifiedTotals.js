import { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { useEducationFees } from '../contexts/EducationFeeContext';

/**
 * useUnifiedTotals
 * ----------------
 * Single source of truth for dashboard totals. Merges three parallel data
 * sources so a payment recorded ANYWHERE in the app reflects on the dashboard
 * immediately:
 *
 *   1. V3 ledger entries  (V3Context.scopedTotals)        — recordPayment(), V3
 *   2. V1 expenses        (AppContext.expenses)           — addExpense(), V1
 *   3. V1 semester pays   (AppContext.semesters[].payments) — semester engine
 *   4. V1 education fees  (EducationFeeContext.fees)      — Add Fee buttons
 *
 * Returns the same shape as V3Context.scopedTotals so it's a drop-in:
 *
 *   {
 *     lifetime:  { total, byCategory: { education, transport, ... } },
 *     thisMonth: { total, byCategory: {...} },
 *     lastMonth: { total, byCategory: {...} },
 *     thisYear:  { total, byCategory: {...} },
 *   }
 *
 * All amounts are in MINOR UNITS (cents/paisa) so the dashboard's existing
 * `/100` division at render time still works.
 */

// V1 expense `type` → V3 display category
const V1_TYPE_MAP = {
  // education
  education: 'education', tuition: 'education', exam: 'education',
  exam_fee: 'education', semester_fee: 'education', lab_fee: 'education',
  admission_fee: 'education', library_fee: 'education', uniform: 'education',
  coaching: 'education', coaching_monthly: 'education', batch_fee: 'education',
  batch: 'education', tutor: 'education', private_tutor: 'education',
  // transport
  transport: 'transport',
  // food
  canteen: 'food', food: 'food', tiffin: 'food',
  // residence / housing
  hostel: 'residence', residence: 'residence', rent: 'residence',
  mess_fee: 'residence', mess: 'residence', utilities: 'residence',
  // materials
  books: 'materials', stationery: 'materials', materials: 'materials',
  // other
  other: 'other', medical: 'other', internet: 'other',
};

const emptyBucket = () => ({ total: 0, byCategory: {} });

function getScopeRanges() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
  const thisYearStart = new Date(now.getFullYear(), 0, 1).getTime();
  const thisYearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
  return { thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd, thisYearStart, thisYearEnd };
}

/**
 * Add one tx into the right scoped buckets.
 * @param buckets  the {lifetime, thisMonth, lastMonth, thisYear} object
 * @param ranges   precomputed scope timestamps
 * @param minor    amount in minor units (cents)
 * @param category display category id (e.g. 'education')
 * @param dateStr  ISO date string or anything Date can parse
 */
function recordTx(buckets, ranges, minor, category, dateStr) {
  if (!minor || minor <= 0) return;
  const t = dateStr ? new Date(dateStr).getTime() : Date.now();
  if (Number.isNaN(t)) return;

  const scopes = ['lifetime'];
  if (t >= ranges.thisMonthStart && t <= ranges.thisMonthEnd) scopes.push('thisMonth');
  if (t >= ranges.lastMonthStart && t <= ranges.lastMonthEnd) scopes.push('lastMonth');
  if (t >= ranges.thisYearStart && t <= ranges.thisYearEnd) scopes.push('thisYear');

  for (const scope of scopes) {
    buckets[scope].total += minor;
    buckets[scope].byCategory[category] = (buckets[scope].byCategory[category] || 0) + minor;
  }
}

export function useUnifiedTotals() {
  const { expenses, semesters } = useApp();
  const { scopedTotals: v3Totals } = useV3();
  // EducationFeeContext is the V1 fee store; safe to call — it's mounted in
  // App.jsx provider stack above V3Provider, so this hook can run in any
  // dashboard component.
  let fees = [];
  try {
    const efc = useEducationFees();
    fees = efc?.fees || [];
  } catch {
    // EducationFeeContext not mounted (shouldn't happen in normal use)
    fees = [];
  }

  return useMemo(() => {
    const ranges = getScopeRanges();
    const all = {
      lifetime: emptyBucket(),
      thisMonth: emptyBucket(),
      lastMonth: emptyBucket(),
      thisYear: emptyBucket(),
    };


    // ─── 1. Start with V3 totals (already in cents, already scoped) ───
    for (const scope of Object.keys(all)) {
      const src = v3Totals?.[scope];
      if (!src) continue;
      all[scope].total += src.total || 0;
      for (const [cat, amt] of Object.entries(src.byCategory || {})) {
        all[scope].byCategory[cat] = (all[scope].byCategory[cat] || 0) + amt;
      }
    }

    // ─── 2. V1 expenses (Float BDT → multiply ×100) ───
    for (const exp of (expenses || [])) {
      const minor = Math.round((Number(exp.amount) || 0) * 100);
      const cat = V1_TYPE_MAP[exp.type] || V1_TYPE_MAP[exp.category] || 'other';
      recordTx(all, ranges, minor, cat, exp.date || exp.createdAt);
    }

    // ─── 3. V1 semester payments — every semester.payments[] entry ───
    for (const sem of (semesters || [])) {
      for (const pay of (sem.payments || [])) {
        const minor = Math.round((Number(pay.amount) || 0) * 100);
        recordTx(all, ranges, minor, 'education', pay.date || pay.paidDate);
      }
      // some semesters use installments[].paidAmount instead of separate payments
      for (const inst of (sem.installments || [])) {
        if (inst.status === 'PAID' || (Number(inst.paidAmount) || 0) > 0) {
          const minor = Math.round((Number(inst.paidAmount || inst.amount) || 0) * 100);
          recordTx(all, ranges, minor, 'education', inst.paidDate || inst.dueDate);
        }
      }
    }

    // ─── 4. V1 education fees (EducationFeeContext) ───
    for (const fee of (fees || [])) {
      // 4a. Direct payments array (one-time fees, semester top-level payments)
      for (const pay of (fee.payments || [])) {
        const minor = Math.round((Number(pay.amount) || 0) * 100);
        recordTx(all, ranges, minor, 'education', pay.date || pay.paidDate);
      }
      // 4b. Per-period payments (recurring monthly/yearly fees)
      const pbp = fee.paymentsByPeriod || {};
      for (const periodPays of Object.values(pbp)) {
        for (const pay of (periodPays || [])) {
          const minor = Math.round((Number(pay.amount) || 0) * 100);
          recordTx(all, ranges, minor, 'education', pay.date || pay.paidDate);
        }
      }
      // 4c. Installments (semester fees split into multiple due dates)
      for (const inst of (fee.installments || [])) {
        const paid = Number(inst.paidAmount) || (
          // status === 'paid' (any case) implies the full amount was paid
          String(inst.status || '').toLowerCase() === 'paid' ? Number(inst.amount) || 0 : 0
        );
        if (paid > 0) {
          const minor = Math.round(paid * 100);
          recordTx(all, ranges, minor, 'education', inst.paidDate || inst.dueDate);
        }
      }
      // 4d. Semester containers — fee items nested under fee.semester.fees[]
      //     Each item has { amount, paidAmount, isPaid, paidAt }. This is the
      //     shape used by SemestersTab + SemesterDetailPage when a fee is
      //     added via the "+ Add Fee" UI inside a semester card. Missing this
      //     path is why dashboard showed ৳0 even after fees were marked paid.
      const semFees = fee.semester?.fees || [];
      for (const f of semFees) {
        const paid = Number(f.paidAmount) || (f.isPaid ? Number(f.amount) || 0 : 0);
        if (paid > 0) {
          const minor = Math.round(paid * 100);
          recordTx(all, ranges, minor, 'education', f.paidAt || f.paidDate || f.createdAt);
        }
      }
    }

    return all;
  }, [expenses, semesters, fees, v3Totals]);
}
