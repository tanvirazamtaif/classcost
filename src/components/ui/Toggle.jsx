import React from 'react';

export const Toggle = React.memo(({ label, sub, value, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
    <div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${value ? "bg-indigo-600" : "bg-slate-200"}`}
      role="switch"
      aria-checked={value}
      aria-label={label}
    >
      <div className="w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all" style={{ left: value ? "26px" : "2px" }} />
    </button>
  </div>
));

Toggle.displayName = 'Toggle';
