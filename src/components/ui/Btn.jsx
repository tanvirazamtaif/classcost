import React from 'react';

const VARIANTS = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200",
  parent: "bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200",
  secondary: "bg-white hover:bg-slate-50 text-indigo-700 border-2 border-indigo-100 shadow-sm",
  ghost: "bg-transparent hover:bg-indigo-50 text-indigo-600",
  danger: "bg-red-500 hover:bg-red-600 text-white shadow-md",
  success: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md",
};

const SIZES = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export const Btn = React.memo(({ children, onClick, variant = "primary", size = "md", className = "", disabled = false }) => {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all active:scale-95 cursor-pointer border-0 outline-none";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
});

Btn.displayName = 'Btn';
