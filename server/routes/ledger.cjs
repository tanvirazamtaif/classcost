const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { isValidCategory, isValidSubCategory } = require('../lib/categories.cjs');

const VALID_LEDGER_TYPES = ['PAYMENT', 'INCOME', 'REFUND', 'WAIVER_CREDIT', 'ADJUSTMENT', 'CORRECTION'];
const VALID_DIRECTIONS = ['DEBIT', 'CREDIT'];
const PAGE_SIZE = 50;

function validateCreate(body) {
  const errors = [];
  if (!body.type || !VALID_LEDGER_TYPES.includes(body.type)) {
    errors.push('type is required and must be one of: ' + VALID_LEDGER_TYPES.join(', '));
  }
  if (!body.direction || !VALID_DIRECTIONS.includes(body.direction)) {
    errors.push('direction is required and must be DEBIT or CREDIT');
  }
  if (!body.amountMinor || typeof body.amountMinor !== 'number' || body.amountMinor <= 0 || !Number.isInteger(body.amountMinor)) {
    errors.push('amountMinor is required and must be a positive integer');
  }
  if (!body.category || !isValidCategory(body.category)) {
    errors.push('category is required and must be a valid category id');
  }
  if (body.subCategory && !isValidSubCategory(body.category, body.subCategory)) {
    errors.push('subCategory is invalid for the given category');
  }
  if (!body.date) {
    errors.push('date is required');
  }
  return errors;
}

// Recalculate obligation status based on posted debit entries
async function recalcObligationStatus(obligationId) {
  const obligation = await prisma.obligation.findUnique({ where: { id: obligationId } });
  if (!obligation) return;
  // Terminal states that shouldn't be recalculated from payments
  if (['WAIVED', 'VOIDED', 'SKIPPED'].includes(obligation.status)) return;

  const result = await prisma.ledgerEntry.aggregate({
    where: { obligationId, direction: 'DEBIT', status: 'POSTED' },
    _sum: { amountMinor: true },
  });

  const totalPaid = result._sum.amountMinor || 0;
  const effectiveDue = obligation.amountMinor - obligation.waiverAmountMinor;

  let newStatus;
  if (totalPaid >= effectiveDue) {
    newStatus = 'PAID';
  } else if (totalPaid > 0) {
    newStatus = 'PARTIALLY_PAID';
  } else {
    // Revert to UPCOMING or OVERDUE based on due date
    if (obligation.dueDate && new Date(obligation.dueDate) < new Date()) {
      newStatus = 'OVERDUE';
    } else {
      newStatus = 'UPCOMING';
    }
  }

  await prisma.obligation.update({
    where: { id: obligationId },
    data: { status: newStatus },
  });
}

// Parse cursor from query: "createdAt_id"
function parseCursor(cursorStr) {
  if (!cursorStr) return null;
  const idx = cursorStr.lastIndexOf('_');
  if (idx === -1) return null;
  return { createdAt: new Date(cursorStr.slice(0, idx)), id: cursorStr.slice(idx + 1) };
}

function encodeCursor(entry) {
  return entry.createdAt.toISOString() + '_' + entry.id;
}

// List entries (paginated, cursor-based)
router.get('/:userId', async (req, res) => {
  try {
    const cursor = parseCursor(req.query.cursor);
    const where = { userId: req.params.userId };

    if (cursor) {
      where.OR = [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ];
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      include: { tracker: true, obligation: true },
    });

    const hasMore = entries.length > PAGE_SIZE;
    const page = hasMore ? entries.slice(0, PAGE_SIZE) : entries;
    const nextCursor = hasMore ? encodeCursor(page[page.length - 1]) : null;

    res.json({ data: page, nextCursor, hasMore });
  } catch (err) {
    console.error('Get ledger entries error:', err);
    res.status(500).json({ error: 'Failed to get ledger entries' });
  }
});

