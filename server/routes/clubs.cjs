const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

router.get('/:userId', async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clubs);
  } catch (err) {
    console.error('Get clubs error:', err);
    res.status(500).json({ error: 'Failed to get clubs' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, name, fee, frequency } = req.body;
    if (!userId || !name || fee === undefined || !frequency) {
      return res.status(400).json({ error: 'userId, name, fee, and frequency are required' });
    }
    const club = await prisma.club.create({
      data: { userId, name, fee, frequency },
    });
    res.status(201).json(club);
  } catch (err) {
    console.error('Create club error:', err);
    res.status(500).json({ error: 'Failed to create club' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, fee, frequency, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (fee !== undefined) data.fee = fee;
    if (frequency !== undefined) data.frequency = frequency;
    if (isActive !== undefined) data.isActive = isActive;

    const club = await prisma.club.update({ where: { id: req.params.id }, data });
    res.json(club);
  } catch (err) {
    console.error('Update club error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Club not found' });
    res.status(500).json({ error: 'Failed to update club' });
  }
});

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
