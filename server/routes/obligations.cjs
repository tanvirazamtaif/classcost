const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { isValidCategory } = require('../lib/categories.cjs');
const { generateMissingObligations } = require('../services/obligationGenerator.cjs');

// Status transition map — only listed transitions are allowed
// Terminal states (PAID, WAIVED, CANCELLED) have no outgoing transitions
const STATUS_TRANSITIONS = {
  PENDING: ['PARTIAL', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED'],
  PARTIAL: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['PAID', 'PARTIAL', 'CANCELLED'],
};

function canTransition(from, to) {
  const allowed = STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

function validateCreate(body) {
  const errors = [];
  if (!body.category || !isValidCategory(body.category)) {
    errors.push('category is required and must be a valid category id');
  }
  if (!body.label || typeof body.label !== 'string' || body.label.trim().length === 0 || body.label.length > 200) {
    errors.push('label is required and must be 1-200 characters');
  }
  if (!body.amountMinor || typeof body.amountMinor !== 'number' || body.amountMinor <= 0 || !Number.isInteger(body.amountMinor)) {
    errors.push('amountMinor is required and must be a positive integer');
  }
  if (body.parentId && (!body.trackerId)) {
    errors.push('installments (parentId set) require trackerId');
  }
  return errors;
}

// List all obligations for user
router.get('/:userId', async (req, res) => {
  try {
    const obligations = await prisma.obligation.findMany({
      where: { userId: req.params.userId },
      include: { tracker: true, entity: true, installments: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(obligations);
  } catch (err) {
    console.error('Get obligations error:', err);
    res.status(500).json({ error: 'Failed to get obligations' });
  }
});

// Upcoming + overdue obligations (next 30 days)
router.get('/:userId/upcoming', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Lazy-generate missing obligations for recurring trackers
    await generateMissingObligations(userId);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const obligations = await prisma.obligation.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        OR: [
          { dueDate: null },
          { dueDate: { lte: thirtyDaysFromNow } },
        ],
      },
      include: {
        tracker: true,
        entity: true,
        ledgerEntries: {
          where: { direction: 'DEBIT', status: 'CONFIRMED' },
          select: { amountMinor: true },
        },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    // Derive amountPaid and amountRemaining, sort OVERDUE first
    const results = obligations.map((obl) => {
      const amountPaid = obl.ledgerEntries.reduce((sum, le) => sum + le.amountMinor, 0);
      const waiverMinor = Math.floor((obl.amountMinor * obl.waiverPct) / 100);
      const amountRemaining = obl.amountMinor - waiverMinor - amountPaid;
      const { ledgerEntries, ...rest } = obl;
      return { ...rest, amountPaid, amountRemaining };
    });

    // Sort: OVERDUE first, then by dueDate ascending (nulls last)
    results.sort((a, b) => {
      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
      if (a.status !== 'OVERDUE' && b.status === 'OVERDUE') return 1;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    res.json(results);
  } catch (err) {
    console.error('Get upcoming obligations error:', err);
    res.status(500).json({ error: 'Failed to get upcoming obligations' });
  }
});

// List obligations for specific tracker
router.get('/:userId/tracker/:tid', async (req, res) => {
  try {
    const obligations = await prisma.obligation.findMany({
      where: { userId: req.params.userId, trackerId: req.params.tid },
      include: { installments: true },
      orderBy: { dueDate: 'asc' },
    });
    res.json(obligations);
  } catch (err) {
    console.error('Get tracker obligations error:', err);
    res.status(500).json({ error: 'Failed to get obligations for tracker' });
  }
});

// Create obligation
router.post('/:userId', async (req, res) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const userId = req.params.userId;

    // Validate trackerId belongs to user if provided
    if (req.body.trackerId) {
      const tracker = await prisma.tracker.findFirst({
        where: { id: req.body.trackerId, userId },
      });
      if (!tracker) return res.status(400).json({ errors: ['trackerId does not exist or does not belong to user'] });
    }

    // Validate parentId exists and belongs to user if provided
    if (req.body.parentId) {
      const parent = await prisma.obligation.findFirst({
        where: { id: req.body.parentId, userId },
      });
      if (!parent) return res.status(400).json({ errors: ['parentId does not exist or does not belong to user'] });
    }

    const obligation = await prisma.obligation.create({
      data: {
        userId,
        entityId: req.body.entityId || null,
        trackerId: req.body.trackerId || null,
        category: req.body.category,
        label: req.body.label.trim(),
        amountMinor: req.body.amountMinor,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        waiverPct: req.body.waiverPct || 0,
        isRecurring: req.body.isRecurring || false,
        recurrenceRule: req.body.recurrenceRule || null,
        parentId: req.body.parentId || null,
        meta: req.body.meta || null,
      },
      include: { tracker: true, entity: true },
    });

    res.status(201).json(obligation);
  } catch (err) {
    console.error('Create obligation error:', err);
    res.status(500).json({ error: 'Failed to create obligation' });
  }
});

// Update obligation (label, dueDate, status, waiverPct)
router.put('/:userId/:id', async (req, res) => {
  try {
    const existing = await prisma.obligation.findFirst({
      where: { id: req.params.id, userId: req.params.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Obligation not found' });

    // Check terminal state
    if (['PAID', 'WAIVED', 'CANCELLED'].includes(existing.status)) {
      return res.status(400).json({ error: `Cannot update obligation in terminal status: ${existing.status}` });
    }

    const updates = {};

    if (req.body.label !== undefined) {
      if (typeof req.body.label !== 'string' || req.body.label.trim().length === 0 || req.body.label.length > 200) {
        return res.status(400).json({ errors: ['label must be 1-200 characters'] });
      }
      updates.label = req.body.label.trim();
    }
    if (req.body.dueDate !== undefined) {
      updates.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    }
    if (req.body.waiverPct !== undefined) {
      if (typeof req.body.waiverPct !== 'number' || req.body.waiverPct < 0 || req.body.waiverPct > 100) {
        return res.status(400).json({ errors: ['waiverPct must be 0-100'] });
      }
      updates.waiverPct = req.body.waiverPct;
    }
    if (req.body.status !== undefined) {
      if (!canTransition(existing.status, req.body.status)) {
        return res.status(400).json({ error: `Cannot transition from ${existing.status} to ${req.body.status}` });
      }
      updates.status = req.body.status;
    }
    if (req.body.meta !== undefined) updates.meta = req.body.meta;

    const obligation = await prisma.obligation.update({
      where: { id: req.params.id },
      data: updates,
      include: { tracker: true, entity: true, installments: true },
    });
    res.json(obligation);
  } catch (err) {
    console.error('Update obligation error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Obligation not found' });
    res.status(500).json({ error: 'Failed to update obligation' });
  }
});

// Apply waiver
router.patch('/:userId/:id/waiver', async (req, res) => {
  try {
    const existing = await prisma.obligation.findFirst({
      where: { id: req.params.id, userId: req.params.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Obligation not found' });
    if (['PAID', 'WAIVED', 'CANCELLED'].includes(existing.status)) {
      return res.status(400).json({ error: `Cannot apply waiver to obligation in terminal status: ${existing.status}` });
    }

    const { waiverPct, waiverReason } = req.body;
    if (typeof waiverPct !== 'number' || waiverPct < 1 || waiverPct > 100) {
      return res.status(400).json({ errors: ['waiverPct must be 1-100'] });
    }

    const meta = existing.meta || {};
    if (waiverReason) meta.waiverReason = waiverReason;

    const newStatus = waiverPct === 100 ? 'WAIVED' : existing.status;

    const obligation = await prisma.obligation.update({
      where: { id: req.params.id },
      data: { waiverPct, status: newStatus, meta },
      include: { tracker: true, entity: true },
    });
    res.json(obligation);
  } catch (err) {
    console.error('Apply waiver error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Obligation not found' });
    res.status(500).json({ error: 'Failed to apply waiver' });
  }
});

// Skip obligation (set status=CANCELLED)
router.patch('/:userId/:id/skip', async (req, res) => {
  try {
    const existing = await prisma.obligation.findFirst({
      where: { id: req.params.id, userId: req.params.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Obligation not found' });
    if (['PAID', 'WAIVED', 'CANCELLED'].includes(existing.status)) {
      return res.status(400).json({ error: `Cannot skip obligation in terminal status: ${existing.status}` });
    }

    const obligation = await prisma.obligation.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
      include: { tracker: true, entity: true },
    });
    res.json(obligation);
  } catch (err) {
    console.error('Skip obligation error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Obligation not found' });
    res.status(500).json({ error: 'Failed to skip obligation' });
  }
});

module.exports = router;