// Summary — derived totals, never stored
router.get('/:userId/summary', async (req, res) => {
  try {
    const userId = req.params.userId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // All posted entries for user
    const allEntries = await prisma.ledgerEntry.findMany({
      where: { userId, status: 'POSTED' },
      select: { amountMinor: true, direction: true, date: true, category: true, trackerId: true, entityId: true },
    });

    // Fetch trackers with entityId for per-entity grouping
    const trackerIds = [...new Set(allEntries.filter((e) => e.trackerId).map((e) => e.trackerId))];
    const trackers = trackerIds.length
      ? await prisma.tracker.findMany({
          where: { id: { in: trackerIds } },
          select: { id: true, entityId: true },
        })
      : [];
    const trackerEntityMap = {};
    for (const t of trackers) trackerEntityMap[t.id] = t.entityId;

    let lifetimeDebit = 0, lifetimeCredit = 0;
    let monthlyDebit = 0, monthlyCredit = 0;
    let yearlyDebit = 0, yearlyCredit = 0;
    const perEntity = {};
    const perCategory = {};

    for (const entry of allEntries) {
      const amt = entry.amountMinor;
      const isDebit = entry.direction === 'DEBIT';
      const date = new Date(entry.date);

      if (isDebit) lifetimeDebit += amt; else lifetimeCredit += amt;
      if (date >= monthStart) { if (isDebit) monthlyDebit += amt; else monthlyCredit += amt; }
      if (date >= yearStart) { if (isDebit) yearlyDebit += amt; else yearlyCredit += amt; }

      // Per entity (null = personal)
      const entityId = entry.entityId || (entry.trackerId ? (trackerEntityMap[entry.trackerId] || null) : null);
      const eKey = entityId || '_personal';
      if (!perEntity[eKey]) perEntity[eKey] = { entityId: entityId || null, debit: 0, credit: 0 };
      if (isDebit) perEntity[eKey].debit += amt; else perEntity[eKey].credit += amt;

      // Per category
      if (!perCategory[entry.category]) perCategory[entry.category] = { category: entry.category, debit: 0, credit: 0 };
      if (isDebit) perCategory[entry.category].debit += amt; else perCategory[entry.category].credit += amt;
    }

    res.json({
      lifetimeTotal: lifetimeDebit - lifetimeCredit,
      monthlyTotal: monthlyDebit - monthlyCredit,
      yearlyTotal: yearlyDebit - yearlyCredit,
      perEntity: Object.values(perEntity).map((e) => ({ ...e, net: e.debit - e.credit })),
      perCategory: Object.values(perCategory).map((c) => ({ ...c, net: c.debit - c.credit })),
    });
  } catch (err) {
    console.error('Get ledger summary error:', err);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// Entries for specific entity (via tracker)
router.get('/:userId/entity/:eid', async (req, res) => {
  try {
    const cursor = parseCursor(req.query.cursor);

    // Find all trackers belonging to this entity
    const trackerIds = (
      await prisma.tracker.findMany({
        where: { entityId: req.params.eid, userId: req.params.userId },
        select: { id: true },
      })
    ).map((t) => t.id);

    const where = { userId: req.params.userId, trackerId: { in: trackerIds } };
    if (cursor) {
      where.OR = [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ];
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      include: { tracker: true, obligation: true },
    });

    const hasMore = entries.length > PAGE_SIZE;
    const page = hasMore ? entries.slice(0, PAGE_SIZE) : entries;
    const nextCursor = hasMore ? encodeCursor(page[page.length - 1]) : null;

    res.json({ data: page, nextCursor, hasMore });
  } catch (err) {
    console.error('Get entity ledger entries error:', err);
    res.status(500).json({ error: 'Failed to get ledger entries for entity' });
  }
});

// Entries for specific tracker
router.get('/:userId/tracker/:tid', async (req, res) => {
  try {
    const cursor = parseCursor(req.query.cursor);
    const where = { userId: req.params.userId, trackerId: req.params.tid };

    if (cursor) {
      where.OR = [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ];
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      include: { obligation: true },
    });

    const hasMore = entries.length > PAGE_SIZE;
    const page = hasMore ? entries.slice(0, PAGE_SIZE) : entries;
    const nextCursor = hasMore ? encodeCursor(page[page.length - 1]) : null;

    res.json({ data: page, nextCursor, hasMore });
  } catch (err) {
    console.error('Get tracker ledger entries error:', err);
    res.status(500).json({ error: 'Failed to get ledger entries for tracker' });
  }
});

// Create ledger entry
router.post('/:userId', async (req, res) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const userId = req.params.userId;

    // Validate optional FK references belong to user
    if (req.body.trackerId) {
      const tracker = await prisma.tracker.findFirst({ where: { id: req.body.trackerId, userId } });
      if (!tracker) return res.status(400).json({ errors: ['trackerId does not exist or does not belong to user'] });
    }
    if (req.body.obligationId) {
      const obligation = await prisma.obligation.findFirst({ where: { id: req.body.obligationId, userId } });
      if (!obligation) return res.status(400).json({ errors: ['obligationId does not exist or does not belong to user'] });
    }
    if (req.body.loanId) {
      const loan = await prisma.loan.findFirst({ where: { id: req.body.loanId, userId } });
      if (!loan) return res.status(400).json({ errors: ['loanId does not exist or does not belong to user'] });
    }
    if (req.body.entityId) {
      const entity = await prisma.entity.findFirst({ where: { id: req.body.entityId, userId } });
      if (!entity) return res.status(400).json({ errors: ['entityId does not exist or does not belong to user'] });
    }

    const entry = await prisma.ledgerEntry.create({
      data: {
        userId,
        trackerId: req.body.trackerId || null,
        obligationId: req.body.obligationId || null,
        entityId: req.body.entityId || null,
        type: req.body.type,
        direction: req.body.direction,
        category: req.body.category,
        subCategory: req.body.subCategory || null,
        amountMinor: req.body.amountMinor,
        baseAmountMinor: req.body.baseAmountMinor || null,
        currency: req.body.currency || 'BDT',
        status: 'POSTED',
        date: new Date(req.body.date),
        note: req.body.note || null,
        receiptUrl: req.body.receiptUrl || null,
        sourceRef: req.body.sourceRef || 'manual',
        loanId: req.body.loanId || null,
        meta: req.body.meta || null,
      },
      include: { tracker: true, obligation: true },
    });

    // Recalculate obligation status if linked
    if (entry.obligationId) {
      await recalcObligationStatus(entry.obligationId);
    }

    res.status(201).json(entry);
  } catch (err) {
    console.error('Create ledger entry error:', err);
    res.status(500).json({ error: 'Failed to create ledger entry' });
  }
});

// Void an entry
router.patch('/:userId/:id/void', async (req, res) => {
  try {
    const existing = await prisma.ledgerEntry.findFirst({
      where: { id: req.params.id, userId: req.params.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Ledger entry not found' });
    if (existing.status === 'VOIDED') {
      return res.status(400).json({ error: 'Entry is already voided' });
    }

    if (!req.body.voidReason || typeof req.body.voidReason !== 'string' || req.body.voidReason.trim().length === 0) {
      return res.status(400).json({ errors: ['voidReason is required'] });
    }

    const meta = existing.meta || {};
    meta.voidReason = req.body.voidReason.trim();
    meta.voidedAt = new Date().toISOString();

    const entry = await prisma.ledgerEntry.update({
      where: { id: req.params.id },
      data: { status: 'VOIDED', meta },
      include: { tracker: true, obligation: true },
    });

    // Recalculate obligation status if linked
    if (entry.obligationId) {
      await recalcObligationStatus(entry.obligationId);
    }

    res.json(entry);
  } catch (err) {
    console.error('Void ledger entry error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Ledger entry not found' });
    res.status(500).json({ error: 'Failed to void ledger entry' });
  }
});

module.exports = router;
