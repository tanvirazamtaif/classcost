import { describe, it, expect } from 'vitest';
import { calcLoanSummary, calcPaidVsSchedule, buildAmortization } from '../utils/loan-calc';

describe('calcLoanSummary', () => {
  it('calculates EMI for a standard bank loan', () => {
    const loan = { principal: 100000, annualRate: 12, tenureMonths: 12, gracePeriodMonths: 0, loanType: 'bank_emi' };
    const result = calcLoanSummary(loan);
    expect(result.emi).toBeGreaterThan(0);
    expect(result.totalPayable).toBeGreaterThan(100000);
    expect(result.totalInterest).toBeGreaterThan(0);
    // EMI for 100k at 12% for 12 months should be approximately 8884.88
    expect(Math.round(result.emi)).toBeCloseTo(8885, -1);
  });

  it('handles zero interest rate (family loan)', () => {
    const loan = { principal: 50000, annualRate: 0, tenureMonths: 10, gracePeriodMonths: 0, loanType: 'family' };
    const result = calcLoanSummary(loan);
    expect(result.emi).toBe(5000);
    expect(result.totalPayable).toBe(50000);
    expect(result.totalInterest).toBe(0);
  });

  it('handles grace period', () => {
    const loan = { principal: 100000, annualRate: 12, tenureMonths: 12, gracePeriodMonths: 6, loanType: 'bank_emi' };
    const result = calcLoanSummary(loan);
    expect(result.graceInterest).toBeGreaterThan(0);
    expect(result.totalPayable).toBeGreaterThan(100000);
  });

  it('handles deferred loan type', () => {
    const loan = { principal: 200000, annualRate: 0, tenureMonths: 48, gracePeriodMonths: 0, loanType: 'deferred' };
    const result = calcLoanSummary(loan);
    expect(result.totalPayable).toBe(200000);
  });
});

describe('calcPaidVsSchedule', () => {
  it('calculates paid vs remaining', () => {
    const loan = {
      principal: 100000, annualRate: 0, tenureMonths: 10, gracePeriodMonths: 0, loanType: 'family',
      payments: [{ amount: 30000 }, { amount: 20000 }],
    };
    const result = calcPaidVsSchedule(loan);
    expect(result.paid).toBe(50000);
    expect(result.remaining).toBe(50000);
    expect(result.pct).toBe(50);
  });

  it('handles fully paid loan', () => {
    const loan = {
      principal: 10000, annualRate: 0, tenureMonths: 5, gracePeriodMonths: 0, loanType: 'family',
      payments: [{ amount: 10000 }],
    };
    const result = calcPaidVsSchedule(loan);
    expect(result.remaining).toBe(0);
    expect(result.pct).toBe(100);
  });

  it('handles no payments', () => {
    const loan = {
      principal: 50000, annualRate: 10, tenureMonths: 12, gracePeriodMonths: 0, loanType: 'bank_emi',
      payments: [],
    };
    const result = calcPaidVsSchedule(loan);
    expect(result.paid).toBe(0);
    expect(result.remaining).toBeGreaterThan(0);
  });
});

describe('buildAmortization', () => {
  it('builds amortization rows for a standard loan', () => {
    const loan = { principal: 60000, annualRate: 12, tenureMonths: 6, gracePeriodMonths: 0, loanType: 'bank_emi' };
    const rows = buildAmortization(loan);
    expect(rows.length).toBe(6);
    // Last row balance should be close to 0
    expect(Math.abs(rows[rows.length - 1].balance)).toBeLessThan(1);
  });

  it('includes grace period rows', () => {
    const loan = { principal: 60000, annualRate: 12, tenureMonths: 12, gracePeriodMonths: 3, loanType: 'bank_emi' };
    const rows = buildAmortization(loan);
    const graceRows = rows.filter(r => r.isGrace);
    expect(graceRows.length).toBe(3);
    expect(rows.length).toBe(12);
  });

  it('handles zero interest', () => {
    const loan = { principal: 12000, annualRate: 0, tenureMonths: 4, gracePeriodMonths: 0, loanType: 'family' };
    const rows = buildAmortization(loan);
    expect(rows.length).toBe(4);
    rows.forEach(row => {
      expect(row.interest).toBe(0);
      expect(row.principal).toBe(3000);
    });
  });
});
