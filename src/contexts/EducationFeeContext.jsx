import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { FEE_STATUS, PAYMENT_PATTERNS } from '../types/educationFees';
import {
  createEducationFee,
  createPayment,
  createInstallment,
  getCurrentPeriod,
  getPeriodFromDate,
  calculatePeriodStatus,
  getCurrentAmount,
  getAmountForPeriod,
  getDaysUntilDue,
  getDueDateForPeriod,
} from '../types/educationFeeSchema';

const EducationFeeContext = createContext(null);

export const useEducationFees = () => {
  const context = useContext(EducationFeeContext);
  if (!context) {
    throw new Error('useEducationFees must be used within EducationFeeProvider');
  }
  return context;
};

export const EducationFeeProvider = ({ children }) => {
  const [fees, setFees] = useLocalStorage('classcost_education_fees', []);
  const [savedCreditRates, setSavedCreditRates] = useLocalStorage('classcost_credit_rates', {
    regular: 5500,
    lab: 6500,
  });

  // ═══════════════════════════════════════════════════════════════
  // CREATE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  const addFee = useCallback((data) => {
    const newFee = createEducationFee(data);

    if (data.alreadyPaidThisMonth && newFee.recurring) {
      const currentPeriod = getCurrentPeriod();
      newFee.periodStatus[currentPeriod] = {
        status: FEE_STATUS.PAID,
        paidAmount: newFee.recurring.amount,
        dueAmount: newFee.recurring.amount,
      };
    }

    setFees(prev => [newFee, ...prev]);
    return newFee;
  }, [setFees]);

  const addSemesterFee = useCallback((data) => {
    let installments = null;

    if (data.isInstallment && data.installmentData) {
      installments = data.installmentData.map((inst, index) =>
        createInstallment({
          part: index + 1,
          amount: inst.amount,
          dueDate: inst.dueDate,
          status: inst.isPaid ? FEE_STATUS.PAID :
                  index === 0 ? FEE_STATUS.UPCOMING : FEE_STATUS.FUTURE,
          paidAt: inst.isPaid ? inst.paidAt || new Date().toISOString() : null,
          paidAmount: inst.isPaid ? inst.amount : 0,
        })
      );
    }

    const feeData = {
      ...data,
      paymentPattern: data.isInstallment ? PAYMENT_PATTERNS.INSTALLMENT : PAYMENT_PATTERNS.SEMESTER,
      installments,
    };

    return addFee(feeData);
  }, [addFee]);

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  const recordPayment = useCallback((feeId, paymentData) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId) return fee;

      const period = paymentData.forPeriod || getCurrentPeriod();
      const dueAmount = getAmountForPeriod(fee, period);
      const existingPaid = fee.periodStatus[period]?.paidAmount || 0;
      const newPaidAmount = existingPaid + paymentData.amount;

      const payment = createPayment({
        ...paymentData,
        forPeriod: period,
        isPartial: newPaidAmount < dueAmount,
        isLate: paymentData.paidAt ?
          new Date(paymentData.paidAt) > getDueDateForPeriod(fee, period) : false,
      });

      const newPeriodStatus = {
        ...fee.periodStatus,
        [period]: {
          status: newPaidAmount >= dueAmount ? FEE_STATUS.PAID : FEE_STATUS.PARTIAL,
          paidAmount: newPaidAmount,
          dueAmount,
          remaining: Math.max(0, dueAmount - newPaidAmount),
          remainingDueDate: paymentData.remainingDueDate || null,
        },
      };

      return {
        ...fee,
        payments: [...fee.payments, payment],
        periodStatus: newPeriodStatus,
        changeHistory: [
          ...fee.changeHistory,
          {
            timestamp: new Date().toISOString(),
            action: 'payment_recorded',
            details: `Paid ৳${paymentData.amount} for ${period}`,
            data: { paymentId: payment.id, period },
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [setFees]);

  const recordPartialPayment = useCallback((feeId, paymentData) => {
    return recordPayment(feeId, { ...paymentData, isPartial: true });
  }, [recordPayment]);

  const recordAdvancePayment = useCallback((feeId, paymentData) => {
    const { amount, months, startPeriod, ...rest } = paymentData;
    const perMonth = amount / months;

    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId) return fee;

      const payments = [];
      const newPeriodStatus = { ...fee.periodStatus };
      let [year, month] = startPeriod.split('-').map(Number);

      for (let i = 0; i < months; i++) {
        const period = `${year}-${String(month).padStart(2, '0')}`;
        const dueAmount = getAmountForPeriod(fee, period);
        const payment = createPayment({ ...rest, amount: perMonth, forPeriod: period, isAdvance: i > 0, advanceMonths: i });
        payments.push(payment);
        newPeriodStatus[period] = { status: FEE_STATUS.PAID, paidAmount: dueAmount, dueAmount };
        month++;
        if (month > 12) { month = 1; year++; }
      }

      return {
        ...fee,
        payments: [...fee.payments, ...payments],
        periodStatus: newPeriodStatus,
        changeHistory: [
          ...fee.changeHistory,
          { timestamp: new Date().toISOString(), action: 'advance_payment', details: `Advance payment for ${months} months (৳${amount})`, data: { months, startPeriod } },
        ],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [setFees]);

  const payInstallment = useCallback((feeId, installmentId, paymentData) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId || !fee.semester?.installments) return fee;

      const payment = createPayment({ ...paymentData, forInstallment: installmentId });

      const updatedInstallments = fee.semester.installments.map(inst => {
        if (inst.id !== installmentId) return inst;
        const newPaidAmount = inst.paidAmount + paymentData.amount;
        const isPaid = newPaidAmount >= inst.amount;
        return {
          ...inst,
          status: isPaid ? FEE_STATUS.PAID : FEE_STATUS.PARTIAL,
          paidAt: isPaid ? new Date().toISOString() : inst.paidAt,
          paidAmount: newPaidAmount,
          payments: [...inst.payments, payment.id],
        };
      });

      // Promote next unpaid to upcoming
      const paidCount = updatedInstallments.filter(i => i.status === FEE_STATUS.PAID).length;
      if (paidCount < updatedInstallments.length) {
        const nextUnpaid = updatedInstallments.find(i => i.status !== FEE_STATUS.PAID);
        if (nextUnpaid && nextUnpaid.status === FEE_STATUS.FUTURE) {
          nextUnpaid.status = FEE_STATUS.UPCOMING;
        }
      }

      return {
        ...fee,
        payments: [...fee.payments, payment],
        semester: { ...fee.semester, installments: updatedInstallments },
        changeHistory: [
          ...fee.changeHistory,
          { timestamp: new Date().toISOString(), action: 'installment_paid', details: `Paid installment ${installmentId} (৳${paymentData.amount})`, data: { installmentId, paymentId: payment.id } },
        ],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [setFees]);

  const skipPeriod = useCallback((feeId, period, reason) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId) return fee;
      return {
        ...fee,
        periodStatus: {
          ...fee.periodStatus,
          [period]: { status: FEE_STATUS.SKIPPED, paidAmount: 0, dueAmount: 0, skipReason: reason || 'Skipped' },
        },
        changeHistory: [
          ...fee.changeHistory,
          { timestamp: new Date().toISOString(), action: 'period_skipped', details: `Skipped ${period}: ${reason || 'No reason'}`, data: { period, reason } },
        ],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [setFees]);

  // ═══════════════════════════════════════════════════════════════
  // UPDATE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  const updateFeeAmount = useCallback((feeId, newAmount, effectiveFrom, reason) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId) return fee;

      const amountHistory = [
        ...fee.amountHistory,
        { amount: newAmount, effectiveFrom: effectiveFrom || new Date().toISOString().split('T')[0], reason: reason || 'Amount updated' },
      ];

      let updatedFee = { ...fee, amountHistory };

      if (fee.recurring) updatedFee.recurring = { ...fee.recurring, amount: newAmount };
      else if (fee.perClass) updatedFee.perClass = { ...fee.perClass, ratePerClass: newAmount };
      else if (fee.yearly) updatedFee.yearly = { ...fee.yearly, amount: newAmount };
      else if (fee.oneTime) updatedFee.oneTime = { ...fee.oneTime, amount: newAmount };
      else if (fee.semester) updatedFee.semester = { ...fee.semester, totalAmount: newAmount };

      updatedFee.changeHistory = [
        ...fee.changeHistory,
        { timestamp: new Date().toISOString(), action: 'amount_updated', details: `Amount changed to ৳${newAmount}`, data: { oldAmount: getCurrentAmount(fee), newAmount, effectiveFrom, reason } },
      ];
      updatedFee.updatedAt = new Date().toISOString();
      return updatedFee;
    }));
  }, [setFees]);

  const updateInstallmentAmount = useCallback((feeId, installmentId, newAmount) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId || !fee.semester?.installments) return fee;
      const oldInstallment = fee.semester.installments.find(i => i.id === installmentId);
      const oldAmount = oldInstallment?.amount || 0;
      const updatedInstallments = fee.semester.installments.map(inst =>
        inst.id !== installmentId ? inst : { ...inst, amount: newAmount }
      );
      return {
        ...fee,
        semester: { ...fee.semester, installments: updatedInstallments },
        changeHistory: [
          ...fee.changeHistory,
          { timestamp: new Date().toISOString(), action: 'installment_updated', details: `Installment changed from ৳${oldAmount} to ৳${newAmount}`, data: { installmentId, oldAmount, newAmount } },
        ],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [setFees]);

  const deactivateFee = useCallback((feeId, endDate, reason) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId) return fee;
      let updatedFee = { ...fee };
      if (fee.recurring) updatedFee.recurring = { ...fee.recurring, isActive: false, endDate: endDate || new Date().toISOString().split('T')[0] };
      else if (fee.perClass) updatedFee.perClass = { ...fee.perClass, isActive: false };
      else if (fee.yearly) updatedFee.yearly = { ...fee.yearly, isActive: false };
      updatedFee.changeHistory = [
        ...fee.changeHistory,
        { timestamp: new Date().toISOString(), action: 'deactivated', details: `Fee deactivated: ${reason || 'No reason'}`, data: { endDate, reason } },
      ];
      updatedFee.updatedAt = new Date().toISOString();
      return updatedFee;
    }));
  }, [setFees]);

  const reactivateFee = useCallback((feeId) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId) return fee;
      let updatedFee = { ...fee };
      if (fee.recurring) updatedFee.recurring = { ...fee.recurring, isActive: true, endDate: null };
      else if (fee.perClass) updatedFee.perClass = { ...fee.perClass, isActive: true };
      else if (fee.yearly) updatedFee.yearly = { ...fee.yearly, isActive: true };
      updatedFee.changeHistory = [
        ...fee.changeHistory,
        { timestamp: new Date().toISOString(), action: 'reactivated', details: 'Fee reactivated' },
      ];
      updatedFee.updatedAt = new Date().toISOString();
      return updatedFee;
    }));
  }, [setFees]);

  const deleteFee = useCallback((feeId) => {
    setFees(prev => prev.filter(fee => fee.id !== feeId));
  }, [setFees]);

  // ═══════════════════════════════════════════════════════════════
  // QUERY OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  const getFeeById = useCallback((feeId) => {
    return fees.find(fee => fee.id === feeId);
  }, [fees]);

  const getActiveRecurringFees = useMemo(() => {
    return fees.filter(fee => fee.recurring?.isActive || fee.perClass?.isActive);
  }, [fees]);

  const getUpcomingPayments = useMemo(() => {
    const today = new Date();
    const upcoming = [];

    fees.forEach(fee => {
      if (fee.recurring?.isActive) {
        const currentPeriod = getCurrentPeriod();
        const status = calculatePeriodStatus(fee, currentPeriod);
        if (status === FEE_STATUS.UPCOMING || status === FEE_STATUS.OVERDUE || status === FEE_STATUS.PARTIAL) {
          const dueDate = getDueDateForPeriod(fee, currentPeriod);
          const periodData = fee.periodStatus[currentPeriod];
          upcoming.push({
            fee, type: 'recurring', period: currentPeriod,
            amount: fee.recurring.amount,
            paidAmount: periodData?.paidAmount || 0,
            remainingAmount: fee.recurring.amount - (periodData?.paidAmount || 0),
            dueDate, daysUntilDue: getDaysUntilDue(dueDate), status,
          });
        }
      }

      if (fee.semester?.installments) {
        fee.semester.installments.forEach(inst => {
          if (inst.status === FEE_STATUS.UPCOMING || inst.status === FEE_STATUS.OVERDUE || inst.status === FEE_STATUS.PARTIAL) {
            const dueDate = new Date(inst.dueDate);
            upcoming.push({
              fee, type: 'installment', installment: inst,
              amount: inst.amount, paidAmount: inst.paidAmount,
              remainingAmount: inst.amount - inst.paidAmount,
              dueDate, daysUntilDue: getDaysUntilDue(dueDate), status: inst.status,
            });
          }
        });
      }

      if (fee.yearly?.isActive) {
        const thisYear = today.getFullYear();
        const dueDate = new Date(thisYear, fee.yearly.dueMonth - 1, fee.yearly.dueDay);
        const daysUntil = getDaysUntilDue(dueDate);
        if (daysUntil >= -30 && daysUntil <= 30) {
          const period = `${thisYear}`;
          const periodData = fee.periodStatus[period];
          if (!periodData || periodData.status !== FEE_STATUS.PAID) {
            upcoming.push({
              fee, type: 'yearly', period,
              amount: fee.yearly.amount,
              paidAmount: periodData?.paidAmount || 0,
              remainingAmount: fee.yearly.amount - (periodData?.paidAmount || 0),
              dueDate, daysUntilDue: daysUntil,
              status: daysUntil < 0 ? FEE_STATUS.OVERDUE : FEE_STATUS.UPCOMING,
            });
          }
        }
      }

      if (fee.oneTime && !fee.oneTime.isPaid && fee.oneTime.dueDate) {
        const dueDate = new Date(fee.oneTime.dueDate);
        const daysUntil = getDaysUntilDue(dueDate);
        if (daysUntil >= -30 && daysUntil <= 30) {
          upcoming.push({
            fee, type: 'one_time',
            amount: fee.oneTime.amount, paidAmount: 0,
            remainingAmount: fee.oneTime.amount,
            dueDate, daysUntilDue: daysUntil,
            status: daysUntil < 0 ? FEE_STATUS.OVERDUE : FEE_STATUS.UPCOMING,
          });
        }
      }
    });

    return upcoming.sort((a, b) => {
      if (a.status === FEE_STATUS.OVERDUE && b.status !== FEE_STATUS.OVERDUE) return -1;
      if (b.status === FEE_STATUS.OVERDUE && a.status !== FEE_STATUS.OVERDUE) return 1;
      return a.daysUntilDue - b.daysUntilDue;
    });
  }, [fees]);

  const getOverduePayments = useMemo(() => {
    return getUpcomingPayments.filter(p => p.status === FEE_STATUS.OVERDUE);
  }, [getUpcomingPayments]);

  const getPaymentHistory = useCallback((feeId) => {
    const fee = fees.find(f => f.id === feeId);
    if (!fee) return [];
    return [...fee.payments].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  }, [fees]);

  const getTotalPaidThisMonth = useMemo(() => {
    const currentPeriod = getCurrentPeriod();
    let total = 0;
    fees.forEach(fee => {
      fee.payments.forEach(payment => {
        if (getPeriodFromDate(payment.paidAt) === currentPeriod) total += payment.amount;
      });
    });
    return total;
  }, [fees]);

  const getTotalPaidAllTime = useMemo(() => {
    let total = 0;
    fees.forEach(fee => {
      fee.payments.forEach(payment => { total += payment.amount; });
    });
    return total;
  }, [fees]);

  const value = {
    fees, savedCreditRates, setSavedCreditRates,
    addFee, addSemesterFee,
    recordPayment, recordPartialPayment, recordAdvancePayment, payInstallment, skipPeriod,
    updateFeeAmount, updateInstallmentAmount, deactivateFee, reactivateFee, deleteFee,
    getFeeById, getActiveRecurringFees, getUpcomingPayments, getOverduePayments,
    getPaymentHistory, getTotalPaidThisMonth, getTotalPaidAllTime,
  };

  return (
    <EducationFeeContext.Provider value={value}>
      {children}
    </EducationFeeContext.Provider>
  );
};
