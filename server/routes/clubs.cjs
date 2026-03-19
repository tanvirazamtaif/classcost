const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

// Get all clubs for user
router.get('/:userId', async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clubs.map(c => ({ ...c.data, _dbId: c.id })));
  } catch (err) {
    console.error('Get clubs error:', err);
    res.status(500).json({ error: 'Failed to get clubs' });
  }
});

// Create a club
router.post('/', async (req, res) => {
  try {
    const { userId, club } = req.body;
    if (!userId || !club) return res.status(400).json({ error: 'userId and club required' });
    const created = await prisma.club.create({
      data: {
        userId,
        institutionName: club.institutionName || '',
        name: club.name || 'Club',
        data: club,
        isActive: club.isActive !== false,
      },
    });
    res.status(201).json({ ...club, _dbId: created.id });
  } catch (err) {
    console.error('Create club error:', err);
    res.status(500).json({ error: 'Failed to create club' });
  }
});

// Update a club
router.put('/:id', async (req, res) => {
  try {
    const { club } = req.body;
    if (!club) return res.status(400).json({ error: 'club data required' });
    const updated = await prisma.club.update({
      where: { id: req.params.id },
      data: {
        institutionName: club.institutionName || '',
        name: club.name || 'Club',
        data: club,
        isActive: club.isActive !== false,
      },
    });
    res.json({ ...club, _dbId: updated.id });
  } catch (err) {
    console.error('Update club error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Club not found' });
    res.status(500).json({ error: 'Failed to update club' });
  }
});

// Delete a club
router.delete('/:id', async (req, res) => {
  try {
    await prisma.club.delete({ where: { id: req.params.id } });
    res.json({ message: 'Club deleted' });
  } catch (err) {
    console.error('Delete club error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Club not found' });
    res.status(500).json({ error: 'Failed to delete club' });
  }
});

module.exports = router;
