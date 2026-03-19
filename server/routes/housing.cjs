const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

// Get all housings for user
router.get('/:userId', async (req, res) => {
  try {
    const housings = await prisma.housing.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(housings.map(h => ({ ...h.data, _dbId: h.id })));
  } catch (err) {
    console.error('Get housings error:', err);
    res.status(500).json({ error: 'Failed to get housings' });
  }
});

// Create a housing setup
router.post('/', async (req, res) => {
  try {
    const { userId, housing } = req.body;
    if (!userId || !housing) {
      return res.status(400).json({ error: 'userId and housing are required' });
    }
    const created = await prisma.housing.create({
      data: {
        userId,
        housingType: housing.type || 'other',
        name: housing.name || 'Housing',
        data: housing,
        isActive: housing.status !== 'inactive',
      },
    });
    res.status(201).json({ ...housing, _dbId: created.id });
  } catch (err) {
    console.error('Create housing error:', err);
    res.status(500).json({ error: 'Failed to create housing' });
  }
});

// Update a housing setup
router.put('/:id', async (req, res) => {
  try {
    const { housing } = req.body;
    if (!housing) {
      return res.status(400).json({ error: 'housing data is required' });
    }
    const updated = await prisma.housing.update({
      where: { id: req.params.id },
      data: {
        housingType: housing.type || 'other',
        name: housing.name || 'Housing',
        data: housing,
        isActive: housing.status !== 'inactive',
      },
    });
    res.json({ ...housing, _dbId: updated.id });
  } catch (err) {
    console.error('Update housing error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Housing not found' });
    res.status(500).json({ error: 'Failed to update housing' });
  }
});

// Delete a housing setup
router.delete('/:id', async (req, res) => {
  try {
    await prisma.housing.delete({ where: { id: req.params.id } });
    res.json({ message: 'Housing deleted' });
  } catch (err) {
    console.error('Delete housing error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Housing not found' });
    res.status(500).json({ error: 'Failed to delete housing' });
  }
});

module.exports = router;
