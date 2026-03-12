import React from 'react';
import { PRICING, formatPrice } from '../../constants/pricing';
import { useApp } from '../../contexts/AppContext';

/**
 * PaywallModal - Shows upgrade prompt when user tries Pro features
 *
 * Usage:
 * <PaywallModal
 *   isOpen={showPaywall}
 *   onClose={() => setShowPaywall(false)}
 *   feature="exportPdf"
 *   title="Export to PDF"
 * />
 */
export const PaywallModal = ({
  isOpen,
  onClose,
  feature = '',
  title = 'Upgrade to Pro',
  description = '',
}) => {
  const { theme, user } = useApp();
  const d = theme === 'dark';

  if (!isOpen) return null;

  // Determine which plan to show based on user type
  const isParent = user?.accountType === 'parent';
  const plan = isParent ? PRICING.PARENT_PRO : PRICING.STUDENT_PRO;

  const featureDescriptions = {
    exportPdf: 'Export your expense reports as professional PDF documents',
    exportExcel: 'Download all your expenses in Excel format for analysis',
    yearlyReport: 'Get detailed yearly breakdowns and insights',
    projection: 'See 10-year projections of your education costs',
    budgetAlerts: 'Set spending limits and get notified when exceeded',
    historyMonths: 'Access your complete expense history, not just 3 months',
  };

  const desc = description || featureDescriptions[feature] || 'Unlock premium features';

  const handleUpgrade = () => {
    // TODO: Integrate with bKash/payment gateway
    alert('Payment integration coming soon! Contact support for early access.');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md rounded-3xl p-6 shadow-2xl transform transition-all ${
            d ? 'bg-slate-900 border border-slate-800' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition ${
              d ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            ✕
          </button>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✨</span>
          </div>

          {/* Title */}
          <h2 className={`text-xl font-bold text-center mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
            {title}
          </h2>

          {/* Description */}
          <p className={`text-center text-sm mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>
            {desc}
          </p>

          {/* Plan card */}
          <div className={`rounded-2xl p-4 mb-4 ${d ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`font-semibold ${d ? 'text-white' : 'text-slate-900'}`}>
                {plan.name}
              </span>
              <div className="text-right">
                <span className={`text-2xl font-bold ${d ? 'text-white' : 'text-slate-900'}`}>
                  {formatPrice(plan.yearlyPrice)}
                </span>
                <span className={`text-sm ${d ? 'text-slate-400' : 'text-slate-500'}`}>/year</span>
              </div>
            </div>

            {/* Monthly equivalent */}
            <p className={`text-xs mb-3 ${d ? 'text-slate-500' : 'text-slate-400'}`}>
              Just {formatPrice(Math.round(plan.yearlyPrice / 12))}/month • Save {Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}%
            </p>

            {/* Features list */}
            <ul className="space-y-2">
              {plan.features.slice(0, 5).map((feat, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  <span className={d ? 'text-slate-300' : 'text-slate-700'}>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <button
            onClick={handleUpgrade}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:opacity-90 transition active:scale-[0.98]"
          >
            Upgrade Now — {formatPrice(plan.yearlyPrice)}/year
          </button>

          <button
            onClick={onClose}
            className={`w-full py-3 mt-2 rounded-xl text-sm font-medium transition ${
              d ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Maybe later
          </button>

          {/* Trust badge */}
          <p className={`text-center text-xs mt-4 ${d ? 'text-slate-600' : 'text-slate-400'}`}>
            🔒 Secure payment via bKash • Cancel anytime
          </p>
        </div>
      </div>
    </>
  );
};

export default PaywallModal;
