const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');

router.get('/:userId', async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({ where: { userId: req.params.userId } });
    res.json(loans);
  } catch (err) {
    console.error('Get loans error:', err);
    res.status(500).json({ error: 'Failed to get loans' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, loanType, purpose, principal, annualRate, tenureMonths, gracePeriodMonths, lender, startDate } = req.body;
    if (!userId || !loanType || principal === undefined || annualRate === undefined || tenureMonths === undefined) {
      return res.status(400).json({ error: 'userId, loanType, principal, annualRate, and tenureMonths are required' });
    }
    const loan = await prisma.loan.create({
      data: {
        userId, loanType,
        purpose: purpose || null,
        principal, annualRate, tenureMonths,
        gracePeriodMonths: gracePeriodMonths || 0,
        lender: lender || null,
        startDate: startDate || new Date().toISOString().slice(0, 10),
        payments: [],
      },
    });
    res.status(201).json(loan);
  } catch (err) {
    console.error('Create loan error:', err);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['loanType', 'purpose', 'principal', 'annualRate', 'tenureMonths', 'gracePeriodMonths', 'lender', 'startDate'];
    const data = {};
    for (const f of allowed) { if (req.body[f] !== undefined) data[f] = req.body[f]; }
    const loan = await prisma.loan.update({ where: { id: req.params.id }, data });
    res.json(loan);
  } catch (err) {
    console.error('Update loan error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Loan not found' });
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

router.put('/:id/payment', async (req, res) => {
  try {
    const { payment } = req.body;
    if (!payment || !payment.amount) return res.status(400).json({ error: 'Payment with amount is required' });

    const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const payments = [...(Array.isArray(loan.payments) ? loan.payments : []), payment];
    const updated = await prisma.loan.update({ where: { id: req.params.id }, data: { payments } });
    res.json(updated);
  } catch (err) {
    console.error('Add payment error:', err);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.loan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Loan deleted' });
  } catch (err) {
    console.error('Delete loan error:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Loan not found' });
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});

module.exports = router;
