import React from 'react';

const BADGE_COLORS = {
  indigo: "bg-indigo-100 text-indigo-700", emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700", red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700", sky: "bg-sky-100 text-sky-700",
  violet: "bg-violet-100 text-violet-700", teal: "bg-teal-100 text-teal-700",
  rose: "bg-rose-100 text-rose-700", fuchsia: "bg-fuchsia-100 text-fuchsia-700",
  green: "bg-green-100 text-green-700", orange: "bg-orange-100 text-orange-700",
  blue: "bg-blue-100 text-blue-700", cyan: "bg-cyan-100 text-cyan-700",
};

export const Badge = React.memo(({ children, color = "indigo" }) => (
  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${BADGE_COLORS[color] || BADGE_COLORS.indigo}`}>
    {children}
  </span>
));

Badge.displayName = 'Badge';
