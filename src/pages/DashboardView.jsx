import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { CURRENCIES } from '../constants/currencies';
import { makeFmt } from '../utils/format';
import { Card } from '../components/ui';

export const DashboardView = () => {
  const { user, expenses, navigate } = useApp();
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || "BDT");
  const [menuOpen, setMenuOpen] = useState(false);

  const profileIncomplete = !user?.profileComplete;

  const byType = (t) => expenses.filter((e) => e.type === t).reduce((s, e) => s + Number(e.amount), 0);
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const recent = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const categories = [
    { id: "education", label: "Education Fee", icon: "🎓", color: "bg-indigo-50 border-indigo-100", iconBg: "bg-indigo-100", textColor: "text-indigo-700", amount: byType("education") },
    { id: "transport", label: "Transport Fee", icon: "🚌", color: "bg-sky-50 border-sky-100", iconBg: "bg-sky-100", textColor: "text-sky-700", amount: byType("transport") },
    { id: "canteen", label: "Canteen Fee", icon: "🍽️", color: "bg-amber-50 border-amber-100", iconBg: "bg-amber-100", textColor: "text-amber-700", amount: byType("canteen") },
    { id: "hostel", label: "Residence Fee", icon: "🏠", color: "bg-emerald-50 border-emerald-100", iconBg: "bg-emerald-100", textColor: "text-emerald-700", amount: byType("hostel") },
  ];

  return (
    <div className="flex flex-col gap-5 relative">
      {/* Header with hamburger menu */}
      <div className="flex items-center justify-between -mx-4 -mt-6 px-4 py-4 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen(!menuOpen)} className="relative w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-slate-100 transition">
            <span className="w-5 h-0.5 bg-slate-700 rounded-full" />
            <span className="w-5 h-0.5 bg-slate-700 rounded-full" />
            <span className="w-5 h-0.5 bg-slate-700 rounded-full" />
            {profileIncomplete && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">ClassCost</h1>
            <p className="text-xs text-slate-400">
              {profile?.fullName ? `Hi, ${profile.fullName}` : "Track your expenses"}
            </p>
          </div>
        </div>
        <button onClick={() => navigate("add-daily")} className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg shadow-indigo-200 active:scale-95 transition">
          +
        </button>
      </div>

      {/* Slide-out menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col" style={{ animation: "slideRight .25s ease-out" }}>
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-xl font-bold text-indigo-600">
                  {(profile?.fullName || user?.email)?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{profile?.fullName || "Set up your profile"}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              {profileIncomplete && (
                <button onClick={() => { setMenuOpen(false); navigate("onboarding"); }}
                  className="w-full flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-left">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-700 text-xs font-semibold">Complete your profile</span>
                </button>
              )}
            </div>
            <nav className="flex-1 p-3">
              {[
                { label: "Home", icon: "🏠", view: "dashboard" },
                { label: "Add Expense", icon: "➕", view: "add-daily" },
                { label: "Semesters", icon: "📚", view: "semester" },
                { label: "Loans", icon: "💳", view: "loans" },
                { label: "Reports", icon: "📊", view: "reports" },
                { label: "Settings", icon: "⚙️", view: "settings" },
              ].map((item) => (
                <button key={item.view} onClick={() => { setMenuOpen(false); navigate(item.view); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-slate-50 transition">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center">ClassCost v1.0</p>
            </div>
          </div>
        </>
      )}

      {/* Total spent card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200">
        <p className="text-white/70 text-xs font-medium mb-1">Total Spent</p>
        <p className="text-3xl font-bold">{fmt(total)}</p>
        <p className="text-white/50 text-xs mt-1">{expenses.length} transaction{expenses.length !== 1 ? "s" : ""}</p>
      </div>

      {/* 4 Basic Categories */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Categories</h3>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className={`${cat.color} border rounded-2xl p-4`}>
              <div className={`w-10 h-10 ${cat.iconBg} rounded-xl flex items-center justify-center text-xl mb-3`}>
                {cat.icon}
              </div>
              <p className="text-xs text-slate-500 font-medium">{cat.label}</p>
              <p className={`text-lg font-bold ${cat.textColor}`}>{fmt(cat.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate("add-daily")}
          className="flex-1 bg-indigo-600 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 font-semibold text-sm shadow-lg shadow-indigo-200 active:scale-95 transition">
          + Add Expense
        </button>
        <button onClick={() => navigate("semester")}
          className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl active:scale-95 transition">
          📚
        </button>
      </div>

      {/* Recent Activity */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">Recent Activity</h3>
          <button onClick={() => navigate("reports")} className="text-indigo-600 text-xs font-semibold">See All</button>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-slate-400 text-sm">No expenses yet</p>
            <p className="text-slate-300 text-xs mt-1">Tap "Add Expense" to get started</p>
          </div>
        ) : recent.map((e) => (
          <div key={e.id} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
              {{ transport: "🚌", canteen: "🍽️", hostel: "🏠", education: "🎓", coaching: "📖", batch: "👥", other: "💸" }[e.type] || "📝"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700">{e.label || e.type}</p>
              <p className="text-xs text-slate-400">{e.date}</p>
            </div>
            <p className="text-sm font-bold text-slate-800">{fmt(e.amount)}</p>
          </div>
        ))}
      </Card>
    </div>
  );
};
