const { prisma } = require('../db.cjs');
const { getSemesterSummary } = require('./semesterEngine.cjs');
const { buildStoryCard } = require('../lib/storyCard.cjs');

// Frozen ৳ formatter for the stored Story Card narrative (UI may re-render for locale).
const bdt = (minor) => '৳' + ((minor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Close a semester Tracker (Phase 5). Non-destructive: archives the tracker,
 * freezes its post-waiver profile, and writes an immutable ClosureRecord with a
 * Story Card snapshot. Wrapped in a transaction.
 */
async function closeSemester(trackerId, opts = {}) {
  const tracker = await prisma.tracker.findUnique({ where: { id: trackerId } });
  if (!tracker) throw new Error('Tracker not found');

  // Read-only money summary (gross/net/waiver/paid/outstanding).
  const summary = await getSemesterSummary(trackerId);
  const refundableMinor = Math.max(0, opts.refundableMinor || 0);
  const closureReason = opts.closureReason || 'completed';
  const effectiveEndDate = opts.effectiveEndDate ? new Date(opts.effectiveEndDate) : new Date();

  const storyCard = buildStoryCard({
    label: tracker.label,
    periodLabel: (tracker.meta && tracker.meta.periodLabel) || null,
    closureReason,
    grossMinor: summary.grossMinor,
    waiverMinor: summary.waiverMinor,
    netMinor: summary.netMinor,
    paidMinor: summary.paidMinor,
    outstandingMinor: summary.outstandingMinor,
    refundableMinor,
  }, bdt);

  return prisma.$transaction(async (tx) => {
    const closure = await tx.closureRecord.create({
      data: {
        userId: tracker.userId,
        trackerId,
        closureReason,
        effectiveEndDate,
        status: refundableMinor > 0 ? 'confirmed' : 'settled',
        grossMinor: summary.grossMinor,
        netMinor: summary.netMinor,
        waiverMinor: summary.waiverMinor,
        paidMinor: summary.paidMinor,
        outstandingMinor: summary.outstandingMinor,
        refundableMinor,
        storyCard,
      },
    });
    await tx.tracker.update({
      where: { id: trackerId },
      data: {
        status: 'ARCHIVED',
        profileFrozenAt: new Date(),
        profileSnapshot: {
          grossMinor: summary.grossMinor,
          netMinor: summary.netMinor,
          totalWaiverMinor: summary.waiverMinor,
          frozen: true,
          computedAt: new Date().toISOString(),
        },
      },
    });
    return closure;
  });
}

async function listClosures(userId) {
  return prisma.closureRecord.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

// Mark a refundable closure settled once the refund is received.
async function markRefundReceived(closureId) {
  const closure = await prisma.closureRecord.findUnique({ where: { id: closureId } });
  if (!closure) throw new Error('Closure not found');
  return prisma.closureRecord.update({ where: { id: closureId }, data: { status: 'settled' } });
}

module.exports = { closeSemester, listClosures, markRefundReceived };
