const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const closure = require('../services/closureEngine.cjs');

const VALID_REASONS = ['completed', 'moved_out', 'dropped', 'promoted', 'transferred', 'repeated', 'other'];

// Close a semester tracker (non-destructive: archives + writes ClosureRecord)
router.post('/:userId/semester/:trackerId/close', async (req, res) => {
  try {
    const tracker = await prisma.tracker.findFirst({ where: { id: req.params.trackerId, userId: req.params.userId } });
    if (!tracker) return res.status(404).json({ error: 'Tracker not found' });
    const reason = req.body.closureReason || 'completed';
    if (!VALID_REASONS.includes(reason)) return res.status(400).json({ errors: ['invalid closureReason'] });
    if (req.body.refundableMinor !== undefined && (!Number.isInteger(req.body.refundableMinor) || req.body.refundableMinor < 0)) {
      return res.status(400).json({ errors: ['refundableMinor must be a non-negative integer'] });
    }
    const record = await closure.closeSemester(req.params.trackerId, {
      closureReason: reason,
      effectiveEndDate: req.body.effectiveEndDate,
      refundableMinor: req.body.refundableMinor || 0,
    });
    res.status(201).json(record);
  } catch (err) {
    console.error('Close semester error:', err);
    res.status(500).json({ error: 'Failed to close semester' });
  }
});

// List a user's closure records (with Story Cards)
router.get('/:userId/closures', async (req, res) => {
  try {
    res.json(await closure.listClosures(req.params.userId));
  } catch (err) {
    console.error('List closures error:', err);
    res.status(500).json({ error: 'Failed to list closures' });
  }
});

// Mark a refundable closure settled (refund received)
router.post('/:userId/closures/:id/settle', async (req, res) => {
  try {
    const rec = await prisma.closureRecord.findFirst({ where: { id: req.params.id, userId: req.params.userId } });
    if (!rec) return res.status(404).json({ error: 'Closure not found' });
    res.json(await closure.markRefundReceived(req.params.id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to settle closure' });
  }
});

module.exports = router;
