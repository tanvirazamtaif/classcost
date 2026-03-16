const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

router.get('/:userId', async (req, res) => {
  try {
    const tutors = await prisma.privateTutor.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tutors);
  } catch (err) {
    console.error('Get tutors error:', err);
    res.status(500).json({ error: 'Failed to get tutors' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, tutorName, subject, monthlyFee, paymentType, sessionsPerWeek } = req.body;
    if (!userId || !tutorName || !subject || monthlyFee === undefined || !paymentType) {
      return res.status(400).json({ error: 'userId, tutorName, subject, monthlyFee, and paymentType are required' });
    }
    const tutor = await prisma.privateTutor.create({
      data: {
        userId, tutorName, subject, monthlyFee, paymentType,
        sessionsPerWeek: sessionsPerWeek || null,
      },
    });
    res.status(201).json(tutor);
  } catch (err) {
    console.error('Create tutor error:', err);
    res.status(500).json({ error: 'Failed to create tutor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { tutorName, subject, monthlyFee, paymentType, sessionsPerWeek, isActive } = req.body;
    const data = {};
    if (tutorName !== undefined) data.tutorName = tutorName;
    if (subject !== undefined) data.subject = subject;
    if (monthlyFee !== undefined) data.monthlyFee = monthlyFee;
    if (paymentType !== undefined) data.paymentType = paymentType;
    if (sessionsPerWeek !== undefined) data.sessionsPerWeek = sessionsPerWeek;
    if (isActive !== undefined) data.isActive = isActive;

    const tutor = await prisma.privateTutor.update({ where: { id: req.params.id }, data });
    res.json(tutor);
  } catch (err) {
    console.error('Update tutor error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Tutor not found' });
    res.status(500).json({ error: 'Failed to update tutor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.privateTutor.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tutor deleted' });
  } catch (err) {
    console.error('Delete tutor error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Tutor not found' });
    res.status(500).json({ error: 'Failed to delete tutor' });
  }
});

module.exports = router;
