/**
 * Pure recurring-schedule materialization math — no DB, fully unit-testable.
 * NET convention: amounts are paisa. Periods are canonical strings.
 */

const { splitEqual } = require('./installmentMath.cjs');

const STEP_MONTHS = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

function pad2(n) { return String(n).padStart(2, '0'); }

// Canonical period key for a Date (month granularity for all cadences).
function periodKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

// Parse "YYYY-MM" → { year, month0 } (month0 is 0-based).
function parsePeriod(period) {
  const [y, m] = String(period).split('-').map((x) => parseInt(x, 10));
  return { year: y, month0: (m || 1) - 1 };
}

// Add n months to a "YYYY-MM" period → new "YYYY-MM".
function addMonths(period, n) {
  const { year, month0 } = parsePeriod(period);
  const total = year * 12 + month0 + n;
  const y = Math.floor(total / 12);
  const m0 = ((total % 12) + 12) % 12;
  return `${y}-${pad2(m0 + 1)}`;
}

// Clamp a day-of-month to a valid day for the given year/month0 (Feb → 28/29).
function clampDay(year, month0, day) {
  const last = new Date(year, month0 + 1, 0).getDate();
  return Math.min(day, Math.max(1, last));
}

// Due date for a period at a given billing day-of-month.
function dueDateFor(period, dueDay) {
  const { year, month0 } = parsePeriod(period);
  return new Date(year, month0, clampDay(year, month0, dueDay || 1));
}

// Compare two period strings chronologically (-1 / 0 / 1).
function comparePeriods(a, b) {
  const pa = parsePeriod(a), pb = parsePeriod(b);
  const va = pa.year * 12 + pa.month0, vb = pb.year * 12 + pb.month0;
  return va < vb ? -1 : va > vb ? 1 : 0;
}

/**
 * Plan which PaymentSlots SHOULD be created for a schedule, idempotently.
 *
 * @param {Object} schedule { cadence, dueDay, amountMinor, startDate, endDate }
 * @param {Set|Array} existingPeriods periods that already have a slot (skip them)
 * @param {Date|string} today
 * @param {number} lookaheadMonths how far ahead to materialize (default 1)
 * @returns {Array} slots to create: { period, dueDate, expectedMinor }
 *
 * Stops at endDate. Steps by cadence (1/3/12 months). Never duplicates an
 * existing period — so re-running after a partial run is a no-op for done slots.
 */
function planSlots(schedule, existingPeriods, today, lookaheadMonths = 1) {
  const have = existingPeriods instanceof Set ? existingPeriods : new Set(existingPeriods || []);
  const step = STEP_MONTHS[schedule.cadence] || 1;
  const startPeriod = periodKey(schedule.startDate);
  const horizon = addMonths(periodKey(today), lookaheadMonths);
  const endPeriod = schedule.endDate ? periodKey(schedule.endDate) : null;

  const out = [];
  let period = startPeriod;
  // Safety bound: never loop more than ~50 years of steps.
  for (let guard = 0; guard < 600; guard++) {
    if (comparePeriods(period, horizon) > 0) break;
    if (endPeriod && comparePeriods(period, endPeriod) > 0) break;
    if (!have.has(period)) {
      out.push({
        period,
        dueDate: dueDateFor(period, schedule.dueDay),
        expectedMinor: schedule.amountMinor,
      });
    }
    period = addMonths(period, step);
  }
  return out;
}

/**
 * Compute the periods + per-period amounts an advance payment covers.
 * Paisa-exact: remainder lands on the LAST covered period.
 *
 * @returns { periods: string[], perPeriod: number[], endPeriod: string }
 */
function advanceCoverage(amountMinor, monthsCovered, startPeriod, cadence = 'MONTHLY') {
  const step = STEP_MONTHS[cadence] || 1;
  const n = Math.max(1, monthsCovered | 0);
  const parts = splitEqual(amountMinor, n);
  // splitEqual puts remainder on FIRST; advance wants it on LAST → reverse the
  // remainder placement by rotating the single odd part to the end.
  const base = Math.floor(Math.max(0, Math.round(amountMinor || 0)) / n);
  const perPeriod = new Array(n).fill(base);
  const rem = Math.max(0, Math.round(amountMinor || 0)) - base * n;
  perPeriod[n - 1] += rem;
  const periods = [];
  let p = startPeriod;
  for (let i = 0; i < n; i++) {
    periods.push(p);
    p = addMonths(p, step);
  }
  return { periods, perPeriod, endPeriod: periods[periods.length - 1] };
}

module.exports = {
  periodKey, parsePeriod, addMonths, clampDay, dueDateFor, comparePeriods,
  planSlots, advanceCoverage, STEP_MONTHS,
};
