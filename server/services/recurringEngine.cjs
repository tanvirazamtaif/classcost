const { prisma } = require('../db.cjs');
const { planSlots, advanceCoverage, periodKey, dueDateFor } = require('../lib/recurringMath.cjs');

/**
 * Recurring payments engine (Phase 3). Parallel + additive to the legacy lazy
 * obligationGenerator — a user only gets PaymentSlots when they explicitly own a
 * RecurringSchedule, so there is no double-generation with legacy trackers.
 *
 * Idempotency is guaranteed at two layers: planSlots() skips periods that already
 * have a slot, and the DB UNIQUE(scheduleId, period) + createMany skipDuplicates
 * makes concurrent runs safe.
 */

// Materialize missing PaymentSlots for a schedule up to today + lookahead.
async function materializeSlots(scheduleId, opts = {}) {
  const schedule = await prisma.recurringSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || !schedule.isActive || !schedule.autoCreate) return [];

  const existing = await prisma.paymentSlot.findMany({
    where: { scheduleId },
    select: { period: true },
  });
  const existingPeriods = new Set(existing.map((s) => s.period));

  const plan = planSlots(schedule, existingPeriods, opts.today || new Date(), opts.lookaheadMonths ?? 1);
  if (plan.length === 0) return [];

  await prisma.paymentSlot.createMany({
    data: plan.map((p) => ({
      scheduleId,
      userId: schedule.userId,
      period: p.period,
      dueDate: p.dueDate,
      expectedMinor: p.expectedMinor,
      status: 'PENDING',
      origin: 'AUTO',
    })),
    skipDuplicates: true, // belt-and-suspenders against races
  });

  return prisma.paymentSlot.findMany({
    where: { scheduleId, period: { in: plan.map((p) => p.period) } },
    orderBy: { dueDate: 'asc' },
  });
}

// Create a schedule (+ initial ScheduleVersion) and materialize its first slots.
async function createSchedule(userId, data) {
  const schedule = await prisma.$transaction(async (tx) => {
    const created = await tx.recurringSchedule.create({
      data: {
        userId,
        trackerId: data.trackerId || null,
        entityId: data.entityId || null,
        category: data.category,
        label: data.label,
        cadence: data.cadence || 'MONTHLY',
        dueDay: data.dueDay || 1,
        amountMinor: data.amountMinor,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        autoCreate: data.autoCreate !== false,
        isActive: true,
        metadata: data.metadata || null,
      },
    });
    await tx.scheduleVersion.create({
      data: {
        scheduleId: created.id,
        amountMinor: created.amountMinor,
        effectiveFrom: created.startDate,
        reason: 'initial',
      },
    });
    return created;
  });

  const slots = await materializeSlots(schedule.id, { lookaheadMonths: 1 });
  return { schedule, slots };
}

// Record an amount change: new ScheduleVersion + re-price FUTURE (not-yet-due)
// PENDING slots. Past-due and paid slots are frozen (financial history).
async function changeAmount(scheduleId, newAmountMinor, effectiveFrom, reason) {
  return prisma.$transaction(async (tx) => {
    const sched = await tx.recurringSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new Error('Schedule not found');
    await tx.scheduleVersion.create({
      data: {
        scheduleId,
        amountMinor: newAmountMinor,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        reason: reason || null,
      },
    });
    await tx.recurringSchedule.update({ where: { id: scheduleId }, data: { amountMinor: newAmountMinor } });
    const today = new Date();
    // Re-price only strictly-future, auto-generated PENDING slots. Past-due and
    // any advance/manual-origin slots are frozen (financial history).
    await tx.paymentSlot.updateMany({
      where: { scheduleId, status: 'PENDING', origin: 'AUTO', dueDate: { gt: today } },
      data: { expectedMinor: newAmountMinor },
    });
    return tx.recurringSchedule.findUnique({ where: { id: scheduleId } });
  });
}

// One-tap mark a slot paid (no amount re-entry).
async function markSlotPaid(slotId, opts = {}) {
  const slot = await prisma.paymentSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw new Error('Slot not found');
  return prisma.paymentSlot.update({
    where: { id: slotId },
    data: { status: 'PAID', paidDate: opts.paidDate ? new Date(opts.paidDate) : new Date() },
  });
}

// Undo a mark-paid (revert to PENDING). Won't touch advance-covered slots.
async function unmarkSlotPaid(slotId) {
  const slot = await prisma.paymentSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw new Error('Slot not found');
  // Only a plain PAID slot can be reverted. PAID_ADVANCE / SKIPPED / VOID are
  // intentional terminal states and must not be silently reactivated.
  if (slot.status !== 'PAID') throw new Error('Only a PAID slot can be unmarked');
  return prisma.paymentSlot.update({ where: { id: slotId }, data: { status: 'PENDING', paidDate: null } });
}

// Apply an advance: create AdvancePayment and mark/create the covered slots PAID_ADVANCE.
async function applyAdvance(scheduleId, { amountMinor, monthsCovered, startPeriod, paidOn, paidBy }) {
  return prisma.$transaction(async (tx) => {
    const sched = await tx.recurringSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new Error('Schedule not found');

    const start = startPeriod || periodKey(paidOn ? new Date(paidOn) : new Date());
    const { periods, perPeriod, endPeriod } = advanceCoverage(amountMinor, monthsCovered, start, sched.cadence);
    const paidOnDate = paidOn ? new Date(paidOn) : new Date();

    const advance = await tx.advancePayment.create({
      data: {
        scheduleId,
        userId: sched.userId,
        monthsCovered,
        amountMinor,
        // Advisory summary only (floor average). The authoritative per-period
        // amounts live on the PaymentSlots — the last covered slot carries the
        // paisa remainder. Do not use this field for financial reconciliation.
        perPeriodMinor: Math.floor(amountMinor / Math.max(1, monthsCovered)),
        startPeriod: start,
        endPeriod,
        paidOn: paidOnDate,
        paidBy: paidBy || 'SELF',
      },
    });

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      await tx.paymentSlot.upsert({
        where: { scheduleId_period: { scheduleId, period } },
        update: {
          status: 'PAID_ADVANCE', expectedMinor: perPeriod[i], origin: 'ADVANCE',
          advanceId: advance.id, paidDate: paidOnDate,
        },
        create: {
          scheduleId, userId: sched.userId, period, dueDate: dueDateFor(period, sched.dueDay),
          expectedMinor: perPeriod[i], status: 'PAID_ADVANCE', origin: 'ADVANCE',
          advanceId: advance.id, paidDate: paidOnDate,
        },
      });
    }
    return advance;
  });
}

// Materialize all of a user's active schedules (call on dashboard load).
async function materializeAllForUser(userId, opts = {}) {
  const schedules = await prisma.recurringSchedule.findMany({
    where: { userId, isActive: true, autoCreate: true },
    select: { id: true },
  });
  let total = 0;
  for (const s of schedules) {
    const created = await materializeSlots(s.id, opts);
    total += created.length;
  }
  return total;
}

module.exports = {
  materializeSlots,
  createSchedule,
  changeAmount,
  markSlotPaid,
  unmarkSlotPaid,
  applyAdvance,
  materializeAllForUser,
};
