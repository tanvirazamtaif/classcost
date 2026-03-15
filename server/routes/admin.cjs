const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin credentials from environment
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'classcost-admin-secret-change-me';

// Legacy simple auth (kept for backward compat during transition)
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

// ── JWT Auth Middleware ──────────────────────────────────────────────────────

function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  // Also accept legacy header-based auth
  const legacyPass = req.headers['x-admin-password'];
  if (legacyPass === ADMIN_PASS) return next();

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── POST /api/admin/login ────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // If bcrypt hash is set, use it; otherwise fall back to plain comparison
  let isValid = false;
  if (ADMIN_PASSWORD_HASH) {
    isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  } else {
    isValid = password === ADMIN_PASS;
  }

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, expiresIn: '8h' });
});

// ── GET /api/admin/dashboard ─────────────────────────────────────────────────

router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      activeUsersWeek,
      totalExpenses,
      totalSemesters,
      totalLoans,
      premiumCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),
      prisma.expense.count(),
      prisma.semester.count(),
      prisma.loan.count(),
      prisma.user.count({ where: { premiumUntil: { gt: new Date() } } }),
    ]);

    res.json({
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      activeUsersWeek,
      totalExpenses,
      totalSemesters,
      totalLoans,
      premiumCount,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────

router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { institution: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const validSortFields = ['createdAt', 'name', 'email', 'lastLoginAt'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          institution: true,
          eduType: true,
          currency: true,
          profile: true,
          isLoggedIn: true,
          profileComplete: true,
          premiumUntil: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              expenses: true,
              semesters: true,
              loans: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── GET /api/admin/users/:id ─────────────────────────────────────────────────

router.get('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
        _count: {
          select: {
            expenses: true,
            semesters: true,
            loans: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('User detail error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── GET /api/admin/analytics/signups ─────────────────────────────────────────

router.get('/analytics/signups', verifyAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Aggregate by day
    const dailySignups = {};
    users.forEach((u) => {
      const day = u.createdAt.toISOString().split('T')[0];
      dailySignups[day] = (dailySignups[day] || 0) + 1;
    });

    res.json(dailySignups);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ── GET /api/admin/analytics/education-levels ────────────────────────────────

router.get('/analytics/education-levels', verifyAdmin, async (req, res) => {
  try {
    // profile is a JSON field, so we query all users and aggregate in JS
    const users = await prisma.user.findMany({
      select: { profile: true, eduType: true },
    });

    const counts = {};
    users.forEach((u) => {
      const level =
        (u.profile && typeof u.profile === 'object' ? u.profile.educationLevel : null) ||
        u.eduType ||
        'unknown';
      counts[level] = (counts[level] || 0) + 1;
    });

    const result = Object.entries(counts).map(([level, count]) => ({
      educationLevel: level,
      _count: count,
    }));

    res.json(result);
  } catch (error) {
    console.error('Education levels error:', error);
    res.status(500).json({ error: 'Failed to fetch education levels' });
  }
});

// ── GET /api/admin/stats — legacy endpoint (kept for compat) ─────────────────

router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const [userCount, expenseCount, semesterCount, loanCount, promoCount, premiumCount] =
      await Promise.all([
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
router.get('/promos', verifyAdmin, async (req, res) => {
  try {
    const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(promos);
  } catch (err) {
    console.error('Admin promos error:', err);
    res.status(500).json({ error: 'Failed to fetch promos' });
  }
});

// POST /api/admin/promos — create promo code
router.post('/promos', verifyAdmin, async (req, res) => {
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
router.delete('/promos/:id', verifyAdmin, async (req, res) => {
  try {
    await prisma.promoCode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete promo error:', err);
    res.status(500).json({ error: 'Failed to delete promo' });
  }
});

// PUT /api/admin/promos/:id/toggle — activate/deactivate
router.put('/promos/:id/toggle', verifyAdmin, async (req, res) => {
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

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });
    if (!promo) return res.status(404).json({ error: 'Invalid promo code' });
    if (!promo.active)
      return res.status(400).json({ error: 'This promo code is no longer active' });
    if (promo.usedCount >= promo.maxUses)
      return res.status(400).json({ error: 'This promo code has reached its usage limit' });
    if (promo.expiresAt && new Date() > promo.expiresAt)
      return res.status(400).json({ error: 'This promo code has expired' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if user already has premium from this code
    if (user.premiumSource === promo.code) {
      return res.status(400).json({ error: 'You have already used this promo code' });
    }

    // Calculate new premium end date
    const now = new Date();
    const currentPremium = user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
    const premiumUntil = new Date(
      currentPremium.getTime() + promo.durationDays * 24 * 60 * 60 * 1000
    );

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
