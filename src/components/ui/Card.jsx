import React from 'react';

export const Card = React.memo(({ children, className = "" }) => (
  <div className={`bg-white dark:bg-surface-900 rounded-3xl shadow-sm border border-slate-100 dark:border-surface-800 ${className}`}>
    {children}
  </div>
));

Card.displayName = 'Card';
