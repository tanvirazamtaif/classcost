const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

router.get('/:userId', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { userId: req.params.userId },
      orderBy: { date: 'desc' },
    });
    res.json(events);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, name, amount, date, category } = req.body;
    if (!userId || !name || amount === undefined || !date || !category) {
      return res.status(400).json({ error: 'userId, name, amount, date, and category are required' });
    }
    const event = await prisma.event.create({
      data: {
        userId, name, amount, category,
        date: new Date(date),
      },
    });
    res.status(201).json(event);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, amount, date, category, isPaid } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (amount !== undefined) data.amount = amount;
    if (date !== undefined) data.date = new Date(date);
    if (category !== undefined) data.category = category;
    if (isPaid !== undefined) data.isPaid = isPaid;

    const event = await prisma.event.update({ where: { id: req.params.id }, data });
    res.json(event);
  } catch (err) {
    console.error('Update event error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Event not found' });
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Delete event error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Event not found' });
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
