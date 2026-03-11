import React from 'react';

export const Select = React.memo(({ label, value, onChange, options, icon }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm z-10">{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-400 appearance-none ${icon ? "pl-11" : "pl-4"} pr-8`}
      >
        {options.map((o) => (
          <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
        ))}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▾</span>
    </div>
  </div>
));

Select.displayName = 'Select';
