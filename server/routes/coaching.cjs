const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

router.get('/:userId', async (req, res) => {
  try {
    const centers = await prisma.coachingCenter.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(centers);
  } catch (err) {
    console.error('Get coaching centers error:', err);
    res.status(500).json({ error: 'Failed to get coaching centers' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, name, monthlyFee, totalMonths, startDate } = req.body;
    if (!userId || !name || monthlyFee === undefined || !startDate) {
      return res.status(400).json({ error: 'userId, name, monthlyFee, and startDate are required' });
    }
    const center = await prisma.coachingCenter.create({
      data: {
        userId, name, monthlyFee,
        totalMonths: totalMonths || null,
        startDate: new Date(startDate),
      },
    });
    res.status(201).json(center);
  } catch (err) {
    console.error('Create coaching center error:', err);
    res.status(500).json({ error: 'Failed to create coaching center' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, monthlyFee, totalMonths, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (monthlyFee !== undefined) data.monthlyFee = monthlyFee;
    if (totalMonths !== undefined) data.totalMonths = totalMonths;
    if (isActive !== undefined) data.isActive = isActive;

    const center = await prisma.coachingCenter.update({ where: { id: req.params.id }, data });
    res.json(center);
  } catch (err) {
    console.error('Update coaching center error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Coaching center not found' });
    res.status(500).json({ error: 'Failed to update coaching center' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.coachingCenter.delete({ where: { id: req.params.id } });
    res.json({ message: 'Coaching center deleted' });
  } catch (err) {
    console.error('Delete coaching center error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Coaching center not found' });
    res.status(500).json({ error: 'Failed to delete coaching center' });
  }
});

router.patch('/:id/payment', async (req, res) => {
  try {
    const center = await prisma.coachingCenter.update({
      where: { id: req.params.id },
      data: { monthsPaid: { increment: 1 } },
    });
    res.json(center);
  } catch (err) {
    console.error('Record coaching payment error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Coaching center not found' });
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

module.exports = router;
