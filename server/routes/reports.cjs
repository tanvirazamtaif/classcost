const express = require('express');
const router = express.Router();
const reports = require('../services/reportsEngine.cjs');

// All read-only. Server-side aggregation reads the canonical ledger (deduped),
// fixing the client-side useUnifiedTotals double-count. Additive — the legacy
// hook remains the live dashboard source until totals are verified to match.

// Scoped spending totals (lifetime / thisMonth / lastMonth / thisYear)
router.get('/:userId/summary', async (req, res) => {
  try {
    const summary = await reports.getSummary(req.params.userId);
    res.json(summary);
  } catch (err) {
    console.error('Reports summary error:', err);
    res.status(500).json({ error: 'Failed to build summary' });
  }
});

// BD metric — total waiver/scholarship saved
router.get('/:userId/waiver-saved', async (req, res) => {
  try {
    res.json(await reports.getWaiverSaved(req.params.userId));
  } catch (err) {
    console.error('Waiver-saved error:', err);
    res.status(500).json({ error: 'Failed to compute waiver saved' });
  }
});

// Cost-to-graduation forecast. Assumptions overridable via query:
//   ?semestersRemaining=4&monthsRemaining=24&inflationPct=7.5&waiverPct=40
router.get('/:userId/forecast', async (req, res) => {
  try {
    const num = (v) => (v === undefined ? undefined : Number(v));
    const opts = {
      semestersRemaining: num(req.query.semestersRemaining),
      monthsRemaining: num(req.query.monthsRemaining),
      inflationPct: num(req.query.inflationPct),
      waiverPct: num(req.query.waiverPct),
    };
    // Guard against absurd assumption inputs.
    if (opts.semestersRemaining != null && (opts.semestersRemaining < 0 || opts.semestersRemaining > 40)) {
      return res.status(400).json({ errors: ['semestersRemaining must be 0-40'] });
    }
    if (opts.monthsRemaining != null && (opts.monthsRemaining < 0 || opts.monthsRemaining > 480)) {
      return res.status(400).json({ errors: ['monthsRemaining must be 0-480'] });
    }
    if (opts.inflationPct != null && (opts.inflationPct < 0 || opts.inflationPct > 50)) {
      return res.status(400).json({ errors: ['inflationPct must be 0-50'] });
    }
    const forecast = await reports.getForecast(req.params.userId, opts);
    res.json(forecast);
  } catch (err) {
    console.error('Forecast error:', err);
    res.status(500).json({ error: 'Failed to build forecast' });
  }
});

module.exports = router;
