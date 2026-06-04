const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const circles = require('../services/circlesEngine.cjs');

const VALID_PRESETS = ['fee_buddy', 'full_picture', 'custodian', 'custom'];

async function ownedCircle(ownerUserId, circleId) {
  return prisma.trustedCircle.findFirst({ where: { id: circleId, ownerUserId } });
}

// List circles (+ permissions)
router.get('/:userId', async (req, res) => {
  try {
    res.json(await circles.listCircles(req.params.userId));
  } catch (err) {
    console.error('List circles error:', err);
    res.status(500).json({ error: 'Failed to list circles' });
  }
});

// Create a circle
router.post('/:userId', async (req, res) => {
  try {
    if (!req.body.label || typeof req.body.label !== 'string' || !req.body.label.trim()) {
      return res.status(400).json({ errors: ['label is required'] });
    }
    if (req.body.preset && !VALID_PRESETS.includes(req.body.preset)) {
      return res.status(400).json({ errors: ['invalid preset'] });
    }
    const circle = await circles.createCircle(req.params.userId, req.body);
    res.status(201).json(circle);
  } catch (err) {
    console.error('Create circle error:', err);
    res.status(500).json({ error: 'Failed to create circle' });
  }
});

// Pause / revoke / reactivate
router.patch('/:userId/:circleId/status', async (req, res) => {
  try {
    const owned = await ownedCircle(req.params.userId, req.params.circleId);
    if (!owned) return res.status(404).json({ error: 'Circle not found' });
    const updated = await circles.setStatus(req.params.circleId, req.body.status);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Toggle a section's visibility
router.patch('/:userId/:circleId/permission', async (req, res) => {
  try {
    const owned = await ownedCircle(req.params.userId, req.params.circleId);
    if (!owned) return res.status(404).json({ error: 'Circle not found' });
    const updated = await circles.setPermission(req.params.circleId, req.body.section, req.body.visibility);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
