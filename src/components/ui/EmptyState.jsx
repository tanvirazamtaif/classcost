import React from 'react';

export const EmptyState = ({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction,
  theme = 'dark'
}) => {
  const d = theme === 'dark';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className={`text-lg font-semibold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h3>
      <p className={`text-sm mb-6 max-w-xs ${d ? 'text-slate-400' : 'text-slate-500'}`}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const NoExpensesState = ({ onAddExpense, theme }) => (
  <EmptyState
    icon="💸"
    title="No expenses yet"
    description="Start tracking your student expenses. Tap a category above to add your first expense!"
    actionLabel="Add First Expense"
    onAction={onAddExpense}
    theme={theme}
  />
);

export const NoLoansState = ({ onAddLoan, theme }) => (
  <EmptyState
    icon="🏦"
    title="No loans tracked"
    description="Track your education loans and see payment schedules. Add a loan to get started."
    actionLabel="Add Loan"
    onAction={onAddLoan}
    theme={theme}
  />
);

export const NoReportsState = ({ theme }) => (
  <EmptyState
    icon="📊"
    title="No data for reports"
    description="Add some expenses first, then come back to see charts and insights about your spending."
    theme={theme}
  />
);

export const NoHistoryState = ({ theme }) => (
  <EmptyState
    icon="📅"
    title="No history yet"
    description="Your expense history will appear here as you track your spending over time."
    theme={theme}
  />
);

export const NoChildrenState = ({ onLinkChild, theme }) => (
  <EmptyState
    icon="👨‍👧"
    title="No children linked"
    description="Link your child's account to monitor their education expenses."
    actionLabel="Link Child Account"
    onAction={onLinkChild}
    theme={theme}
  />
);

export const NoBudgetState = ({ onSetBudget, theme }) => (
  <EmptyState
    icon="💰"
    title="No budget set"
    description="Set a monthly budget to track your spending and get alerts when you're close to your limit."
    actionLabel="Set Budget"
    onAction={onSetBudget}
    theme={theme}
  />
);

export default EmptyState;
