const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.json(existing);

    const user = await prisma.user.create({ data: { email } });

    await prisma.settings.create({
      data: {
        userId: user.id,
        notifications: { enabled: true, canteen: true, transport: true },
        privacy: {},
        promotion: {},
        customModules: [],
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isLoggedIn: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// PUT /api/auth/profile/:id
router.put('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'name', 'eduType', 'institution', 'classLevel', 'currency',
      'familyCode', 'pin', 'parentPin', 'isLoggedIn',
      'profileComplete', 'onboardingSkipped', 'profile',
    ];
    const data = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }

    const user = await prisma.user.update({ where: { id }, data });
    res.json(user);
  } catch (err) {
    console.error('Profile update error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/auth/user/:id
router.get('/user/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { settings: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
