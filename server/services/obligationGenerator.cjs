const { prisma } = require('../db.cjs');

/**
 * Lazily generate missing obligations for all recurring trackers of a user.
 * Called on dashboard load — not via cron.
 */
async function generateMissingObligations(userId) {
  const trackers = await prisma.tracker.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      type: { in: ['MONTHLY', 'CUSTOM'] },
    },
    include: {
      obligations: {
        orderBy: { dueDate: 'desc' },
        take: 1,
      },
    },
  });

  const created = [];

  for (const tracker of trackers) {
    const meta = tracker.meta || {};

    if (tracker.type === 'MONTHLY') {
      const generated = await generateMonthly(tracker, meta, userId);
      created.push(...generated);
    } else if (tracker.type === 'CUSTOM' && meta.recurrence === 'YEARLY') {
      const generated = await generateYearly(tracker, meta, userId);
      created.push(...generated);
    }
  }

  return created;
}

async function generateMonthly(tracker, meta, userId) {
  const dueDay = meta.dueDay || 10;
  const now = new Date();
  const currentPeriod = toMonthKey(now);

  // Find all existing obligation periods for this tracker
  const existingObligations = await prisma.obligation.findMany({
    where: { trackerId: tracker.id, isRecurring: true },
    select: { dueDate: true, amountMinor: true },
    orderBy: { dueDate: 'desc' },
  });

  const existingPeriods = new Set(
    existingObligations
      .filter((o) => o.dueDate)
      .map((o) => toMonthKey(new Date(o.dueDate)))
  );

  // Use most recent obligation's amount, or budgetMinor, or 0
  const latestAmount =
    existingObligations.length > 0
      ? existingObligations[0].amountMinor
      : tracker.budgetMinor || 0;

  if (latestAmount <= 0) return [];

  // Generate all expected periods from startDate to current month
  const expectedPeriods = getMonthRange(tracker.startDate, now);
  const created = [];

  for (const period of expectedPeriods) {
    const key = toMonthKey(period);
    if (key > currentPeriod) continue;
    if (existingPeriods.has(key)) continue;

    const dueDate = new Date(period.getFullYear(), period.getMonth(), Math.min(dueDay, daysInMonth(period)));
    const status = resolveStatus(dueDate, now);

    const obligation = await prisma.obligation.create({
      data: {
        userId,
        entityId: tracker.entityId,
        trackerId: tracker.id,
        category: (tracker.meta && tracker.meta.category) || 'other',
        label: tracker.label + ' - ' + formatMonth(period),
        amountMinor: latestAmount,
        dueDate,
        status,
        isRecurring: true,
        recurrenceRule: 'MONTHLY',
      },
    });
    created.push(obligation);
  }

  return created;
}

async function generateYearly(tracker, meta, userId) {
  const dueMonth = meta.dueMonth || 1; // 1-indexed (January = 1)
  const dueDay = meta.dueDay || 1;
  const now = new Date();
  const currentYear = now.getFullYear();

  const existingObligations = await prisma.obligation.findMany({
    where: { trackerId: tracker.id, isRecurring: true },
    select: { dueDate: true, amountMinor: true },
    orderBy: { dueDate: 'desc' },
  });

  const existingYears = new Set(
    existingObligations
      .filter((o) => o.dueDate)
      .map((o) => new Date(o.dueDate).getFullYear())
  );

  const latestAmount =
    existingObligations.length > 0
      ? existingObligations[0].amountMinor
      : tracker.budgetMinor || 0;

  if (latestAmount <= 0) return [];

  const startYear = new Date(tracker.startDate).getFullYear();
  const created = [];

  for (let year = startYear; year <= currentYear; year++) {
    if (existingYears.has(year)) continue;

    const monthDate = new Date(year, dueMonth - 1, 1);
    const dueDate = new Date(year, dueMonth - 1, Math.min(dueDay, daysInMonth(monthDate)));
    const status = resolveStatus(dueDate, now);

    const obligation = await prisma.obligation.create({
      data: {
        userId,
        entityId: tracker.entityId,
        trackerId: tracker.id,
        category: (tracker.meta && tracker.meta.category) || 'other',
        label: tracker.label + ' - ' + year,
        amountMinor: latestAmount,
        dueDate,
        status,
        isRecurring: true,
        recurrenceRule: 'YEARLY',
      },
    });
    created.push(obligation);
  }

  return created;
}

function resolveStatus(dueDate, now) {
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (due < today) return 'OVERDUE';
  return 'PENDING';
}

function toMonthKey(date) {
  const d = new Date(date);
  return d.getFullYear() * 100 + d.getMonth(); // e.g. 202603
}

function getMonthRange(startDate, endDate) {
  const months = [];
  const start = new Date(startDate);
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function formatMonth(date) {
  return date.toLocaleString('en', { month: 'short', year: 'numeric' });
}

module.exports = { generateMissingObligations };
