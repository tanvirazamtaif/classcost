import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { GCard, GCardContent } from '../components/ui';
import { ExpenseChart } from '../components/feature';
import { pageTransition } from '../lib/animations';
import { makeFmt } from '../utils/format';

export const ReportsView = () => {
  const { expenses, user, theme } = useApp();
  const { getTotalPaidAllTime, getTotalPaidThisMonth, activeFees } = useEducationFees();
  const d = theme === 'dark';
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || 'BDT');
  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'INR' ? '₹' : '৳';

  const [includeHistorical, setIncludeHistorical] = useState(true);

  useEffect(() => { document.title = "Reports — ClassCost"; }, []);

  const hasHistorical = expenses.some(e => e.isHistorical);
  const filteredExpenses = includeHistorical ? expenses : expenses.filter(e => !e.isHistorical);

  const totals = useMemo(() => {
    const expenseAll = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const expenseMonthly = filteredExpenses
      .filter(e => e.date?.startsWith(thisMonth))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const eduAll = getTotalPaidAllTime || 0;
    const eduMonthly = getTotalPaidThisMonth || 0;

    return {
      all: expenseAll + eduAll,
      monthly: expenseMonthly + eduMonthly,
      expenseOnly: expenseAll,
      eduOnly: eduAll,
    };
  }, [filteredExpenses, getTotalPaidAllTime, getTotalPaidThisMonth]);

  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const topExpenses = useMemo(() => {
    return filteredExpenses
      .filter(e => !e.isHistorical)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredExpenses]);

  // Combine regular expenses with education fees for the pie chart
  const allExpensesForChart = useMemo(() => {
    const eduTotal = getTotalPaidAllTime || 0;
    const eduEntry = eduTotal > 0
      ? [{ type: 'education', amount: eduTotal, date: new Date().toISOString().split('T')[0], label: 'Education Fees' }]
      : [];
    return [...filteredExpenses, ...eduEntry];
  }, [filteredExpenses, getTotalPaidAllTime]);

  const categoryLabels = {
    education: '🎓 Education', transport: '🚌 Transport', canteen: '🍽️ Food',
    hostel: '🏠 Housing', books: '📚 Books', uniform: '👔 Uniform'
  };

  if (expenses.length === 0 && !getTotalPaidAllTime) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <span className="text-5xl mb-4">📊</span>
        <h3 className={`text-lg font-semibold mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>No data for reports</h3>
        <p className={`text-sm max-w-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
          Add some expenses first, then come back to see charts and insights about your spending.
        </p>
      </div>
    );
  }

  return (
    <motion.div {...pageTransition} className="flex flex-col gap-5 pb-4">
      <div>
        <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-surface-900'}`} style={{ fontFamily: "'Fraunces',serif" }}>Analytics</h2>
        <p className={`text-sm ${d ? 'text-surface-400' : 'text-surface-500'}`}>Your expense breakdown</p>
      </div>

      {/* Monthly Summary */}
      <GCard>
        <GCardContent className="text-center py-6">
          <p className={`text-sm mb-1 ${d ? 'text-surface-400' : 'text-surface-500'}`}>{currentMonth}</p>
          <p className={`text-3xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>
            {fmt(totals.monthly)}
          </p>
        </GCardContent>
      </GCard>

      {/* Chart */}
      <GCard>
        <GCardContent>
          <h3 className={`text-sm font-medium mb-4 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Breakdown</h3>
          <ExpenseChart expenses={allExpensesForChart} currencySymbol={currencySymbol} />
        </GCardContent>
      </GCard>

      {/* Historical toggle */}
      {hasHistorical && (
        <button onClick={() => setIncludeHistorical(!includeHistorical)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            includeHistorical
              ? d ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' : 'bg-primary-50 text-primary-700 border border-primary-200'
              : d ? 'bg-surface-800 text-surface-400 border border-surface-700' : 'bg-surface-100 text-surface-600 border border-surface-200'
          }`}>
          <span className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
            includeHistorical ? 'bg-primary-600 text-white' : d ? 'bg-surface-700' : 'bg-surface-300'
          }`}>{includeHistorical ? '✓' : ''}</span>
          Include historical estimates
        </button>
      )}

      {/* Top Expenses */}
      {topExpenses.length > 0 && (
        <GCard>
          <GCardContent>
            <h3 className={`text-sm font-medium mb-4 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Top Expenses</h3>
            <div className="space-y-3">
              {topExpenses.map((exp, i) => (
                <div key={exp.id || i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-600'
                    }`}>{i + 1}</span>
                    <div>
                      <p className={`text-sm ${d ? 'text-white' : 'text-surface-900'}`}>
                        {exp.label || categoryLabels[exp.type] || exp.type}
                      </p>
                      <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                        {exp.date ? new Date(exp.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{fmt(Number(exp.amount))}</span>
                </div>
              ))}
            </div>
          </GCardContent>
        </GCard>
      )}

      {/* Total */}
      <GCard>
        <GCardContent className="text-center py-6">
          <p className={`text-sm mb-1 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Total education investment</p>
          <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>
            {fmt(totals.all)}
          </p>
          <p className={`text-xs mt-1 ${d ? 'text-surface-500' : 'text-surface-400'}`}>Since you started tracking</p>
          {totals.eduOnly > 0 && totals.expenseOnly > 0 && (
            <div className={`mt-4 pt-3 border-t ${d ? 'border-surface-800' : 'border-surface-200'} flex justify-center gap-6 text-xs`}>
              <div>
                <p className={d ? 'text-surface-500' : 'text-surface-400'}>Expenses</p>
                <p className={`font-semibold ${d ? 'text-surface-300' : 'text-surface-700'}`}>{fmt(totals.expenseOnly)}</p>
              </div>
              <div>
                <p className={d ? 'text-surface-500' : 'text-surface-400'}>Education Fees</p>
                <p className={`font-semibold ${d ? 'text-surface-300' : 'text-surface-700'}`}>{fmt(totals.eduOnly)}</p>
              </div>
            </div>
          )}
        </GCardContent>
      </GCard>
    </motion.div>
  );
};

export default ReportsView;
