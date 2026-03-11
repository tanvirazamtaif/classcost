const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

// Simple admin auth middleware
function adminAuth(req, res, next) {
  const pass = req.headers['x-admin-password'];
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET /api/admin/users — list all users with counts
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: { select: { expenses: true, semesters: true, loans: true } },
        settings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/stats — overview stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [userCount, expenseCount, semesterCount, loanCount, promoCount, premiumCount] = await Promise.all([
      prisma.user.count(),
      prisma.expense.count(),
      prisma.semester.count(),
      prisma.loan.count(),
      prisma.promoCode.count(),
      prisma.user.count({ where: { premiumUntil: { gt: new Date() } } }),
    ]);
    res.json({ userCount, expenseCount, semesterCount, loanCount, promoCount, premiumCount });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Promo Codes ─────────────────────────────────────────────────────────────

// GET /api/admin/promos — list all promo codes
router.get('/promos', adminAuth, async (req, res) => {
  try {
    const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(promos);
  } catch (err) {
    console.error('Admin promos error:', err);
    res.status(500).json({ error: 'Failed to fetch promos' });
  }
});

// POST /api/admin/promos — create promo code
router.post('/promos', adminAuth, async (req, res) => {
  try {
    const { code, description, durationDays, maxUses, expiresAt } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase().trim(),
        description: description || null,
        durationDays: durationDays || 30,
        maxUses: maxUses || 100,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json(promo);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Code already exists' });
    console.error('Create promo error:', err);
    res.status(500).json({ error: 'Failed to create promo' });
  }
});

// DELETE /api/admin/promos/:id
router.delete('/promos/:id', adminAuth, async (req, res) => {
  try {
    await prisma.promoCode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete promo error:', err);
    res.status(500).json({ error: 'Failed to delete promo' });
  }
});

// PUT /api/admin/promos/:id/toggle — activate/deactivate
router.put('/promos/:id/toggle', adminAuth, async (req, res) => {
  try {
    const promo = await prisma.promoCode.findUnique({ where: { id: req.params.id } });
    if (!promo) return res.status(404).json({ error: 'Promo not found' });
    const updated = await prisma.promoCode.update({
      where: { id: req.params.id },
      data: { active: !promo.active },
    });
    res.json(updated);
  } catch (err) {
    console.error('Toggle promo error:', err);
    res.status(500).json({ error: 'Failed to toggle promo' });
  }
});

// ── Redeem (public, no admin auth) ──────────────────────────────────────────

// POST /api/admin/redeem — user redeems a promo code
router.post('/redeem', async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'userId and code are required' });

    const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (!promo) return res.status(404).json({ error: 'Invalid promo code' });
    if (!promo.active) return res.status(400).json({ error: 'This promo code is no longer active' });
    if (promo.usedCount >= promo.maxUses) return res.status(400).json({ error: 'This promo code has reached its usage limit' });
    if (promo.expiresAt && new Date() > promo.expiresAt) return res.status(400).json({ error: 'This promo code has expired' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if user already has premium from this code
    if (user.premiumSource === promo.code) {
      return res.status(400).json({ error: 'You have already used this promo code' });
    }

    // Calculate new premium end date
    const now = new Date();
    const currentPremium = user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
    const premiumUntil = new Date(currentPremium.getTime() + promo.durationDays * 24 * 60 * 60 * 1000);

    // Update user and promo in transaction
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { premiumUntil, premiumSource: promo.code },
      }),
      prisma.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    res.json({
      success: true,
      premiumUntil: updatedUser.premiumUntil,
      durationDays: promo.durationDays,
      message: `Premium activated for ${promo.durationDays} days!`,
    });
  } catch (err) {
    console.error('Redeem error:', err);
    res.status(500).json({ error: 'Failed to redeem promo code' });
  }
});

module.exports = router;
