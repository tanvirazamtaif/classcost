import { PAYMENT_PATTERNS, FEE_STATUS } from './educationFees';

// ═══════════════════════════════════════════════════════════════
// EDUCATION FEE SCHEMA - Complete Data Model
// ═══════════════════════════════════════════════════════════════

export const generateId = (prefix = 'edu') => {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
};

export const createEducationFee = (data) => {
  const now = new Date().toISOString();

  return {
    id: generateId('fee'),
    feeType: data.feeType,
    customTypeName: data.customTypeName || null,
    name: data.name || '',
    icon: data.icon || '🎓',
    paymentPattern: data.paymentPattern,

    recurring: data.paymentPattern === PAYMENT_PATTERNS.RECURRING ? {
      amount: data.amount || 0,
      dueDay: data.dueDay || 10,
      reminderDays: data.reminderDays || 2,
      startDate: data.startDate || now.split('T')[0],
      endDate: data.endDate || null,
      isActive: true,
    } : null,

    perClass: data.paymentPattern === PAYMENT_PATTERNS.PER_CLASS ? {
      ratePerClass: data.ratePerClass || 0,
      dueDay: data.dueDay || 10,
      reminderDays: data.reminderDays || 2,
      isActive: true,
    } : null,

    semester: data.paymentPattern === PAYMENT_PATTERNS.SEMESTER ||
              data.paymentPattern === PAYMENT_PATTERNS.INSTALLMENT ? {
      semesterName: data.semesterName || '',
      totalAmount: data.amount || 0,
      dueDate: data.dueDate || null,
      isPerCredit: data.isPerCredit || false,
      creditBreakdown: data.creditBreakdown || null,
      isInstallment: data.isInstallment || false,
      installments: data.installments || null,
    } : null,

    yearly: data.paymentPattern === PAYMENT_PATTERNS.YEARLY ? {
      amount: data.amount || 0,
      dueMonth: data.dueMonth || 1,
      dueDay: data.dueDay || 15,
      reminderDays: data.reminderDays || 7,
      isActive: true,
    } : null,

    oneTime: data.paymentPattern === PAYMENT_PATTERNS.ONE_TIME ? {
      amount: data.amount || 0,
      dueDate: data.dueDate || null,
      isPaid: data.isPaid || false,
      paidAt: data.paidAt || null,
    } : null,

    payments: data.initialPayment ? [{
      id: generateId('pay'),
      amount: data.initialPayment.amount,
      paidAt: data.initialPayment.paidAt || now,
      method: data.initialPayment.method || null,
      forPeriod: data.initialPayment.forPeriod || getCurrentPeriod(),
      isPartial: false,
      isLate: false,
      lateFee: 0,
      discount: data.initialPayment.discount || 0,
      discountReason: data.initialPayment.discountReason || null,
      note: data.initialPayment.note || null,
      receiptNumber: data.initialPayment.receiptNumber || null,
    }] : [],

    periodStatus: {},

    amountHistory: [{
      amount: data.amount || 0,
      effectiveFrom: now.split('T')[0],
      reason: 'Initial setup',
    }],

    changeHistory: [{
      timestamp: now,
      action: 'created',
      details: `Created ${data.feeType} fee`,
      data: null,
    }],

    createdAt: now,
    updatedAt: now,
  };
};

export const createPayment = (data) => {
  return {
    id: generateId('pay'),
    amount: data.amount,
    paidAt: data.paidAt || new Date().toISOString(),
    method: data.method || null,
    forPeriod: data.forPeriod,
    forInstallment: data.forInstallment || null,
    isPartial: data.isPartial || false,
    isLate: data.isLate || false,
    lateFee: data.lateFee || 0,
    isAdvance: data.isAdvance || false,
    advanceMonths: data.advanceMonths || 0,
    discount: data.discount || 0,
    discountReason: data.discountReason || null,
    note: data.note || null,
    receiptNumber: data.receiptNumber || null,
  };
};

export const createInstallment = (data) => {
  return {
    id: generateId('inst'),
    part: data.part,
    amount: data.amount,
    dueDate: data.dueDate,
    status: data.status || FEE_STATUS.FUTURE,
    paidAt: data.paidAt || null,
    paidAmount: data.paidAmount || 0,
    payments: [],
  };
};

export const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getPeriodFromDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const getDueDateForPeriod = (fee, period) => {
  const [year, month] = period.split('-').map(Number);
  const dueDay = fee.recurring?.dueDay || fee.perClass?.dueDay || 10;
  return new Date(year, month - 1, dueDay);
};

export const calculatePeriodStatus = (fee, period) => {
  const today = new Date();
  const dueDate = getDueDateForPeriod(fee, period);
  const periodData = fee.periodStatus[period];
  const dueAmount = getCurrentAmount(fee);
  const paidAmount = periodData?.paidAmount || 0;

  if (periodData?.status === FEE_STATUS.SKIPPED) return FEE_STATUS.SKIPPED;
  if (paidAmount >= dueAmount) return FEE_STATUS.PAID;
  if (paidAmount > 0 && paidAmount < dueAmount) return FEE_STATUS.PARTIAL;
  if (dueDate < today) return FEE_STATUS.OVERDUE;

  const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  if (daysUntilDue <= 7) return FEE_STATUS.UPCOMING;
  return FEE_STATUS.FUTURE;
};

export const getCurrentAmount = (fee) => {
  if (fee.recurring) return fee.recurring.amount;
  if (fee.perClass) return fee.perClass.ratePerClass;
  if (fee.semester) return fee.semester.totalAmount;
  if (fee.yearly) return fee.yearly.amount;
  if (fee.oneTime) return fee.oneTime.amount;
  return 0;
};

export const getAmountForPeriod = (fee, period) => {
  const periodDate = new Date(period + '-01');
  const effectiveAmount = [...fee.amountHistory]
    .reverse()
    .find(h => new Date(h.effectiveFrom) <= periodDate);
  return effectiveAmount?.amount || getCurrentAmount(fee);
};

export const getDaysUntilDue = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

export const isPaymentLate = (fee, period, paymentDate) => {
  const dueDate = getDueDateForPeriod(fee, period);
  return new Date(paymentDate) > dueDate;
};

export const validateInstallmentsTotal = (installments, totalAmount) => {
  const sum = installments.reduce((acc, inst) => acc + inst.amount, 0);
  return Math.abs(sum - totalAmount) < 1;
};

export const calculatePerCreditTotal = (creditBreakdown) => {
  let total = 0;
  if (creditBreakdown.regular) {
    total += creditBreakdown.regular.rate * creditBreakdown.regular.credits;
  }
  if (creditBreakdown.lab) {
    total += creditBreakdown.lab.rate * creditBreakdown.lab.credits;
  }
  if (creditBreakdown.other) {
    creditBreakdown.other.forEach(item => {
      total += item.rate * item.credits;
    });
  }
  return total;
};
