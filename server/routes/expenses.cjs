const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

router.get('/:userId', async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: req.params.userId },
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, type, amount, note, date, meta } = req.body;
    if (!userId || !type || amount === undefined) {
      return res.status(400).json({ error: 'userId, type, and amount are required' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (amount > 10000000) {
      return res.status(400).json({ error: 'Amount exceeds maximum limit' });
    }
    const expense = await prisma.expense.create({
      data: {
        userId, type, amount,
        note: note || null,
        date: date || new Date().toISOString().slice(0, 10),
        meta: meta || undefined,
      },
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { type, amount, note, date, meta } = req.body;
    const data = {};
    if (type !== undefined) data.type = type;
    if (amount !== undefined) data.amount = amount;
    if (note !== undefined) data.note = note;
    if (date !== undefined) data.date = date;
    if (meta !== undefined) data.meta = meta;

    const expense = await prisma.expense.update({ where: { id: req.params.id }, data });
    res.json(expense);
  } catch (err) {
    console.error('Update expense error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Expense not found' });
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('Delete expense error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Expense not found' });
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
