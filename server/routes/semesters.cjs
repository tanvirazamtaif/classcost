const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

router.get('/:userId', async (req, res) => {
  try {
    const semesters = await prisma.semester.findMany({ where: { userId: req.params.userId } });
    res.json(semesters);
  } catch (err) {
    console.error('Get semesters error:', err);
    res.status(500).json({ error: 'Failed to get semesters' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, name, courses } = req.body;
    if (!userId || !name) return res.status(400).json({ error: 'userId and name are required' });
    const semester = await prisma.semester.create({
      data: { userId, name, courses: courses || [] },
    });
    res.status(201).json(semester);
  } catch (err) {
    console.error('Create semester error:', err);
    res.status(500).json({ error: 'Failed to create semester' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, courses, dropped } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (courses !== undefined) data.courses = courses;
    if (dropped !== undefined) data.dropped = dropped;
    const semester = await prisma.semester.update({ where: { id: req.params.id }, data });
    res.json(semester);
  } catch (err) {
    console.error('Update semester error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Semester not found' });
    res.status(500).json({ error: 'Failed to update semester' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.semester.delete({ where: { id: req.params.id } });
    res.json({ message: 'Semester deleted' });
  } catch (err) {
    console.error('Delete semester error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Semester not found' });
    res.status(500).json({ error: 'Failed to delete semester' });
  }
});

module.exports = router;
