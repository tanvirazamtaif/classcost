const { prisma } = require('../db.cjs');

// ─── CONSTANTS ─────────────────────────────────────────────────
const VALID_FEE_CATEGORIES = [
  'tuition', 'lab', 'exam', 'library', 'development', 'registration',
  'deposit', 'fine', 'retake', 'thesis', 'hostel', 'transport',
  'activity', 'medical', 'custom'
];

const VALID_BILLING_BASES = [
  'per_credit', 'fixed', 'yearly', 'one_time',
  'per_subject', 'per_class', 'per_exam'
];

const VALID_REPORTING_TREATMENTS = ['cost', 'deposit_refundable', 'excluded'];
const VALID_WAIVER_TYPES = ['flat', 'percentage'];
const VALID_APPLIES_TO = ['total', 'fee_category', 'fee_item'];
const VALID_OBLIGATION_MODES = ['pooled', 'fee_linked'];
const VALID_PERIOD_TYPES = ['semester', 'session', 'phase', 'term'];

// ─── WAIVER RESOLUTION ────────────────────────────────────────
// Deterministic 6-step stacking order:
// 1. Fee-item scoped % waivers
// 2. Fee-category scoped % waivers
// 3. Total scoped % waivers
// 4. Fee-item scoped flat waivers
// 5. Fee-category scoped flat waivers
// 6. Total scoped flat waivers
// Cap: no waiver reduces below zero

function resolveWaivers(feeItems, waivers) {
  const activeFees = feeItems.filter(f => f.isActive && f.amountMinor > 0);
  const feeByCategory = {};
  const feeById = {};
  let grossTotal = 0;

  for (const fee of activeFees) {
    grossTotal += fee.amountMinor;
    feeByCategory[fee.feeCategory] = (feeByCategory[fee.feeCategory] || 0) + fee.amountMinor;
    feeById[fee.id] = fee.amountMinor;
  }

  // Adjustment items reduce the gross
  const adjustments = feeItems.filter(f => f.isActive && f.amountMinor < 0);
  for (const adj of adjustments) {
    grossTotal += adj.amountMinor;
    if (adj.feeCategory) {
      feeByCategory[adj.feeCategory] = (feeByCategory[adj.feeCategory] || 0) + adj.amountMinor;
    }
  }

  // Sort waivers by stacking order
  const activeWaivers = waivers.filter(w => w.isActive && w.conditionMet);
  const sorted = activeWaivers.sort((a, b) => {
    const order = { fee_item: 0, fee_category: 1, total: 2 };
    const typeOrder = { percentage: 0, flat: 1 };
    const aKey = (order[a.appliesTo] || 2) * 10 + (typeOrder[a.waiverType] || 1);
    const bKey = (order[b.appliesTo] || 2) * 10 + (typeOrder[b.waiverType] || 1);
    if (aKey !== bKey) return aKey - bKey;
    return a.priority - b.priority;
  });

  const remainingByCategory = { ...feeByCategory };
  const remainingById = { ...feeById };
  let remainingTotal = grossTotal;

  const resolved = [];

  for (const waiver of sorted) {
    let reduction = 0;

    if (waiver.appliesTo === 'fee_item' && waiver.feeItemId) {
      const available = Math.max(0, remainingById[waiver.feeItemId] || 0);
      if (waiver.waiverType === 'percentage') {
        reduction = Math.floor((feeById[waiver.feeItemId] || 0) * (waiver.percentage || 0) / 100);
      } else {
        reduction = waiver.amountMinor || 0;
      }
      reduction = Math.min(reduction, available);
      remainingById[waiver.feeItemId] = available - reduction;

    } else if (waiver.appliesTo === 'fee_category' && waiver.feeCategory) {
      const available = Math.max(0, remainingByCategory[waiver.feeCategory] || 0);
      if (waiver.waiverType === 'percentage') {
        reduction = Math.floor((feeByCategory[waiver.feeCategory] || 0) * (waiver.percentage || 0) / 100);
      } else {
        reduction = waiver.amountMinor || 0;
      }
      reduction = Math.min(reduction, available);
      remainingByCategory[waiver.feeCategory] = available - reduction;

    } else {
      const available = Math.max(0, remainingTotal);
      if (waiver.waiverType === 'percentage') {
        reduction = Math.floor(grossTotal * (waiver.percentage || 0) / 100);
      } else {
        reduction = waiver.amountMinor || 0;
      }
      reduction = Math.min(reduction, available);
    }

    remainingTotal -= reduction;
    resolved.push({ waiverId: waiver.id, resolvedMinor: reduction });
  }

  return {
    grossMinor: grossTotal,
    totalWaiverMinor: grossTotal - Math.max(0, remainingTotal),
    netMinor: Math.max(0, remainingTotal),
    resolved,
  };
}

// ─── OBLIGATION GENERATION ────────────────────────────────────

