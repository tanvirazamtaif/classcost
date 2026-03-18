import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { GButton } from '../components/ui';
import { LayoutBottomNav } from '../components/layout';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getPaymentStyleBadge(fee, d) {
  const style = fee.paymentStyle || fee.paymentPattern || 'full';
  const map = {
    full: { label: 'Full', bg: d ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700' },
    installment: { label: 'Installment', bg: d ? 'bg-primary-900/30 text-primary-300' : 'bg-primary-100 text-primary-700' },
    partial: { label: 'Partial', bg: d ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700' },
  };
  const info = map[style] || map.full;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${info.bg}`}>
      {info.label}
    </span>
  );
}

function getInstallmentProgress(fee) {
  const installments = fee.semester?.installments || fee.installmentData || [];
  if (!installments.length) return null;
  const paid = installments.filter(i => i.status === 'paid' || i.isPaid).length;
  return { paid, total: installments.length };
}

function getTotalPaid(fee) {
  if (fee.payments && Array.isArray(fee.payments)) {
    return fee.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }
  if (fee.isPaid) return fee.amount || 0;
  const installments = fee.semester?.installments || fee.installmentData || [];
  return installments.reduce((sum, i) => sum + (i.paidAmount || (i.isPaid ? i.amount : 0) || 0), 0);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const SemesterLandingPage = () => {
  const { navigate, theme } = useApp();
  const { activeFees } = useEducationFees();
  const { institutionName } = useUserProfile();
  const d = theme === 'dark';

  const semesterFees = useMemo(() => {
    return activeFees.filter(f => f.feeType === 'semester_fee' && !f.isDeleted);
  }, [activeFees]);

  // ══════════════════════════════════════════════════════════════
  // RENDER: EMPTY STATE
  // ══════════════════════════════════════════════════════════════

  const renderEmpty = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center px-6 pt-20"
    >
      <div className="text-5xl mb-4">🎓</div>
      <h3 className={`text-lg font-semibold mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>
        No semesters yet
      </h3>
      <p className={`text-sm mb-8 max-w-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
        Track your semester payments, installments, and due dates all in one place.
      </p>
      <GButton
        size="lg"
        icon={Plus}
        onClick={() => { haptics.light(); navigate('add-semester'); }}
      >
        Add your first semester
      </GButton>
    </motion.div>
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER: SEMESTER CARD
  // ══════════════════════════════════════════════════════════════

  const renderCard = (fee) => {
    const progress = getInstallmentProgress(fee);
    const totalPaid = getTotalPaid(fee);
    const isInstallment = fee.paymentStyle === 'installment' || fee.paymentPattern === 'installment';

    return (
      <motion.button
        key={fee.id}
        whileTap={{ scale: 0.98 }}
        onClick={() => { haptics.light(); navigate('semester-detail', { params: { semesterId: fee.id } }); }}
        className={`w-full text-left p-4 rounded-2xl border transition-all ${
          d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Name + badge */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">🎓</span>
              <p className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-surface-900'}`}>
                {fee.semesterName || fee.name}
              </p>
              {getPaymentStyleBadge(fee, d)}
            </div>

            {/* Institution name */}
            {fee.name && fee.name !== 'Semester Payment' && (
              <p className={`text-xs mb-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>
                {fee.name}
              </p>
            )}

            {/* Installment progress */}
            {isInstallment && progress && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
                    {progress.paid} of {progress.total} paid
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${d ? 'bg-surface-800' : 'bg-surface-200'}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.paid / progress.total) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full bg-primary-500"
                  />
                </div>
              </div>
            )}

            {/* Total paid */}
            <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
              Paid: <span className={`font-semibold ${d ? 'text-emerald-400' : 'text-emerald-600'}`}>৳{totalPaid.toLocaleString()}</span>
              {fee.totalExpectedAmount > 0 && (
                <span> / ৳{fee.totalExpectedAmount.toLocaleString()}</span>
              )}
            </p>
          </div>

          <ChevronRight className={`w-4 h-4 mt-1 shrink-0 ${d ? 'text-surface-600' : 'text-surface-400'}`} />
        </div>
      </motion.button>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => { haptics.light(); navigate('education-fees'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Semester Payments</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Add Semester button */}
        {semesterFees.length > 0 && (
          <GButton
            fullWidth
            size="lg"
            icon={Plus}
            onClick={() => { haptics.light(); navigate('add-semester'); }}
          >
            Add Semester
          </GButton>
        )}

        {/* Semester list or empty state */}
        {semesterFees.length === 0 ? renderEmpty() : (
          <div className="space-y-3">
            {semesterFees.map(fee => renderCard(fee))}
          </div>
        )}
      </main>

      <LayoutBottomNav />
    </motion.div>
  );
};

export default SemesterLandingPage;
