/**
 * Decomposed cost-to-graduation forecast — pure, no DB, fully unit-testable.
 *
 * Three sub-models with different statistical behavior, combined by variance-sum
 * (not naive band stacking) for a defensible ~80% band. All money in paisa.
 *
 *   1. TUITION   — tightest band; avg completed-semester net × remaining × inflation
 *   2. RESIDENCE — medium band; monthly rent × months remaining × growth
 *   3. LIFESTYLE — widest, ASYMMETRIC band; daily avg × months × inflation
 *
 * Every projection returns { medianMinor, lowMinor, highMinor }. Bands are kept
 * asymmetric through combination (lifestyle has more upside risk than downside).
 */

function round(n) { return Math.round(n); }
function clampPct(p) { return Math.max(0, Math.min(100, Number(p) || 0)); }

// ── Sub-model 1: TUITION ────────────────────────────────────────────────────
// Each remaining semester compounds ~half a year of inflation; waiver reduces it.
function projectTuition({ avgSemesterNetMinor, semestersRemaining, waiverPct = 0, inflationPct = 7.5, bandPct = 5 }) {
  const avg = Math.max(0, Number(avgSemesterNetMinor) || 0);
  const n = Math.max(0, Math.floor(semestersRemaining) || 0);
  const infl = (Number(inflationPct) || 0) / 100;
  const waiverMult = 1 - clampPct(waiverPct) / 100;
  let median = 0;
  for (let s = 1; s <= n; s++) {
    median += avg * Math.pow(1 + infl, s * 0.5) * waiverMult;
  }
  median = round(median);
  const gap = round(median * (Math.max(0, bandPct) / 100));
  return { medianMinor: median, lowMinor: median - gap, highMinor: median + gap };
}

// ── Sub-model 2: RESIDENCE ──────────────────────────────────────────────────
function projectResidence({ monthlyRentMinor, monthsRemaining, growthPct = 7.5, bandPct = 8 }) {
  const rent = Math.max(0, Number(monthlyRentMinor) || 0);
  const months = Math.max(0, Math.floor(monthsRemaining) || 0);
  const g = (Number(growthPct) || 0) / 100;
  let median = 0;
  for (let m = 0; m < months; m++) {
    median += rent * Math.pow(1 + g, m / 12);
  }
  median = round(median);
  const gap = round(median * (Math.max(0, bandPct) / 100));
  return { medianMinor: median, lowMinor: median - gap, highMinor: median + gap };
}

// ── Sub-model 3: LIFESTYLE (asymmetric) ─────────────────────────────────────
// Spend drifts UP, not down → upper gap wider than lower (1.5σ vs 1.0σ).
function projectLifestyle({ dailyAvgMinor, dailyStdevMinor = 0, monthsRemaining, inflationPct = 7.5 }) {
  const daily = Math.max(0, Number(dailyAvgMinor) || 0);
  const stdev = Math.max(0, Number(dailyStdevMinor) || 0);
  const months = Math.max(0, Math.floor(monthsRemaining) || 0);
  const infl = (Number(inflationPct) || 0) / 100;
  const inflFactor = Math.pow(1 + infl, months / 24); // midpoint compounding
  const monthsDays = 30.4 * months;
  const median = round(daily * monthsDays * inflFactor);
  const low = round((daily - 1.0 * stdev) * monthsDays * inflFactor);
  const high = round((daily + 1.5 * stdev) * monthsDays * inflFactor);
  return { medianMinor: median, lowMinor: Math.min(low, median), highMinor: Math.max(high, median) };
}

// ── Combine via variance-sum, preserving asymmetry ──────────────────────────
// Lower and upper gaps are combined separately (sqrt of sum of squared gaps).
function combineForecast(subModels, pastActualMinor = 0) {
  const past = Math.max(0, Number(pastActualMinor) || 0);
  let median = past;
  let lowGapSq = 0;
  let highGapSq = 0;
  for (const m of subModels) {
    if (!m) continue;
    median += m.medianMinor || 0;
    const lowGap = Math.max(0, (m.medianMinor || 0) - (m.lowMinor || 0));
    const highGap = Math.max(0, (m.highMinor || 0) - (m.medianMinor || 0));
    lowGapSq += lowGap * lowGap;
    highGapSq += highGap * highGap;
  }
  const combinedLowGap = round(Math.sqrt(lowGapSq));
  const combinedHighGap = round(Math.sqrt(highGapSq));
  return {
    medianMinor: round(median),
    lowMinor: round(median) - combinedLowGap,
    highMinor: round(median) + combinedHighGap,
  };
}

// ── Confidence tier ─────────────────────────────────────────────────────────
// Capped at MEDIUM when too much of the base data was backfilled (memory, not receipts).
function confidenceTier({ completedSemesters = 0, lifestyleDays = 0, stableResidence = true, backfillRatio = 0 }) {
  let tier;
  if (completedSemesters >= 4 && lifestyleDays >= 90 && stableResidence) tier = 'HIGH';
  else if (completedSemesters >= 2 || lifestyleDays >= 60) tier = 'MEDIUM';
  else tier = 'LOW';
  if (backfillRatio > 0.25 && tier === 'HIGH') tier = 'MEDIUM';
  return tier;
}

// Whether a meaningful forecast can be made at all.
function canForecast({ completedSemesters = 0, lifestyleDays = 0, hasResidence = false }) {
  return completedSemesters >= 1 || lifestyleDays >= 30 || hasResidence;
}

module.exports = {
  projectTuition, projectResidence, projectLifestyle,
  combineForecast, confidenceTier, canForecast,
};
