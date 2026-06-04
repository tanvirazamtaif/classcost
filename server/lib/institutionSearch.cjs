/**
 * Pure institution-search ranking — no DB, no I/O, fully unit-testable.
 *
 * Three lanes (best wins), per the Institution Data Center design:
 *   1. exact alias / name match
 *   2. prefix / substring (name + aliases)
 *   3. fuzzy (token Levenshtein ≤ 2)
 * Bengali matches via nameBn substring. Small boosts for verified trust + district.
 */

function normalize(s) {
  return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Classic Levenshtein distance, capped early for speed.
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Score one institution against a normalized query.
 * Returns a number in [0, ~1.2]; 0 means no match.
 */
function scoreInstitution(inst, q, opts = {}) {
  if (!q || !inst || typeof inst !== 'object') return 0;
  const name = normalize(inst.name);
  const aliases = (inst.aliases || []).map(normalize);
  const nameBn = String(inst.nameBn || '');
  const rawQuery = opts.rawQuery || q;

  let base = 0;

  // Lane 1 — exact
  if (name === q || aliases.includes(q)) base = 1.0;
  // Lane 2 — prefix / substring
  else if (name.startsWith(q)) base = 0.8;
  else if (aliases.some((a) => a.startsWith(q))) base = 0.7;
  else if (nameBn && rawQuery && nameBn.includes(rawQuery)) base = 0.7; // Bengali substring
  else if (name.includes(q)) base = 0.6;
  else if (aliases.some((a) => a.includes(q))) base = 0.5;
  else {
    // Lane 3 — fuzzy over name tokens
    const tokens = name.split(' ');
    const best = tokens.reduce((m, t) => Math.min(m, levenshtein(t, q)), Infinity);
    if (q.length >= 4 && best <= 2) base = 0.4;
  }

  if (base === 0) return 0;

  // Small, deterministic boosts.
  let boost = 0;
  if (inst.trustLevel === 'verified') boost += 0.05;
  if (opts.district && normalize(inst.district) === normalize(opts.district)) boost += 0.1;

  return base + boost;
}

/**
 * Rank a list of institutions for a query. Pure; safe to unit-test.
 * @returns array of { ...inst, _score } sorted desc, score>0, capped at limit.
 */
function rankInstitutions(list, query, opts = {}) {
  const q = normalize(query);
  const limit = opts.limit || 8;
  if (!q) return [];
  const scored = [];
  for (const inst of list || []) {
    const score = scoreInstitution(inst, q, { ...opts, rawQuery: String(query || '').trim() });
    if (score > 0) scored.push({ ...inst, _score: score });
  }
  scored.sort((a, b) => b._score - a._score || String(a.name).localeCompare(String(b.name)));
  return scored.slice(0, limit);
}

module.exports = { rankInstitutions, scoreInstitution, levenshtein, normalize };
