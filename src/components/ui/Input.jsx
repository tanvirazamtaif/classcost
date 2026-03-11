import React from 'react';

export const Input = React.memo(({ label, type = "text", value, onChange, placeholder, icon, suffix, className = "" }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white ${icon ? "pl-11" : "pl-4"} ${suffix ? "pr-16" : "pr-4"}`}
      />
      {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">{suffix}</span>}
    </div>
  </div>
));

Input.displayName = 'Input';
