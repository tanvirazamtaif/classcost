const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

// Get all education fees for user
router.get('/:userId', async (req, res) => {
  try {
    const fees = await prisma.educationFee.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    // Return the full fee objects from the data JSON field
    res.json(fees.map(f => ({ ...f.data, _dbId: f.id })));
  } catch (err) {
    console.error('Get education fees error:', err);
    res.status(500).json({ error: 'Failed to get education fees' });
  }
});

// Save/sync all education fees for user (bulk upsert)
router.post('/sync', async (req, res) => {
  try {
    const { userId, fees } = req.body;
    if (!userId || !Array.isArray(fees)) {
      return res.status(400).json({ error: 'userId and fees array are required' });
    }

    // Delete existing fees for user and re-create
    await prisma.educationFee.deleteMany({ where: { userId } });

    if (fees.length > 0) {
      await prisma.educationFee.createMany({
        data: fees.map(fee => ({
          userId,
          feeType: fee.feeType || 'unknown',
          data: fee,
          isDeleted: fee.isDeleted || false,
        })),
      });
    }

    res.json({ message: 'Fees synced', count: fees.length });
  } catch (err) {
    console.error('Sync education fees error:', err);
    res.status(500).json({ error: 'Failed to sync education fees' });
  }
});

// Add a single education fee
router.post('/', async (req, res) => {
  try {
    const { userId, fee } = req.body;
    if (!userId || !fee) {
      return res.status(400).json({ error: 'userId and fee are required' });
    }
    const created = await prisma.educationFee.create({
      data: {
        userId,
        feeType: fee.feeType || 'unknown',
        data: fee,
        isDeleted: fee.isDeleted || false,
      },
    });
    res.status(201).json({ ...fee, _dbId: created.id });
  } catch (err) {
    console.error('Create education fee error:', err);
    res.status(500).json({ error: 'Failed to create education fee' });
  }
});

// Update a single education fee
router.put('/:id', async (req, res) => {
  try {
    const { fee } = req.body;
    if (!fee) {
      return res.status(400).json({ error: 'fee data is required' });
    }
    const updated = await prisma.educationFee.update({
      where: { id: req.params.id },
      data: {
        feeType: fee.feeType || 'unknown',
        data: fee,
        isDeleted: fee.isDeleted || false,
      },
    });
    res.json({ ...fee, _dbId: updated.id });
  } catch (err) {
    console.error('Update education fee error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Education fee not found' });
    res.status(500).json({ error: 'Failed to update education fee' });
  }
});

// Delete education fee
router.delete('/:id', async (req, res) => {
  try {
    await prisma.educationFee.delete({ where: { id: req.params.id } });
    res.json({ message: 'Education fee deleted' });
  } catch (err) {
    console.error('Delete education fee error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Education fee not found' });
    res.status(500).json({ error: 'Failed to delete education fee' });
  }
});

module.exports = router;
