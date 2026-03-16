const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

router.get('/:userId', async (req, res) => {
  try {
    const uniforms = await prisma.uniform.findMany({
      where: { userId: req.params.userId },
      orderBy: { purchaseDate: 'desc' },
    });
    res.json(uniforms);
  } catch (err) {
    console.error('Get uniforms error:', err);
    res.status(500).json({ error: 'Failed to get uniforms' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, purchaseDate, description, amount } = req.body;
    if (!userId || !purchaseDate || amount === undefined) {
      return res.status(400).json({ error: 'userId, purchaseDate, and amount are required' });
    }
    const uniform = await prisma.uniform.create({
      data: {
        userId, amount,
        purchaseDate: new Date(purchaseDate),
        description: description || null,
      },
    });
    res.status(201).json(uniform);
  } catch (err) {
    console.error('Create uniform error:', err);
    res.status(500).json({ error: 'Failed to create uniform' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { purchaseDate, description, amount } = req.body;
    const data = {};
    if (purchaseDate !== undefined) data.purchaseDate = new Date(purchaseDate);
    if (description !== undefined) data.description = description;
    if (amount !== undefined) data.amount = amount;

    const uniform = await prisma.uniform.update({ where: { id: req.params.id }, data });
    res.json(uniform);
  } catch (err) {
    console.error('Update uniform error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Uniform not found' });
    res.status(500).json({ error: 'Failed to update uniform' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.uniform.delete({ where: { id: req.params.id } });
    res.json({ message: 'Uniform deleted' });
  } catch (err) {
    console.error('Delete uniform error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Uniform not found' });
    res.status(500).json({ error: 'Failed to delete uniform' });
  }
});

module.exports = router;
