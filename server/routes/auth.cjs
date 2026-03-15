const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { generateOTP, sendOTPEmail } = require('../mail.cjs');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

// POST /api/auth/send-otp — send OTP to email (register or login)
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any previous OTPs for this email
    await prisma.otp.deleteMany({ where: { email } });

    // Create new OTP
    await prisma.otp.create({ data: { email, code, expiresAt } });

    // Send email
    await sendOTPEmail(email, code);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Check email configuration.' });
  }
});

// POST /api/auth/verify-otp — verify OTP and login/register
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    // Find valid OTP
    const otp = await prisma.otp.findFirst({
      where: { email, code, verified: false, expiresAt: { gt: new Date() } },
    });

    if (!otp) return res.status(400).json({ error: 'Invalid or expired code' });

    // Mark OTP as verified
    await prisma.otp.update({ where: { id: otp.id }, data: { verified: true } });

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    let isNew = false;

    if (!user) {
      isNew = true;
      user = await prisma.user.create({ data: { email, isLoggedIn: true, lastLoginAt: new Date() } });
      await prisma.settings.create({
        data: {
          userId: user.id,
          notifications: { enabled: true, canteen: true, transport: true },
          privacy: {},
          promotion: {},
          customModules: [],
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isLoggedIn: true, lastLoginAt: new Date() },
      });
    }

    // Clean up old OTPs for this email
    await prisma.otp.deleteMany({ where: { email } });

    res.json({ ...user, isNew });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /api/auth/google — Google Sign-In
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential is required' });

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) return res.status(400).json({ error: 'No email in Google account' });

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    let isNew = false;

    if (!user) {
      isNew = true;
      user = await prisma.user.create({
        data: { email, name: name || null, isLoggedIn: true, lastLoginAt: new Date() },
      });
      await prisma.settings.create({
        data: {
          userId: user.id,
          notifications: { enabled: true, canteen: true, transport: true },
          privacy: {},
          promotion: {},
          customModules: [],
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isLoggedIn: true, lastLoginAt: new Date(), name: user.name || name || null },
      });
    }

    res.json({ ...user, isNew, googleName: name, googlePicture: picture });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

// POST /api/auth/register (kept for backwards compatibility)
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

// POST /api/auth/login (kept for backwards compatibility)
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isLoggedIn: true, lastLoginAt: new Date() },
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
