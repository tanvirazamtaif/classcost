const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

const DEFAULTS = {
  notifications: { enabled: true, canteen: true, transport: true },
  privacy: {},
  promotion: {},
  customModules: [],
};

router.get('/:userId', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { userId: req.params.userId } });
    if (!settings) {
      settings = await prisma.settings.create({ data: { userId: req.params.userId, ...DEFAULTS } });
    }
    res.json(settings);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.put('/:userId', async (req, res) => {
  try {
    const { notifications, privacy, promotion, customModules } = req.body;
    const data = {};
    if (notifications !== undefined) data.notifications = notifications;
    if (privacy !== undefined) data.privacy = privacy;
    if (promotion !== undefined) data.promotion = promotion;
    if (customModules !== undefined) data.customModules = customModules;

    const settings = await prisma.settings.upsert({
      where: { userId: req.params.userId },
      update: data,
      create: { userId: req.params.userId, ...DEFAULTS, ...data },
    });
    res.json(settings);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
