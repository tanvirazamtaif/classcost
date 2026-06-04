const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const engine = require('../services/recurringEngine.cjs');

const VALID_CADENCES = ['MONTHLY', 'QUARTERLY', 'YEARLY'];

function isPosInt(v) {
  return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

function validateCreate(body) {
  const errors = [];
  if (!body.category || typeof body.category !== 'string') errors.push('category is required');
  if (!body.label || typeof body.label !== 'string' || body.label.trim().length === 0) errors.push('label is required');
  if (!isPosInt(body.amountMinor)) errors.push('amountMinor must be a positive integer');
  if (!body.startDate || isNaN(new Date(body.startDate).getTime())) errors.push('startDate is required and must be a valid date');
  if (body.cadence && !VALID_CADENCES.includes(body.cadence)) errors.push('cadence must be MONTHLY, QUARTERLY, or YEARLY');
  if (body.dueDay !== undefined && (!Number.isInteger(body.dueDay) || body.dueDay < 1 || body.dueDay > 28)) {
    errors.push('dueDay must be an integer 1-28');
  }
  return errors;
}

// Confirm a schedule belongs to the user (ownership guard for mutations).
async function ownedSchedule(userId, scheduleId) {
  return prisma.recurringSchedule.findFirst({ where: { id: scheduleId, userId } });
}

// List a user's schedules
router.get('/:userId', async (req, res) => {
  try {
    const schedules = await prisma.recurringSchedule.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(schedules);
  } catch (err) {
    console.error('List schedules error:', err);
    res.status(500).json({ error: 'Failed to list schedules' });
  }
});

// Create a schedule (materializes initial slots)
router.post('/:userId', async (req, res) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const result = await engine.createSchedule(req.params.userId, req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error('Create schedule error:', err);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// List slots for a schedule (materializes up to today first)
router.get('/:userId/:scheduleId/slots', async (req, res) => {
  try {
    const sched = await ownedSchedule(req.params.userId, req.params.scheduleId);
    if (!sched) return res.status(404).json({ error: 'Schedule not found' });
    await engine.materializeSlots(req.params.scheduleId, { lookaheadMonths: 1 });
    const slots = await prisma.paymentSlot.findMany({
      where: { scheduleId: req.params.scheduleId },
      orderBy: { dueDate: 'asc' },
    });
    res.json(slots);
  } catch (err) {
    console.error('List slots error:', err);
    res.status(500).json({ error: 'Failed to list slots' });
  }
});

// Change the schedule amount (new version + re-price future PENDING slots)
router.patch('/:userId/:scheduleId/amount', async (req, res) => {
  try {
    const sched = await ownedSchedule(req.params.userId, req.params.scheduleId);
    if (!sched) return res.status(404).json({ error: 'Schedule not found' });
    if (!isPosInt(req.body.amountMinor)) return res.status(400).json({ errors: ['amountMinor must be a positive integer'] });
    const updated = await engine.changeAmount(req.params.scheduleId, req.body.amountMinor, req.body.effectiveFrom, req.body.reason);
    res.json(updated);
  } catch (err) {
    console.error('Change amount error:', err);
    res.status(500).json({ error: 'Failed to change amount' });
  }
});

// Toggle autoCreate / isActive / endDate
router.patch('/:userId/:scheduleId', async (req, res) => {
  try {
    const sched = await ownedSchedule(req.params.userId, req.params.scheduleId);
    if (!sched) return res.status(404).json({ error: 'Schedule not found' });
    const data = {};
    if (typeof req.body.autoCreate === 'boolean') data.autoCreate = req.body.autoCreate;
    if (typeof req.body.isActive === 'boolean') data.isActive = req.body.isActive;
    if (req.body.endDate !== undefined) data.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    if (Object.keys(data).length === 0) return res.status(400).json({ errors: ['nothing to update'] });
    const updated = await prisma.recurringSchedule.update({ where: { id: req.params.scheduleId }, data });
    res.json(updated);
  } catch (err) {
    console.error('Update schedule error:', err);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Mark a slot paid (one tap)
router.post('/:userId/slots/:slotId/pay', async (req, res) => {
  try {
    const slot = await prisma.paymentSlot.findFirst({ where: { id: req.params.slotId, userId: req.params.userId } });
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const updated = await engine.markSlotPaid(req.params.slotId, { paidDate: req.body.paidDate });
    res.json(updated);
  } catch (err) {
    console.error('Mark slot paid error:', err);
    res.status(500).json({ error: 'Failed to mark slot paid' });
  }
});

// Undo a mark-paid
router.post('/:userId/slots/:slotId/unpay', async (req, res) => {
  try {
    const slot = await prisma.paymentSlot.findFirst({ where: { id: req.params.slotId, userId: req.params.userId } });
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const updated = await engine.unmarkSlotPaid(req.params.slotId);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Apply an advance payment (N months upfront)
router.post('/:userId/:scheduleId/advance', async (req, res) => {
  try {
    const sched = await ownedSchedule(req.params.userId, req.params.scheduleId);
    if (!sched) return res.status(404).json({ error: 'Schedule not found' });
    if (!isPosInt(req.body.amountMinor)) return res.status(400).json({ errors: ['amountMinor must be a positive integer'] });
    if (!isPosInt(req.body.monthsCovered) || req.body.monthsCovered > 360) {
      return res.status(400).json({ errors: ['monthsCovered must be an integer 1-360'] });
    }
    const advance = await engine.applyAdvance(req.params.scheduleId, req.body);
    res.status(201).json(advance);
  } catch (err) {
    console.error('Apply advance error:', err);
    res.status(500).json({ error: 'Failed to apply advance' });
  }
});

module.exports = router;
