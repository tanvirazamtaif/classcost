const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const {
  generateObligations, redistribute, getSemesterSummary,
  VALID_FEE_CATEGORIES, VALID_BILLING_BASES,
  VALID_OBLIGATION_MODES, VALID_PERIOD_TYPES,
} = require('../services/semesterEngine.cjs');

// POST /api/semester-engine — Create academic period with fee items
router.post('/', async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { entityId, label, periodType, startDate, endDate, obligationMode,
            installmentCount, feeItems, waivers } = req.body;

    if (!entityId || !label || !startDate) {
      return res.status(400).json({ error: 'entityId, label, startDate required' });
    }
    if (periodType && !VALID_PERIOD_TYPES.includes(periodType)) {
      return res.status(400).json({ error: 'Invalid periodType' });
    }
    if (obligationMode && !VALID_OBLIGATION_MODES.includes(obligationMode)) {
      return res.status(400).json({ error: 'Invalid obligationMode' });
    }
    if (!feeItems || !Array.isArray(feeItems) || feeItems.length === 0) {
      return res.status(400).json({ error: 'At least one fee item required' });
    }

    for (const fi of feeItems) {
      if (!fi.label || !fi.feeCategory || !fi.billingBasis || fi.amountMinor == null) {
        return res.status(400).json({ error: 'Each fee item needs label, feeCategory, billingBasis, amountMinor' });
      }
      if (!VALID_FEE_CATEGORIES.includes(fi.feeCategory)) {
        return res.status(400).json({ error: `Invalid feeCategory: ${fi.feeCategory}` });
      }
      if (!VALID_BILLING_BASES.includes(fi.billingBasis)) {
        return res.status(400).json({ error: `Invalid billingBasis: ${fi.billingBasis}` });
      }
    }

    const tracker = await prisma.tracker.create({
      data: {
        userId,
        entityId,
        type: 'SEMESTER',
        label,
        category: 'semester_fee',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: 'ACTIVE',
        academicPeriodType: periodType || 'semester',
        obligationMode: obligationMode || 'pooled',
        installmentCount: installmentCount || 3,
        meta: { periodLabel: label },
      },
    });

    const feeItemData = feeItems.map(fi => ({
      trackerId: tracker.id,
      userId,
      label: fi.label,
      feeCategory: fi.feeCategory,
      billingBasis: fi.billingBasis,
      amountMinor: fi.amountMinor,
      creditCount: fi.creditCount || null,
      ratePerCredit: fi.ratePerCredit || null,
      creditType: fi.creditType || null,
      coveragePeriod: fi.coveragePeriod || null,
      chargedInPeriod: fi.chargedInPeriod || label.toLowerCase().replace(/\s+/g, '-'),
      reportingTreatment: fi.reportingTreatment || 'cost',
      isWaiverEligible: fi.isWaiverEligible !== false,
      subjectCode: fi.subjectCode || null,
      subjectName: fi.subjectName || null,
      examBoard: fi.examBoard || null,
      examSession: fi.examSession || null,
      note: fi.note || null,
      updatedAt: new Date(),
    }));

    await prisma.feeItem.createMany({ data: feeItemData });

    if (waivers && Array.isArray(waivers)) {
      for (const w of waivers) {
        if (!w.label || !w.waiverType || !w.appliesTo) continue;
        await prisma.waiver.create({
          data: {
            trackerId: tracker.id,
            userId,
            label: w.label,
            waiverType: w.waiverType,
            amountMinor: w.amountMinor || null,
            percentage: w.percentage || null,
            appliesTo: w.appliesTo,
            feeCategory: w.feeCategory || null,
            feeItemId: w.feeItemId || null,
            reason: w.reason || null,
          },
        });
      }
    }

    const result = await generateObligations(tracker.id, userId);
    res.status(201).json({ tracker, ...result });
  } catch (err) {
    console.error('POST /api/semester-engine error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/semester-engine/:trackerId/summary — 5-stat summary
router.get('/:trackerId/summary', async (req, res) => {
  try {
    const summary = await getSemesterSummary(req.params.trackerId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/semester-engine/:trackerId/fee-items — Add fee item
router.post('/:trackerId/fee-items', async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    const { label, feeCategory, billingBasis, amountMinor, ...rest } = req.body;

    if (!label || !feeCategory || !billingBasis || amountMinor == null) {
      return res.status(400).json({ error: 'label, feeCategory, billingBasis, amountMinor required' });
    }

    const feeItem = await prisma.feeItem.create({
      data: {
        trackerId: req.params.trackerId, userId, label, feeCategory, billingBasis, amountMinor,
        creditCount: rest.creditCount, ratePerCredit: rest.ratePerCredit, creditType: rest.creditType,
        coveragePeriod: rest.coveragePeriod, chargedInPeriod: rest.chargedInPeriod,
        reportingTreatment: rest.reportingTreatment || 'cost',
        isWaiverEligible: rest.isWaiverEligible !== false,
        note: rest.note, updatedAt: new Date(),
      },
    });

    const result = await redistribute(req.params.trackerId, userId);
    res.status(201).json({ feeItem, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/semester-engine/:trackerId/adjustments — Course drop or fee correction
router.post('/:trackerId/adjustments', async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    const { originalFeeItemId, adjustmentType, label, amountMinor, creditCount, note } = req.body;

    if (!originalFeeItemId || !adjustmentType || amountMinor == null) {
      return res.status(400).json({ error: 'originalFeeItemId, adjustmentType, amountMinor required' });
    }

    const original = await prisma.feeItem.findUnique({ where: { id: originalFeeItemId } });
    if (!original) return res.status(404).json({ error: 'Original fee item not found' });

    const adjustment = await prisma.feeItem.create({
      data: {
        trackerId: req.params.trackerId, userId,
        label: label || `${original.label} adjustment`,
        feeCategory: original.feeCategory,
        billingBasis: original.billingBasis,
        amountMinor: -Math.abs(amountMinor),
        creditCount: creditCount ? -Math.abs(creditCount) : null,
        ratePerCredit: original.ratePerCredit,
        creditType: original.creditType,
        adjustmentOf: originalFeeItemId,
        adjustmentType,
        note: note || `Adjustment: ${adjustmentType}`,
        updatedAt: new Date(),
      },
    });

    const result = await redistribute(req.params.trackerId, userId);
    res.status(201).json({ adjustment, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/semester-engine/:trackerId/waivers — Add waiver
router.post('/:trackerId/waivers', async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    const { label, waiverType, amountMinor, percentage, appliesTo, feeCategory, feeItemId, reason, condition } = req.body;

    if (!label || !waiverType || !appliesTo) {
      return res.status(400).json({ error: 'label, waiverType, appliesTo required' });
    }

    const waiver = await prisma.waiver.create({
      data: {
        trackerId: req.params.trackerId, userId, label, waiverType,
        amountMinor: amountMinor || null, percentage: percentage || null,
        appliesTo, feeCategory: feeCategory || null, feeItemId: feeItemId || null,
        reason: reason || null, condition: condition || null,
        conditionMet: condition ? false : true,
      },
    });

    const result = await redistribute(req.params.trackerId, userId);
    res.status(201).json({ waiver, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/semester-engine/entity/:entityId — List semesters for an entity
router.get('/entity/:entityId', async (req, res) => {
  try {
    const trackers = await prisma.tracker.findMany({
      where: { entityId: req.params.entityId, type: 'SEMESTER' },
      include: {
        feeItems: { where: { isActive: true } },
        waivers: { where: { isActive: true } },
        obligations: true,
        _count: { select: { ledgerEntries: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    res.json(trackers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
