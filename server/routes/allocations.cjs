const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

// Get allocations for a ledger entry
router.get('/:userId/entry/:entryId', async (req, res) => {
  try {
    // Verify entry belongs to user
    const entry = await prisma.ledgerEntry.findFirst({
      where: { id: req.params.entryId, userId: req.params.userId },
      select: { id: true },
    });
    if (!entry) return res.status(404).json({ error: 'Ledger entry not found' });

    const allocations = await prisma.allocation.findMany({
      where: { ledgerEntryId: req.params.entryId },
      include: { toUser: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(allocations);
  } catch (err) {
    console.error('Get allocations for entry error:', err);
    res.status(500).json({ error: 'Failed to get allocations' });
  }
});

// Get allocations where user is beneficiary
router.get('/:userId/beneficiary/:bid', async (req, res) => {
  try {
    const allocations = await prisma.allocation.findMany({
      where: { toUserId: req.params.bid },
      include: {
        ledgerEntry: {
          select: { id: true, category: true, amountMinor: true, date: true, note: true, userId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(allocations);
  } catch (err) {
    console.error('Get beneficiary allocations error:', err);
    res.status(500).json({ error: 'Failed to get allocations' });
  }
});

// Create allocation
router.post('/:userId', async (req, res) => {
  try {
    const { ledgerEntryId, toUserId, amountMinor, note } = req.body;
    const errors = [];

    if (!ledgerEntryId) errors.push('ledgerEntryId is required');
    if (!toUserId) errors.push('toUserId is required');
    if (!amountMinor || typeof amountMinor !== 'number' || amountMinor <= 0 || !Number.isInteger(amountMinor)) {
      errors.push('amountMinor is required and must be a positive integer');
    }
    if (errors.length) return res.status(400).json({ errors });

    // Verify ledger entry exists and belongs to user
    const entry = await prisma.ledgerEntry.findFirst({
      where: { id: ledgerEntryId, userId: req.params.userId },
    });
    if (!entry) return res.status(400).json({ errors: ['ledgerEntryId does not exist or does not belong to user'] });

    // Verify beneficiary user exists
    const beneficiary = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
    if (!beneficiary) return res.status(400).json({ errors: ['toUserId does not exist'] });

    // Check allocation sum won't exceed entry amount
    const existing = await prisma.allocation.aggregate({
      where: { ledgerEntryId },
      _sum: { amountMinor: true },
    });
    const currentTotal = existing._sum.amountMinor || 0;
    if (currentTotal + amountMinor > entry.amountMinor) {
      return res.status(400).json({
        errors: [`Total allocations (${currentTotal + amountMinor}) would exceed entry amount (${entry.amountMinor})`],
      });
    }

    const allocation = await prisma.allocation.create({
      data: {
        ledgerEntryId,
        toUserId,
        amountMinor,
        note: note || null,
      },
      include: { toUser: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json(allocation);
  } catch (err) {
    console.error('Create allocation error:', err);
    res.status(500).json({ error: 'Failed to create allocation' });
  }
});

// Delete allocation
router.delete('/:userId/:id', async (req, res) => {
  try {
    // Verify allocation belongs to a ledger entry owned by user
    const allocation = await prisma.allocation.findUnique({
      where: { id: req.params.id },
      include: { ledgerEntry: { select: { userId: true } } },
    });
    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });
    if (allocation.ledgerEntry.userId !== req.params.userId) {
      return res.status(403).json({ error: 'Allocation does not belong to user' });
    }

    await prisma.allocation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Allocation deleted' });
  } catch (err) {
    console.error('Delete allocation error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Allocation not found' });
    res.status(500).json({ error: 'Failed to delete allocation' });
  }
});

module.exports = router;
