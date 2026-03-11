/**
 * Calculate monthly EMI and totals for a loan.
 * Uses standard amortization formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 * Handles grace periods where interest accrues but no payments are made.
 */
export const calcLoanSummary = (loan) => {
  const P = Number(loan.principal || 0);
  const annualRate = Number(loan.annualRate || 0);
  const tenure = Number(loan.tenureMonths || 12);
  const grace = Number(loan.gracePeriodMonths || 0);

  if (P <= 0) return { emi: 0, totalPayable: 0, totalInterest: 0, graceInterest: 0, repayMonths: 0 };

  const r = annualRate / 100 / 12; // monthly interest rate
  const repayMonths = Math.max(1, tenure - grace);

  // Interest accrued during grace period (compounded monthly)
  let principalAfterGrace = P;
  let graceInterest = 0;
  if (grace > 0 && r > 0) {
    principalAfterGrace = P * Math.pow(1 + r, grace);
    graceInterest = principalAfterGrace - P;
  }

  let emi = 0;
  let totalPayable = 0;
  let totalInterest = 0;

  if (r === 0) {
    // Zero interest loan
    emi = principalAfterGrace / repayMonths;
    totalPayable = principalAfterGrace;
    totalInterest = graceInterest;
  } else if (loan.loanType === "deferred") {
    // Deferred: no EMI, just track total with flat fee
    emi = 0;
    totalPayable = P * (1 + annualRate / 100 * (tenure / 12));
    totalInterest = totalPayable - P;
    graceInterest = 0;
  } else {
    // Standard amortization on post-grace principal
    const factor = Math.pow(1 + r, repayMonths);
    emi = principalAfterGrace * r * factor / (factor - 1);
    totalPayable = emi * repayMonths;
    totalInterest = totalPayable - P; // total interest includes grace interest
  }

  return {
    emi: Math.round(emi * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    graceInterest: Math.round(graceInterest * 100) / 100,
    repayMonths,
  };
};

/**
 * Calculate how much has been paid vs what's scheduled.
 */
export const calcPaidVsSchedule = (loan) => {
  const { totalPayable } = calcLoanSummary(loan);
  const paid = (loan.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remaining = Math.max(0, totalPayable - paid);
  const pct = totalPayable > 0 ? Math.min(100, (paid / totalPayable) * 100) : 0;

  return {
    paid: Math.round(paid * 100) / 100,
    remaining: Math.round(remaining * 100) / 100,
    pct: Math.round(pct * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
  };
};

/**
 * Build a full amortization schedule for display.
 * Each row: { label, payment, principal, interest, balance, isGrace }
 */
export const buildAmortization = (loan) => {
  const P = Number(loan.principal || 0);
  const annualRate = Number(loan.annualRate || 0);
  const tenure = Number(loan.tenureMonths || 12);
  const grace = Number(loan.gracePeriodMonths || 0);
  const r = annualRate / 100 / 12;

  if (P <= 0 || loan.loanType === "deferred") return [];

  const rows = [];
  let balance = P;

  // Grace period rows
  for (let i = 1; i <= grace; i++) {
    const interest = balance * r;
    balance += interest;
    rows.push({
      label: `Month ${i}`,
      payment: 0,
      principal: 0,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      isGrace: true,
    });
  }

  // Repayment period
  const repayMonths = Math.max(1, tenure - grace);
  let emi;
  if (r === 0) {
    emi = balance / repayMonths;
  } else {
    const factor = Math.pow(1 + r, repayMonths);
    emi = balance * r * factor / (factor - 1);
  }

  for (let i = 1; i <= repayMonths; i++) {
    const interest = balance * r;
    const principalPart = Math.min(emi - interest, balance);
    balance = Math.max(0, balance - principalPart);

    rows.push({
      label: `Month ${grace + i}`,
      payment: Math.round(emi * 100) / 100,
      principal: Math.round(principalPart * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      isGrace: false,
    });
  }

  return rows;
};
