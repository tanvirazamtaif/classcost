const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { rankInstitutions } = require('../lib/institutionSearch.cjs');

// Read-only. The Institution Data Center is curated global reference data;
// there are no user-scoped writes here in Phase 1.

// Search institutions for the onboarding autocomplete.
// GET /api/institutions/search?q=monipur&district=Dhaka&limit=8
router.get('/search', async (req, res) => {
  try {
    // Cap query length — a real institution query is short; long input is abuse.
    const q = (req.query.q || '').toString().trim().slice(0, 200);
    if (q.length < 1) return res.json([]);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const district = req.query.district ? String(req.query.district) : undefined;

    // Pull a bounded candidate set, then rank in-process with the pure ranker.
    // (Dataset is small curated reference data; in-memory ranking is fine.)
    const all = (await prisma.institution.findMany({
      select: {
        id: true, name: true, nameBn: true, aliases: true, type: true,
        eduLevel: true, division: true, district: true, area: true, trustLevel: true,
      },
      take: 2000,
    })) || [];

    const ranked = rankInstitutions(all, q, { limit, district });
    res.json(ranked);
  } catch (err) {
    console.error('Institution search error:', err);
    res.status(500).json({ error: 'Failed to search institutions' });
  }
});

// Full template tree for one institution (branches → sections) — drives onboarding.
// GET /api/institutions/:id
router.get('/:id', async (req, res) => {
  try {
    const inst = await prisma.institution.findUnique({
      where: { id: req.params.id },
      include: {
        branches: {
          orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
          include: { sections: { orderBy: { name: 'asc' } } },
        },
      },
    });
    if (!inst) return res.status(404).json({ error: 'Institution not found' });
    res.json(inst);
  } catch (err) {
    console.error('Get institution error:', err);
    res.status(500).json({ error: 'Failed to get institution' });
  }
});

module.exports = router;
