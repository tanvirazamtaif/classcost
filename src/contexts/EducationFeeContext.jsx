import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import * as api from '../api';
import { FEE_STATUS, PAYMENT_PATTERNS, CONSTANTS } from '../types/educationFees';
import {
  createEducationFee,
  createPayment,
  createInstallment,
  getCurrentPeriod,
  getNextPeriod,
  getPeriodFromDate,
  getYearlyPeriod,
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

// Helper: update fee with change history
const updateFeeWithHistory = (fee, changes, action, details, data = null) => {
  return {
    ...fee,
    ...changes,
    changeHistory: [
      ...fee.changeHistory,
      { timestamp: new Date().toISOString(), action, details, data },
    ],
    updatedAt: new Date().toISOString(),
  };
};

// Helper: add payment to paymentsByPeriod index
const indexPayment = (paymentsByPeriod, period, paymentId) => {
  const existing = paymentsByPeriod[period] || [];
  return { ...paymentsByPeriod, [period]: [...existing, paymentId] };
};

// localStorage key for migration
const LOCAL_STORAGE_KEY = 'classcost_education_fees';
const CREDIT_RATES_KEY = 'classcost_credit_rates';

export const EducationFeeProvider = ({ children }) => {
  const { user } = useApp();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedCreditRates, setSavedCreditRates] = useState({
    regular: CONSTANTS.DEFAULT_CREDIT_RATE,
    regularCredits: '',
    lab: CONSTANTS.DEFAULT_LAB_RATE,
    labCredits: '',
    hadLab: false,
  });
  const syncTimeoutRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Load fees from database when user logs in
  useEffect(() => {
    if (!user?.id) {
      setFees([]);
      setLoading(false);
      return;
    }

    const loadFees = async () => {
      setLoading(true);
      try {
        const dbFees = await api.getEducationFees(user.id);
        if (dbFees && dbFees.length > 0) {
          setFees(dbFees);
        } else {
          // Check localStorage for migration
          const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (localData) {
            try {
              const localFees = JSON.parse(localData);
              if (Array.isArray(localFees) && localFees.length > 0) {
                setFees(localFees);
                // Sync to database
                await api.syncEducationFees(user.id, localFees);
                // Clear localStorage after successful migration
                localStorage.removeItem(LOCAL_STORAGE_KEY);
              }
            } catch (e) {
              console.error('Failed to migrate localStorage fees:', e);
            }
          }
        }

        // Load credit rates from localStorage (small config, keep local)
        const savedRates = localStorage.getItem(CREDIT_RATES_KEY);
        if (savedRates) {
          try { setSavedCreditRates(JSON.parse(savedRates)); } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.error('Failed to load education fees:', err);
        // Fallback to localStorage if API fails
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          try { setFees(JSON.parse(localData)); } catch (e) { /* ignore */ }
        }
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    };

    loadFees();
  }, [user?.id]);

  // Debounced sync to database on fee changes
  useEffect(() => {
    if (isInitialLoad.current || !user?.id || loading) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      api.syncEducationFees(user.id, fees).catch(err => {
        console.error('Failed to sync fees to database:', err);
      });
    }, 1000);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [fees, user?.id, loading]);

  // Save credit rates to localStorage when changed
  const updateCreditRates = useCallback((rates) => {
    setSavedCreditRates(rates);
    localStorage.setItem(CREDIT_RATES_KEY, JSON.stringify(rates));
  }, []);

  // Active fees (exclude soft-deleted)
  const activeFees = useMemo(() => fees.filter(f => !f.isDeleted), [fees]);

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
        remaining: 0,
      };
      // Create next period as upcoming
      const nextPeriod = getNextPeriod(currentPeriod);
      newFee.periodStatus[nextPeriod] = {
        status: FEE_STATUS.UPCOMING,
        paidAmount: 0,
        dueAmount: newFee.recurring.amount,
        remaining: newFee.recurring.amount,
      };
    }

    setFees(prev => [newFee, ...prev]);
    return newFee;
  }, []);

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
        forFeeType: fee.feeType,
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

      // Auto-create next period if fully paid (recurring/yearly)
      if (newPaidAmount >= dueAmount && fee.recurring?.isActive) {
        const nextPeriod = getNextPeriod(period);
        if (!newPeriodStatus[nextPeriod]) {
          newPeriodStatus[nextPeriod] = {
            status: FEE_STATUS.UPCOMING,
            paidAmount: 0,
            dueAmount: getCurrentAmount(fee),
            remaining: getCurrentAmount(fee),
          };
        }
      }

      if (newPaidAmount >= dueAmount && fee.yearly?.isActive) {
        const nextYearly = getYearlyPeriod(parseInt(period) + 1);
        if (!newPeriodStatus[nextYearly]) {
          newPeriodStatus[nextYearly] = {
            status: FEE_STATUS.FUTURE,
            paidAmount: 0,
            dueAmount: getCurrentAmount(fee),
            remaining: getCurrentAmount(fee),
          };
        }
      }

      return {
        ...fee,
        payments: [...fee.payments, payment],
        paymentsByPeriod: indexPayment(fee.paymentsByPeriod || {}, period, payment.id),
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
  }, []);

  const recordPartialPayment = useCallback((feeId, paymentData) => {
    return recordPayment(feeId, { ...paymentData, isPartial: true });
  }, [recordPayment]);

  const recordPerClassPayment = useCallback((feeId, paymentData) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId || !fee.perClass) return fee;

      const period = paymentData.forPeriod || getCurrentPeriod();
      const classCount = paymentData.classCount || 1;
      const amount = fee.perClass.ratePerClass * classCount;

      const payment = createPayment({
        ...paymentData,
        amount,
        forPeriod: period,
        forFeeType: fee.feeType,
        note: paymentData.note || `${classCount} class(es)`,
      });

      const existingPaid = fee.periodStatus[period]?.paidAmount || 0;
      const newPaidAmount = existingPaid + amount;

      const updatedClassTracking = {
        ...fee.perClass.classTracking,
        totalClasses: (fee.perClass.classTracking?.totalClasses || 0) + classCount,
        attendedClasses: (fee.perClass.classTracking?.attendedClasses || 0) + classCount,
        lastClassDate: new Date().toISOString().split('T')[0],
      };

      return updateFeeWithHistory(
        {
          ...fee,
          payments: [...fee.payments, payment],
          paymentsByPeriod: indexPayment(fee.paymentsByPeriod || {}, period, payment.id),
          periodStatus: {
            ...fee.periodStatus,
            [period]: {
              status: FEE_STATUS.PARTIAL,
              paidAmount: newPaidAmount,
              dueAmount: newPaidAmount,
              remaining: 0,
            },
          },
          perClass: { ...fee.perClass, classTracking: updatedClassTracking },
        },
        {},
        'per_class_payment',
        `Paid ৳${amount} for ${classCount} class(es)`,
        { paymentId: payment.id, classCount, period }
      );
    }));
  }, []);

  const payInstallment = useCallback((feeId, installmentId, paymentData) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId || !fee.semester?.installments) return fee;

      const payment = createPayment({ ...paymentData, forInstallment: installmentId, forFeeType: fee.feeType });

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
        paymentsByPeriod: indexPayment(fee.paymentsByPeriod || {}, payment.forPeriod || 'installment', payment.id),
        semester: { ...fee.semester, installments: updatedInstallments },
        changeHistory: [
          ...fee.changeHistory,
          { timestamp: new Date().toISOString(), action: 'installment_paid', details: `Paid installment ${installmentId} (৳${paymentData.amount})`, data: { installmentId, paymentId: payment.id } },
        ],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const skipPeriod = useCallback((feeId, period, reason) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId) return fee;

      const newPeriodStatus = {
        ...fee.periodStatus,
        [period]: { status: FEE_STATUS.SKIPPED, paidAmount: 0, dueAmount: 0, skipReason: reason || 'Skipped' },
      };

      // Create next period when skipping
      if (fee.recurring?.isActive) {
        const nextPeriod = getNextPeriod(period);
        if (!newPeriodStatus[nextPeriod]) {
          newPeriodStatus[nextPeriod] = {
            status: FEE_STATUS.UPCOMING,
            paidAmount: 0,
            dueAmount: getCurrentAmount(fee),
            remaining: getCurrentAmount(fee),
          };
        }
      }

      return updateFeeWithHistory(
        { ...fee, periodStatus: newPeriodStatus },
        {},
        'period_skipped',
        `Skipped ${period}: ${reason || 'No reason'}`,
        { period, reason }
      );
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // UPDATE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  const updateFee = useCallback((feeId, changes, reason) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId) return fee;
      return updateFeeWithHistory(
        { ...fee, ...changes },
        {},
        'fee_updated',
        reason || 'Fee updated',
        { changes }
      );
    }));
  }, []);

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

      return updateFeeWithHistory(
        updatedFee,
        {},
        'amount_updated',
        `Amount changed to ৳${newAmount}`,
        { oldAmount: getCurrentAmount(fee), newAmount, effectiveFrom, reason }
      );
    }));
  }, []);

  // Soft delete
  const deleteFee = useCallback((feeId) => {
    setFees(prev => prev.map(fee => {
      if (fee.id !== feeId) return fee;
      return updateFeeWithHistory(
        { ...fee, isDeleted: true, deletedAt: new Date().toISOString() },
        {},
        'deleted',
        'Fee soft-deleted'
      );
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // QUERY OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  const getFeeById = useCallback((feeId) => {
    return fees.find(fee => fee.id === feeId);
  }, [fees]);

  const getUpcomingPayments = useMemo(() => {
    const today = new Date();
    const upcoming = [];

    activeFees.forEach(fee => {
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
        if (daysUntil >= -CONSTANTS.UPCOMING_WINDOW_DAYS && daysUntil <= CONSTANTS.UPCOMING_WINDOW_DAYS) {
          const period = getYearlyPeriod(thisYear);
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
        if (daysUntil >= -CONSTANTS.UPCOMING_WINDOW_DAYS && daysUntil <= CONSTANTS.UPCOMING_WINDOW_DAYS) {
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
  }, [activeFees]);

  const getOverduePayments = useMemo(() => {
    return getUpcomingPayments.filter(p => p.status === FEE_STATUS.OVERDUE);
  }, [getUpcomingPayments]);

  const getTotalPaidThisMonth = useMemo(() => {
    const currentPeriod = getCurrentPeriod();
    let total = 0;
    activeFees.forEach(fee => {
      fee.payments.forEach(payment => {
        if (!payment.isRefund && getPeriodFromDate(payment.paidAt) === currentPeriod) total += payment.amount;
      });
    });
    return total;
  }, [activeFees]);

  const getTotalPaidAllTime = useMemo(() => {
    let total = 0;
    activeFees.forEach(fee => {
      fee.payments.forEach(payment => {
        if (!payment.isRefund) total += payment.amount;
      });
    });
    return total;
  }, [activeFees]);

  const value = {
    fees, activeFees, loading, savedCreditRates, setSavedCreditRates: updateCreditRates,
    addFee, addSemesterFee,
    recordPayment, recordPartialPayment, recordPerClassPayment,
    payInstallment, skipPeriod,
    updateFee, updateFeeAmount,
    deleteFee,
    getFeeById,
    getUpcomingPayments, getOverduePayments,
    getTotalPaidThisMonth, getTotalPaidAllTime,
  };

  return (
    <EducationFeeContext.Provider value={value}>
      {children}
    </EducationFeeContext.Provider>
  );
};
