import React from 'react';

const TABS = [
  { id: "dashboard", icon: "🏠", label: "Home" },
  { id: "add-daily", icon: "➕", label: "Add" },
  { id: "loans", icon: "💳", label: "Loans" },
  { id: "reports", icon: "📊", label: "Reports" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export const BottomNav = React.memo(({ active, navigate }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex z-40 shadow-lg" role="tablist" aria-label="Main navigation">
    {TABS.map((t) => (
      <button
        key={t.id}
        onClick={() => navigate(t.id)}
        role="tab"
        aria-selected={active === t.id}
        aria-label={t.label}
        className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-all ${active === t.id ? "text-indigo-600" : "text-slate-400"}`}
      >
        <span className={`text-xl leading-none ${active === t.id ? "scale-110" : ""} transition-transform`}>{t.icon}</span>
        <span className="text-xs font-semibold">{t.label}</span>
        {active === t.id && <div className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />}
      </button>
    ))}
  </nav>
));

BottomNav.displayName = 'BottomNav';
