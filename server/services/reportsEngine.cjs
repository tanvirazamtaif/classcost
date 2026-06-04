const { prisma } = require('../db.cjs');
const { aggregateLedger, meanStdev } = require('../lib/reportsMath.cjs');
const fc = require('../lib/forecastEngine.cjs');

/**
 * Server-side reporting — reads the CANONICAL ledger only (deduped on sourceRef),
 * so a migrated user's education payments are counted ONCE, fixing the client-side
 * useUnifiedTotals double-count. Read-only and additive; the legacy hook stays as
 * the live dashboard source until totals are verified to match.
 */

// Scoped spending totals from the ledger.
async function getSummary(userId, now = new Date()) {
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId, status: 'POSTED', direction: 'DEBIT' },
    select: { amountMinor: true, category: true, date: true, sourceRef: true },
  });
  return aggregateLedger(entries, now);
}

// BD-specific: total waiver/scholarship saved across all semester trackers.
async function getWaiverSaved(userId) {
  const trackers = await prisma.tracker.findMany({
    where: { userId },
    select: { profileSnapshot: true },
  });
  let totalWaiverMinor = 0;
  for (const t of trackers) {
    const s = t.profileSnapshot;
    if (s && typeof s.totalWaiverMinor === 'number') totalWaiverMinor += s.totalWaiverMinor;
  }
  return { totalWaiverMinor };
}

// Gather forecast inputs from real data, then run the pure engine.
// Assumptions (semestersRemaining, inflationPct, waiverPct, monthsRemaining) can
// be overridden via opts (the "Adjust assumptions" panel).
async function getForecast(userId, opts = {}, now = new Date()) {
  // 1. Tuition baseline — average net of completed semester trackers.
  const semesterTrackers = await prisma.tracker.findMany({
    where: { userId, type: 'SEMESTER' },
    select: { status: true, netMinor: true, profileSnapshot: true },
  });
  const completed = semesterTrackers.filter((t) => ['COMPLETED', 'ARCHIVED'].includes(t.status));
  const completedNets = completed
    .map((t) => (t.profileSnapshot && t.profileSnapshot.netMinor) || t.netMinor || 0)
    .filter((n) => n > 0);
  const avgSemesterNetMinor = completedNets.length
    ? Math.round(completedNets.reduce((s, x) => s + x, 0) / completedNets.length)
    : 0;

  // 2. Residence baseline — active rent schedules.
  const rentSchedules = await prisma.recurringSchedule.findMany({
    where: { userId, isActive: true, category: { in: ['rent', 'residence', 'hostel'] } },
    select: { amountMinor: true, endDate: true },
  });
  const monthlyRentMinor = rentSchedules.reduce((s, r) => s + (r.amountMinor || 0), 0);

  // 3. Lifestyle baseline — last 90 days of food/transit/other ledger debits.
  const since = new Date(now.getTime() - 90 * 86400000);
  const lifestyleEntries = await prisma.ledgerEntry.findMany({
    where: {
      userId, status: 'POSTED', direction: 'DEBIT',
      category: { in: ['food', 'transport', 'transit', 'other', 'materials'] },
      date: { gte: since },
    },
    select: { amountMinor: true, date: true },
  });
  // Bucket by day → daily totals → mean & stdev.
  const byDay = {};
  for (const e of lifestyleEntries) {
    const key = new Date(e.date).toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + (e.amountMinor || 0);
  }
  const dailyTotals = Object.values(byDay);
  const lifestyleDays = dailyTotals.length;
  const { mean: dailyAvgMinor, stdev: dailyStdevMinor } = meanStdev(dailyTotals);

  // 4. Assemble assumptions (data-derived defaults + overrides).
  const semestersRemaining = opts.semestersRemaining != null ? Math.max(0, opts.semestersRemaining | 0) : 4;
  const monthsRemaining = opts.monthsRemaining != null ? Math.max(0, opts.monthsRemaining | 0) : semestersRemaining * 6;
  const inflationPct = opts.inflationPct != null ? Number(opts.inflationPct) : 7.5;
  const waiverPct = opts.waiverPct != null ? Number(opts.waiverPct) : 0;

  const inputs = {
    completedSemesters: completedNets.length,
    lifestyleDays,
    hasResidence: rentSchedules.length > 0,
    stableResidence: true,
    backfillRatio: opts.backfillRatio || 0,
  };

  if (!fc.canForecast(inputs)) {
    return { available: false, reason: 'Forecast unlocks after your first completed semester or 30 days of daily spend.', inputs };
  }

  // 5. Run sub-models + combine.
  const tuition = avgSemesterNetMinor > 0
    ? fc.projectTuition({ avgSemesterNetMinor, semestersRemaining, waiverPct, inflationPct })
    : null;
  const residence = monthlyRentMinor > 0
    ? fc.projectResidence({ monthlyRentMinor, monthsRemaining, growthPct: inflationPct })
    : null;
  const lifestyle = lifestyleDays > 0
    ? fc.projectLifestyle({ dailyAvgMinor, dailyStdevMinor, monthsRemaining, inflationPct })
    : null;

  // Past actual = lifetime ledger spend.
  const summary = await getSummary(userId, now);
  const pastActualMinor = summary.lifetime.total;

  const combined = fc.combineForecast([tuition, residence, lifestyle], pastActualMinor);
  const confidence = fc.confidenceTier(inputs);

  return {
    available: true,
    confidence,
    pastActualMinor,
    subModels: { tuition, residence, lifestyle },
    combined,
    assumptions: { semestersRemaining, monthsRemaining, inflationPct, waiverPct },
    inputs,
  };
}

module.exports = { getSummary, getWaiverSaved, getForecast };
