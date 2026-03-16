const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

router.get('/:userId', async (req, res) => {
  try {
    const batches = await prisma.batch.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(batches);
  } catch (err) {
    console.error('Get batches error:', err);
    res.status(500).json({ error: 'Failed to get batches' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, name, fee, frequency, startDate, endDate } = req.body;
    if (!userId || !name || fee === undefined || !frequency || !startDate) {
      return res.status(400).json({ error: 'userId, name, fee, frequency, and startDate are required' });
    }
    const batch = await prisma.batch.create({
      data: {
        userId, name, fee, frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    });
    res.status(201).json(batch);
  } catch (err) {
    console.error('Create batch error:', err);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, fee, frequency, isPaid, startDate, endDate } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (fee !== undefined) data.fee = fee;
    if (frequency !== undefined) data.frequency = frequency;
    if (isPaid !== undefined) data.isPaid = isPaid;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;

    const batch = await prisma.batch.update({ where: { id: req.params.id }, data });
    res.json(batch);
  } catch (err) {
    console.error('Update batch error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Batch not found' });
    res.status(500).json({ error: 'Failed to update batch' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.batch.delete({ where: { id: req.params.id } });
    res.json({ message: 'Batch deleted' });
  } catch (err) {
    console.error('Delete batch error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Batch not found' });
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

module.exports = router;
