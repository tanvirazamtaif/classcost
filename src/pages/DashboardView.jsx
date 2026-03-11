import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { makeFmt } from '../utils/format';

export const DashboardView = () => {
  const { user, expenses, navigate, theme, toggleTheme } = useApp();
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || "BDT");
  const [menuOpen, setMenuOpen] = useState(false);

  const d = theme === "dark";
  const profileIncomplete = !user?.profileComplete;

  const byType = (t) => expenses.filter((e) => e.type === t).reduce((s, e) => s + Number(e.amount), 0);
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const categories = [
    { id: "education", label: "Education", icon: "🎓", amount: byType("education"), gradient: d ? "from-indigo-900/60 to-indigo-800/40" : "from-indigo-50 to-indigo-100", text: d ? "text-indigo-300" : "text-indigo-700", border: d ? "border-indigo-700/30" : "border-indigo-200" },
    { id: "transport", label: "Transport", icon: "🚌", amount: byType("transport"), gradient: d ? "from-sky-900/60 to-sky-800/40" : "from-sky-50 to-sky-100", text: d ? "text-sky-300" : "text-sky-700", border: d ? "border-sky-700/30" : "border-sky-200" },
    { id: "canteen", label: "Canteen", icon: "🍽️", amount: byType("canteen"), gradient: d ? "from-amber-900/60 to-amber-800/40" : "from-amber-50 to-amber-100", text: d ? "text-amber-300" : "text-amber-700", border: d ? "border-amber-700/30" : "border-amber-200" },
    { id: "hostel", label: "Residence", icon: "🏠", amount: byType("hostel"), gradient: d ? "from-emerald-900/60 to-emerald-800/40" : "from-emerald-50 to-emerald-100", text: d ? "text-emerald-300" : "text-emerald-700", border: d ? "border-emerald-700/30" : "border-emerald-200" },
  ];

  return (
    <div className={`min-h-screen transition-colors ${d ? "bg-slate-950" : "bg-slate-50"}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-colors ${d ? "bg-slate-950/90 border-slate-800" : "bg-white/90 border-slate-200"}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className={`relative w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl transition ${d ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
              <span className={`w-5 h-[2px] rounded-full ${d ? "bg-white" : "bg-slate-800"}`} />
              <span className={`w-5 h-[2px] rounded-full ${d ? "bg-white" : "bg-slate-800"}`} />
              <span className={`w-5 h-[2px] rounded-full ${d ? "bg-white" : "bg-slate-800"}`} />
              {profileIncomplete && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
            </button>
            <h1 className={`text-lg font-bold ${d ? "text-white" : "text-slate-900"}`}>ClassCost</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition ${d ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
              {d ? "☀️" : "🌙"}
            </button>
            <button onClick={() => navigate("add-daily")} className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center text-white text-xl font-light transition active:scale-95 shadow-lg shadow-indigo-600/25">
              +
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className={`fixed top-0 left-0 bottom-0 w-72 sm:w-80 z-50 shadow-2xl flex flex-col transition-colors ${d ? "bg-slate-900" : "bg-white"}`} style={{ animation: "slideRight .2s ease-out" }}>
            <div className={`p-5 border-b ${d ? "border-slate-800" : "border-slate-100"}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`font-bold ${d ? "text-white" : "text-slate-900"}`}>Menu</span>
                <button onClick={() => setMenuOpen(false)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${d ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>✕</button>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold ${d ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-600"}`}>
                  {(profile?.fullName || user?.email)?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate text-sm ${d ? "text-white" : "text-slate-900"}`}>{profile?.fullName || "Guest"}</p>
                  <p className={`text-xs truncate ${d ? "text-slate-500" : "text-slate-400"}`}>{user?.email}</p>
                </div>
              </div>
              {profileIncomplete && (
                <button onClick={() => { setMenuOpen(false); navigate("onboarding"); }}
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 mt-3 text-left border ${d ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200"}`}>
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className={`text-xs font-semibold ${d ? "text-red-400" : "text-red-700"}`}>Complete your profile</span>
                </button>
              )}
            </div>
            <nav className="flex-1 p-2 overflow-y-auto">
              {[
                { label: "Home", icon: "🏠", view: "dashboard" },
                { label: "Add Expense", icon: "➕", view: "add-daily" },
                { label: "Semesters", icon: "📚", view: "semester" },
                { label: "Loans", icon: "💳", view: "loans" },
                { label: "Reports", icon: "📊", view: "reports" },
                { label: "Settings", icon: "⚙️", view: "settings" },
              ].map((item) => (
                <button key={item.view} onClick={() => { setMenuOpen(false); navigate(item.view); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${d ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}>
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  <span className={`text-sm font-medium ${d ? "text-slate-300" : "text-slate-700"}`}>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className={`p-4 border-t ${d ? "border-slate-800" : "border-slate-100"}`}>
              <button onClick={toggleTheme} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${d ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}>
                <span className="text-lg w-6 text-center">{d ? "☀️" : "🌙"}</span>
                <span className={`text-sm font-medium ${d ? "text-slate-300" : "text-slate-700"}`}>{d ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Total Cost — Big Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 mb-6 shadow-xl shadow-indigo-600/20">
          <p className="text-white/60 text-xs sm:text-sm font-medium mb-2">Total Cost</p>
          <p className="text-white text-4xl sm:text-5xl font-bold tracking-tight">{fmt(total)}</p>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-white/40 text-xs">{expenses.length} transaction{expenses.length !== 1 ? "s" : ""}</span>
            <button onClick={() => navigate("add-daily")} className="ml-auto bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-4 py-2 rounded-xl transition active:scale-95">
              + Add Expense
            </button>
          </div>
        </div>

        {/* 4 Category Cards — responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className={`bg-gradient-to-br ${cat.gradient} border ${cat.border} rounded-2xl p-4 sm:p-5 transition-all hover:scale-[1.02]`}>
              <div className="text-2xl sm:text-3xl mb-3">{cat.icon}</div>
              <p className={`text-xs sm:text-sm font-medium mb-1 ${d ? "text-slate-400" : "text-slate-500"}`}>{cat.label}</p>
              <p className={`text-xl sm:text-2xl font-bold ${cat.text}`}>{fmt(cat.amount)}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