async function generateObligations(trackerId, userId) {
  const tracker = await prisma.tracker.findUnique({
    where: { id: trackerId },
    include: { feeItems: true, waivers: true, obligations: true },
  });

  if (!tracker) throw new Error('Tracker not found');

  const { grossMinor, netMinor, totalWaiverMinor, resolved } = resolveWaivers(tracker.feeItems, tracker.waivers);

  for (const r of resolved) {
    await prisma.waiver.update({ where: { id: r.waiverId }, data: { resolvedMinor: r.resolvedMinor } });
  }

  await prisma.tracker.update({
    where: { id: trackerId },
    data: { grossMinor, netMinor },
  });

  const mode = tracker.obligationMode || 'pooled';

  if (mode === 'pooled') {
    const count = tracker.installmentCount || 3;
    const perInstallment = Math.floor(netMinor / count);
    const remainder = netMinor - (perInstallment * count);

    await prisma.obligation.deleteMany({
      where: { trackerId, userId, status: { in: ['UPCOMING', 'DUE', 'OVERDUE'] } },
    });

    const startDate = tracker.startDate;
    const obligations = [];

    for (let i = 0; i < count; i++) {
      const amount = i === 0 ? perInstallment + remainder : perInstallment;
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      dueDate.setDate(15);

      obligations.push({
        userId,
        entityId: tracker.entityId,
        trackerId,
        category: tracker.category || 'semester_fee',
        label: `Installment ${i + 1}/${count}`,
        amountMinor: amount,
        dueDate,
        status: 'UPCOMING',
        installmentSeq: i + 1,
        installmentOf: count,
        period: tracker.meta?.periodLabel || null,
      });
    }

    await prisma.obligation.createMany({ data: obligations });

  } else if (mode === 'fee_linked') {
    const activeFees = tracker.feeItems.filter(f => f.isActive && f.amountMinor > 0);

    await prisma.obligation.deleteMany({
      where: { trackerId, userId, status: { in: ['UPCOMING', 'DUE', 'OVERDUE'] } },
    });

    const obligations = activeFees.map((fee, i) => ({
      userId,
      entityId: tracker.entityId,
      trackerId,
      category: fee.feeCategory,
      label: fee.label,
      amountMinor: fee.amountMinor,
      dueDate: tracker.startDate,
      status: 'UPCOMING',
      installmentSeq: i + 1,
      installmentOf: activeFees.length,
      period: fee.coveragePeriod || null,
    }));

    await prisma.obligation.createMany({ data: obligations });
  }

  return { grossMinor, netMinor, totalWaiverMinor, mode };
}

// ─── REDISTRIBUTION ───────────────────────────────────────────

async function redistribute(trackerId, userId) {
  const tracker = await prisma.tracker.findUnique({
    where: { id: trackerId },
    include: { feeItems: true, waivers: true, obligations: true, ledgerEntries: true },
  });

  if (!tracker) throw new Error('Tracker not found');

  const { netMinor, resolved } = resolveWaivers(tracker.feeItems, tracker.waivers);

  for (const r of resolved) {
    await prisma.waiver.update({ where: { id: r.waiverId }, data: { resolvedMinor: r.resolvedMinor } });
  }

  const paidEntries = tracker.ledgerEntries.filter(
    e => e.direction === 'DEBIT' && e.status === 'POSTED'
  );
  const alreadyPaid = paidEntries.reduce((sum, e) => sum + e.amountMinor, 0);
  const remainingDue = Math.max(0, netMinor - alreadyPaid);

  const unpaid = tracker.obligations
    .filter(o => ['UPCOMING', 'DUE', 'OVERDUE', 'PARTIALLY_PAID'].includes(o.status))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (unpaid.length === 0) return { netMinor, alreadyPaid, remainingDue };

  const perObligation = Math.floor(remainingDue / unpaid.length);
  const redistributionRemainder = remainingDue - (perObligation * unpaid.length);

  for (let i = 0; i < unpaid.length; i++) {
    const amount = i === 0 ? perObligation + redistributionRemainder : perObligation;
    await prisma.obligation.update({
      where: { id: unpaid[i].id },
      data: { amountMinor: amount },
    });
  }

  const grossMinor = tracker.feeItems.filter(f => f.isActive).reduce((s, f) => s + f.amountMinor, 0);
  await prisma.tracker.update({
    where: { id: trackerId },
    data: { grossMinor, netMinor },
  });

  return { netMinor, alreadyPaid, remainingDue };
}

// ─── DERIVED SUMMARY ──────────────────────────────────────────

async function getSemesterSummary(trackerId) {
  const tracker = await prisma.tracker.findUnique({
    where: { id: trackerId },
    include: { feeItems: true, waivers: true, obligations: true, ledgerEntries: true },
  });

  if (!tracker) throw new Error('Tracker not found');

  const { grossMinor, netMinor, totalWaiverMinor } = resolveWaivers(tracker.feeItems, tracker.waivers);

  const paidMinor = tracker.ledgerEntries
    .filter(e => e.status === 'POSTED' && e.direction === 'DEBIT')
    .reduce((sum, e) => sum + e.amountMinor, 0);

  const scholarshipMinor = tracker.ledgerEntries
    .filter(e => e.status === 'POSTED' && e.type === 'SCHOLARSHIP_CASH')
    .reduce((sum, e) => sum + e.amountMinor, 0);

  const outstandingMinor = Math.max(0, netMinor - paidMinor - scholarshipMinor);

  const overdueObligations = tracker.obligations.filter(o => o.status === 'OVERDUE');
  const overdueMinor = overdueObligations.reduce((sum, o) => sum + o.amountMinor, 0);

  return {
    grossMinor,
    waiverMinor: totalWaiverMinor,
    netMinor,
    paidMinor: paidMinor + scholarshipMinor,
    outstandingMinor,
    overdueMinor,
    obligations: tracker.obligations,
    feeItems: tracker.feeItems.filter(f => f.isActive),
    waivers: tracker.waivers.filter(w => w.isActive),
    ledgerEntries: tracker.ledgerEntries.filter(e => e.status === 'POSTED'),
  };
}

module.exports = {
  resolveWaivers,
  generateObligations,
  redistribute,
  getSemesterSummary,
  VALID_FEE_CATEGORIES,
  VALID_BILLING_BASES,
  VALID_REPORTING_TREATMENTS,
  VALID_WAIVER_TYPES,
  VALID_APPLIES_TO,
  VALID_OBLIGATION_MODES,
  VALID_PERIOD_TYPES,
};
