import React from 'react';

export const Card = React.memo(({ children, className = "" }) => (
  <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
));

Card.displayName = 'Card';
