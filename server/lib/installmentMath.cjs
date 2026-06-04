/**
 * Pure installment math — no DB. NET convention: all amounts are post-waiver paisa.
 */

// Split `total` into `n` paisa-exact parts; remainder lands on the FIRST part
// (matches the semester engine's existing convention).
function splitEqual(total, n) {
  if (!Number.isInteger(n) || n < 1) return [];
  const t = Math.max(0, Math.round(total || 0));
  const base = Math.floor(t / n);
  const rem = t - base * n;
  const out = new Array(n).fill(base);
  out[0] += rem;
  return out;
}

/**
 * Plan how to rebalance UNPAID installments to the new netMinor after a fee or
 * waiver change. Obligations flagged `customAmount` are PRESERVED (never returned),
 * so hand-edited amounts survive. The remainder of what's owed is split evenly
 * across the non-custom ("auto") unpaid obligations, remainder on the earliest.
 *
 * NOTE: with `customAmount` defaulting to false, every existing installment is
 * "auto", so this reproduces the previous even-split behavior exactly — the
 * preservation only changes anything once a row is explicitly flagged custom.
 *
 * @param {number} netMinor    post-waiver total owed for the tracker
 * @param {number} alreadyPaid sum of posted payments on the tracker
 * @param {Array}  unpaid      unpaid obligations sorted by dueDate asc,
 *                             each { id, amountMinor, customAmount }
 * @returns {Array} { id, amountMinor } updates for the auto obligations only
 */
function planRedistribution(netMinor, alreadyPaid, unpaid) {
  if (!Array.isArray(unpaid) || unpaid.length === 0) return [];
  const remainingDue = Math.max(0, (netMinor || 0) - (alreadyPaid || 0));
  const custom = unpaid.filter((o) => o && o.customAmount);
  const auto = unpaid.filter((o) => o && !o.customAmount);
  if (auto.length === 0) return []; // all hand-edited — leave them as set
  const customSum = custom.reduce((s, o) => s + (o.amountMinor || 0), 0);
  const toDistribute = Math.max(0, remainingDue - customSum);
  const parts = splitEqual(toDistribute, auto.length);
  return auto.map((o, i) => ({ id: o.id, amountMinor: parts[i] }));
}

module.exports = { splitEqual, planRedistribution };
