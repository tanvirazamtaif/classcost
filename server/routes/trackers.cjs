const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { isValidCategory } = require('../lib/categories.cjs');

const VALID_TRACKER_TYPES = ['SEMESTER', 'MONTHLY', 'ONE_TIME', 'CUSTOM'];
const VALID_TRACKER_STATUSES = ['ACTIVE', 'COMPLETED', 'ARCHIVED'];
const FINANCIAL_WORDS = ['amount', 'payment', 'fee', 'balance', 'due'];

function validateMetadata(meta) {
  if (!meta || typeof meta !== 'object') return true;
  const json = JSON.stringify(meta).toLowerCase();
  for (const word of FINANCIAL_WORDS) {
    if (json.includes(word)) return false;
  }
  return true;
}

function validateBody(body) {
  const errors = [];
  if (!body.label || typeof body.label !== 'string' || body.label.trim().length === 0 || body.label.length > 200) {
    errors.push('label is required and must be 1-200 characters');
  }
  if (!body.type || !VALID_TRACKER_TYPES.includes(body.type)) {
    errors.push('type is required and must be one of: ' + VALID_TRACKER_TYPES.join(', '));
  }
  if (!body.category || !isValidCategory(body.category)) {
    errors.push('category is required and must be a valid category id');
  }
  if (!body.startDate) {
    errors.push('startDate is required');
  }
  if (body.meta !== undefined && !validateMetadata(body.meta)) {
    errors.push('meta must not contain financial data (amount, payment, fee, balance, due)');
  }
  return errors;
}

// List all trackers for user
router.get('/:userId', async (req, res) => {
  try {
    const trackers = await prisma.tracker.findMany({
      where: { userId: req.params.userId },
      include: { entity: true, _count: { select: { obligations: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(trackers);
  } catch (err) {
    console.error('Get trackers error:', err);
    res.status(500).json({ error: 'Failed to get trackers' });
  }
});

// List trackers for specific entity
router.get('/:userId/entity/:eid', async (req, res) => {
  try {
    const trackers = await prisma.tracker.findMany({
      where: { userId: req.params.userId, entityId: req.params.eid },
      include: { _count: { select: { obligations: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(trackers);
  } catch (err) {
    console.error('Get entity trackers error:', err);
    res.status(500).json({ error: 'Failed to get trackers for entity' });
  }
});

// Get single tracker with obligations count
router.get('/:userId/:id', async (req, res) => {
  try {
    const tracker = await prisma.tracker.findFirst({
      where: { id: req.params.id, userId: req.params.userId },
      include: { entity: true, _count: { select: { obligations: true } } },
    });
    if (!tracker) return res.status(404).json({ error: 'Tracker not found' });
    res.json(tracker);
  } catch (err) {
    console.error('Get tracker error:', err);
    res.status(500).json({ error: 'Failed to get tracker' });
  }
});

// Create tracker
router.post('/:userId', async (req, res) => {
  try {
    const errors = validateBody(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const userId = req.params.userId;

    // Validate entityId belongs to user if provided
    if (req.body.entityId) {
      const entity = await prisma.entity.findFirst({
        where: { id: req.body.entityId, userId },
      });
      if (!entity) return res.status(400).json({ errors: ['entityId does not exist or does not belong to user'] });
    }

    const tracker = await prisma.tracker.create({
      data: {
        userId,
        entityId: req.body.entityId,
        type: req.body.type,
        label: req.body.label.trim(),
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
        budgetMinor: req.body.budgetMinor || null,
        meta: req.body.meta || null,
      },
    });

    // Auto-generate obligation for MONTHLY tracker
    if (req.body.type === 'MONTHLY' && req.body.amountMinor && req.body.dueDay) {
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), req.body.dueDay);
      const status = now > dueDate ? 'OVERDUE' : 'PENDING';

      await prisma.obligation.create({
        data: {
          userId,
          entityId: req.body.entityId || null,
          trackerId: tracker.id,
          category: req.body.category,
          label: req.body.label.trim() + ' - ' + now.toLocaleString('en', { month: 'short', year: 'numeric' }),
          amountMinor: req.body.amountMinor,
          dueDate,
          status,
          isRecurring: true,
          recurrenceRule: 'MONTHLY',
        },
      });
    }

    // Auto-generate obligations for SEMESTER with installments
    if (req.body.type === 'SEMESTER' && req.body.amountMinor && Array.isArray(req.body.installments) && req.body.installments.length > 0) {
      const parent = await prisma.obligation.create({
        data: {
          userId,
          entityId: req.body.entityId || null,
          trackerId: tracker.id,
          category: req.body.category,
          label: req.body.label.trim(),
          amountMinor: req.body.amountMinor,
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
          status: 'PENDING',
        },
      });

      for (const inst of req.body.installments) {
        await prisma.obligation.create({
          data: {
            userId,
            entityId: req.body.entityId || null,
            trackerId: tracker.id,
            parentId: parent.id,
            category: req.body.category,
            label: inst.label || parent.label + ' installment',
            amountMinor: inst.amountMinor,
            dueDate: inst.dueDate ? new Date(inst.dueDate) : null,
            status: 'PENDING',
          },
        });
      }
    }

    const result = await prisma.tracker.findUnique({
      where: { id: tracker.id },
      include: { entity: true, obligations: true, _count: { select: { obligations: true } } },
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Create tracker error:', err);
    res.status(500).json({ error: 'Failed to create tracker' });
  }
});

// Update tracker
router.put('/:userId/:id', async (req, res) => {
  try {
    const existing = await prisma.tracker.findFirst({
      where: { id: req.params.id, userId: req.params.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Tracker not found' });
    if (existing.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Only ACTIVE trackers can be updated' });
    }

    const updates = {};
    if (req.body.label !== undefined) {
      if (typeof req.body.label !== 'string' || req.body.label.trim().length === 0 || req.body.label.length > 200) {
        return res.status(400).json({ errors: ['label must be 1-200 characters'] });
      }
      updates.label = req.body.label.trim();
    }
    if (req.body.endDate !== undefined) updates.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    if (req.body.budgetMinor !== undefined) updates.budgetMinor = req.body.budgetMinor;
    if (req.body.status !== undefined) {
      if (!VALID_TRACKER_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ errors: ['status must be one of: ' + VALID_TRACKER_STATUSES.join(', ')] });
      }
      updates.status = req.body.status;
    }
    if (req.body.meta !== undefined) {
      if (!validateMetadata(req.body.meta)) {
        return res.status(400).json({ errors: ['meta must not contain financial data'] });
      }
      updates.meta = req.body.meta;
    }

    const tracker = await prisma.tracker.update({
      where: { id: req.params.id },
      data: updates,
      include: { entity: true, _count: { select: { obligations: true } } },
    });
    res.json(tracker);
  } catch (err) {
    console.error('Update tracker error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Tracker not found' });
    res.status(500).json({ error: 'Failed to update tracker' });
  }
});

// Soft delete tracker (set status=ARCHIVED)
router.delete('/:userId/:id', async (req, res) => {
  try {
    const tracker = await prisma.tracker.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });
    res.json(tracker);
  } catch (err) {
    console.error('Delete tracker error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Tracker not found' });
    res.status(500).json({ error: 'Failed to delete tracker' });
  }
});

module.exports = router;
