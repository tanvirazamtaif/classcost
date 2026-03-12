import React from 'react';
import { useApp } from '../../contexts/AppContext';

const TABS = [
  { id: "dashboard", icon: "🏠", label: "Home" },
  { id: "add-daily", icon: "➕", label: "Add" },
  { id: "loans", icon: "💳", label: "Loans" },
  { id: "reports", icon: "📊", label: "Reports" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export const BottomNav = React.memo(({ active, navigate }) => {
  const { theme } = useApp();
  const d = theme === "dark";

  return (
    <nav className={`fixed bottom-0 left-0 right-0 flex z-40 border-t ${d ? "bg-[#080812] border-[#1e1e3a]" : "bg-white border-slate-100 shadow-lg"}`}
      role="tablist" aria-label="Main navigation">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => navigate(t.id)}
          role="tab"
          aria-selected={active === t.id}
          aria-label={t.label}
          className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-all ${active === t.id ? "text-indigo-500" : d ? "text-slate-500" : "text-slate-400"}`}
        >
          <span className={`text-xl leading-none ${active === t.id ? "scale-110" : ""} transition-transform`}>{t.icon}</span>
          <span className="text-xs font-semibold">{t.label}</span>
          {active === t.id && <div className="w-1 h-1 rounded-full bg-indigo-500 mt-0.5" />}
        </button>
      ))}
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';
