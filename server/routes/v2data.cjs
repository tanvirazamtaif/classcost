const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { verifyUserToken } = require('../lib/userAuth.cjs');

// Explicit per-request auth: the token's subject must match the :userId in the path.
// This protects the route regardless of the global REQUIRE_AUTH flag.
function requireSelf(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return null; }
  try {
    const decoded = verifyUserToken(token);
    if (decoded.sub !== req.params.userId) { res.status(403).json({ error: 'Forbidden' }); return null; }
    return decoded.sub;
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' }); return null;
  }
}

// GET /api/v2data/:userId — the user's whole v2 tree (null if never saved).
router.get('/:userId', async (req, res) => {
  if (!requireSelf(req, res)) return;
  try {
    const doc = await prisma.v2Document.findUnique({ where: { userId: req.params.userId } });
    res.json({ data: doc ? doc.data : null, updatedAt: doc ? doc.updatedAt : null });
  } catch (err) {
    console.error('Get v2data error:', err);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// PUT /api/v2data/:userId — upsert the whole tree.
router.put('/:userId', async (req, res) => {
  if (!requireSelf(req, res)) return;
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data object is required' });
    const doc = await prisma.v2Document.upsert({
      where: { userId: req.params.userId },
      update: { data, version: { increment: 1 } },
      create: { userId: req.params.userId, data, version: 1 },
    });
    res.json({ data: doc.data, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('Put v2data error:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

module.exports = router;
