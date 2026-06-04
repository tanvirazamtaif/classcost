/**
 * Pure reporting aggregation — no DB. Reads canonical ledger rows and produces
 * scoped totals. Deduping on sourceRef makes the total robust even if a backfill
 * ever created duplicate ledger rows for the same source event.
 */

// Collapse entries that share a non-null sourceRef (keep the first).
function dedupeBySourceRef(entries) {
  const seen = new Set();
  const out = [];
  for (const e of entries || []) {
    if (!e) continue;
    if (e.sourceRef) {
      if (seen.has(e.sourceRef)) continue;
      seen.add(e.sourceRef);
    }
    out.push(e);
  }
  return out;
}

function scopeRanges(now) {
  const d = now instanceof Date ? now : new Date(now);
  return {
    thisMonthStart: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
    thisMonthEnd: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime(),
    lastMonthStart: new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(),
    lastMonthEnd: new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999).getTime(),
    thisYearStart: new Date(d.getFullYear(), 0, 1).getTime(),
    thisYearEnd: new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999).getTime(),
  };
}

const emptyBucket = () => ({ total: 0, byCategory: {} });

/**
 * Aggregate POSTED debit ledger rows into scoped buckets.
 * @param entries [{ amountMinor, category, date, sourceRef? }]
 * @param now     reference Date for scope windows
 */
function aggregateLedger(entries, now) {
  const ranges = scopeRanges(now || new Date());
  const buckets = {
    lifetime: emptyBucket(),
    thisMonth: emptyBucket(),
    lastMonth: emptyBucket(),
    thisYear: emptyBucket(),
  };
  for (const e of dedupeBySourceRef(entries)) {
    const minor = Number(e.amountMinor) || 0;
    if (minor <= 0) continue;
    const t = e.date ? new Date(e.date).getTime() : NaN;
    if (Number.isNaN(t)) continue;
    const cat = e.category || 'other';
    const scopes = ['lifetime'];
    if (t >= ranges.thisMonthStart && t <= ranges.thisMonthEnd) scopes.push('thisMonth');
    if (t >= ranges.lastMonthStart && t <= ranges.lastMonthEnd) scopes.push('lastMonth');
    if (t >= ranges.thisYearStart && t <= ranges.thisYearEnd) scopes.push('thisYear');
    for (const s of scopes) {
      buckets[s].total += minor;
      buckets[s].byCategory[cat] = (buckets[s].byCategory[cat] || 0) + minor;
    }
  }
  return buckets;
}

// Mean + sample stdev of a numeric array (paisa). Returns { mean, stdev }.
function meanStdev(values) {
  const xs = (values || []).map((v) => Number(v) || 0);
  if (xs.length === 0) return { mean: 0, stdev: 0 };
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  if (xs.length < 2) return { mean, stdev: 0 };
  const variance = xs.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (xs.length - 1);
  return { mean, stdev: Math.sqrt(variance) };
}

module.exports = { dedupeBySourceRef, scopeRanges, aggregateLedger, meanStdev };
