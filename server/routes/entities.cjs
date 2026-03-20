const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

const VALID_ENTITY_TYPES = ['INSTITUTION', 'RESIDENCE', 'COACHING', 'ABROAD', 'PERSONAL_PHASE'];

const FINANCIAL_WORDS = ['amount', 'payment', 'fee', 'balance', 'due'];

function validateMetadata(meta) {
  if (!meta || typeof meta !== 'object') return true;
  const json = JSON.stringify(meta).toLowerCase();
  for (const word of FINANCIAL_WORDS) {
    if (json.includes(word)) return false;
  }
  return true;
}

function validateBody(body) {
  const errors = [];
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 200) {
    errors.push('name is required and must be 1-200 characters');
  }
  if (!body.type || !VALID_ENTITY_TYPES.includes(body.type)) {
    errors.push('type is required and must be one of: ' + VALID_ENTITY_TYPES.join(', '));
  }
  if (body.metadata !== undefined && !validateMetadata(body.metadata)) {
    errors.push('metadata must not contain financial data (amount, payment, fee, balance, due)');
  }
  return errors;
}

// List all entities for user
router.get('/:userId', async (req, res) => {
  try {
    const entities = await prisma.entity.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(entities);
  } catch (err) {
    console.error('Get entities error:', err);
    res.status(500).json({ error: 'Failed to get entities' });
  }
});

// Get single entity
router.get('/:userId/:id', async (req, res) => {
  try {
    const entity = await prisma.entity.findFirst({
      where: { id: req.params.id, userId: req.params.userId },
    });
    if (!entity) return res.status(404).json({ error: 'Entity not found' });
    res.json(entity);
  } catch (err) {
    console.error('Get entity error:', err);
    res.status(500).json({ error: 'Failed to get entity' });
  }
});

// Create entity
router.post('/:userId', async (req, res) => {
  try {
    const errors = validateBody(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const entity = await prisma.entity.create({
      data: {
        userId: req.params.userId,
        type: req.body.type,
        name: req.body.name.trim(),
        subType: req.body.subType || null,
        eduLevel: req.body.eduLevel || null,
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
        metadata: req.body.metadata || null,
        parentEntityId: req.body.parentEntityId || null,
      },
    });
    res.status(201).json(entity);
  } catch (err) {
    console.error('Create entity error:', err);
    res.status(500).json({ error: 'Failed to create entity' });
  }
});

// Update entity
router.put('/:userId/:id', async (req, res) => {
  try {
    const errors = validateBody(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const entity = await prisma.entity.update({
      where: { id: req.params.id },
      data: {
        type: req.body.type,
        name: req.body.name.trim(),
        subType: req.body.subType || null,
        eduLevel: req.body.eduLevel || null,
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
        metadata: req.body.metadata || null,
      },
    });
    res.json(entity);
  } catch (err) {
    console.error('Update entity error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Entity not found' });
    res.status(500).json({ error: 'Failed to update entity' });
  }
});

// Soft delete entity
router.delete('/:userId/:id', async (req, res) => {
  try {
    if (req.query.hard === 'true') {
      const entity = await prisma.entity.findFirst({
        where: { id: req.params.id, userId: req.params.userId },
      });
      if (!entity) return res.status(404).json({ error: 'Entity not found' });
      await prisma.entity.delete({ where: { id: req.params.id } });
      return res.json({ deleted: true });
    }
    const entity = await prisma.entity.update({
      where: { id: req.params.id },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    });
    res.json(entity);
  } catch (err) {
    console.error('Delete entity error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Entity not found' });
    res.status(500).json({ error: 'Failed to delete entity' });
  }
});

module.exports = router;
