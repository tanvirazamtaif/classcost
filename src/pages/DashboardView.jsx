import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useSubscription } from '../hooks';
import { makeFmt } from '../utils/format';

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

// Sub-category labels for each expense type
const SUB_CATEGORIES = {
  education: [
    { id: 'tuition', icon: '📖', label: 'Tuition Fee' },
    { id: 'admission', icon: '📋', label: 'Admission Fee' },
    { id: 'exam', icon: '📝', label: 'Exam Fee' },
    { id: 'books', icon: '📚', label: 'Books/Supplies' },
    { id: 'coaching', icon: '👨‍🏫', label: 'Coaching/Tutor' },
    { id: 'lab', icon: '🔬', label: 'Lab Fee' },
    { id: 'library', icon: '🏛️', label: 'Library Fee' },
    { id: 'other_edu', icon: '📌', label: 'Other' },
  ],
  transport: [
    { id: 'bus', icon: '🚌', label: 'Bus' },
    { id: 'rickshaw', icon: '🛺', label: 'Rickshaw/CNG' },
    { id: 'ride_share', icon: '🚗', label: 'Uber/Pathao' },
    { id: 'train', icon: '🚆', label: 'Train' },
    { id: 'fuel', icon: '⛽', label: 'Fuel/Petrol' },
    { id: 'other_transport', icon: '🚶', label: 'Other' },
  ],
  canteen: [
    { id: 'lunch', icon: '🍛', label: 'Lunch' },
    { id: 'snacks', icon: '🍿', label: 'Snacks' },
    { id: 'tea_coffee', icon: '☕', label: 'Tea/Coffee' },
    { id: 'breakfast', icon: '🥪', label: 'Breakfast' },
    { id: 'dinner', icon: '🍽️', label: 'Dinner' },
    { id: 'other_food', icon: '🧃', label: 'Other' },
  ],
  hostel: [
    { id: 'rent', icon: '🏠', label: 'Rent' },
    { id: 'electricity', icon: '💡', label: 'Electricity' },
    { id: 'internet', icon: '📶', label: 'Internet/WiFi' },
    { id: 'water', icon: '💧', label: 'Water Bill' },
    { id: 'laundry', icon: '👕', label: 'Laundry' },
    { id: 'other_hostel', icon: '📌', label: 'Other' },
  ],
};

const getExpenseLabel = (type, subType) => {
  const cats = SUB_CATEGORIES[type];
  if (!cats) return type;
  const sub = cats.find(s => s.id === subType);
  return sub ? sub.label : type;
};

export const DashboardView = () => {
  const { user, expenses, addExpense, removeExpense, addToast, navigate, theme, toggleTheme } = useApp();
  const { canAccessHistory, isPro } = useSubscription();
  const profile = user?.profile;

  useEffect(() => { document.title = "Dashboard — ClassCost"; }, []);
  const fmt = makeFmt(profile?.currency || "BDT");
  const d = theme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null); // "education" | "transport" | "canteen" | "hostel"
  const [saving, setSaving] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // expense id pending confirm
  const [formData, setFormData] = useState({});

  const profileIncomplete = !user?.profileComplete;

  // Subtle nudge: show if no transport logged today, dismissible for 24h
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    try {
      const ts = localStorage.getItem("ut_v3_nudge_dismissed");
      return ts && (Date.now() - Number(ts)) < 86400000;
    } catch { return false; }
  });
  const hasTransportToday = expenses.some((e) => e.type === "transport" && e.date === today());
  const showNudge = !nudgeDismissed && !hasTransportToday && expenses.length > 0;
  const dismissNudge = () => {
    localStorage.setItem("ut_v3_nudge_dismissed", String(Date.now()));
    setNudgeDismissed(true);
  };

  const byType = (t) => expenses.filter((e) => e.type === t).reduce((s, e) => s + Number(e.amount), 0);
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const openForm = (type) => {
    if (activeForm === type) { setActiveForm(null); return; }
    const defaults = {
      education: { amount: "", details: "", subType: "" },
      transport: { date: today(), amount: "", subType: "" },
      canteen: { date: today(), amount: "", subType: "" },
      hostel: { month: currentMonth(), amount: "", subType: "" },
    };
    setFormData(defaults[type] || {});
    setActiveForm(type);
  };

  const handleSave = async () => {
    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) return;
    if (!formData.subType) return;
    setSaving(true);
    try {
      const expense = {
        userId: user?.id,
        type: activeForm,
        subType: formData.subType,
        amount: Number(formData.amount),
        date: formData.date || formData.month || today(),
        label: getExpenseLabel(activeForm, formData.subType),
        details: formData.details || "",
      };
      await addExpense(expense);
      setActiveForm(null);
      setFormData({});
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { id: "education", label: "Education", icon: "🎓", amount: byType("education"), gradient: d ? "from-indigo-900/60 to-indigo-800/40" : "from-indigo-50 to-indigo-100", text: d ? "text-indigo-300" : "text-indigo-700", border: d ? "border-indigo-700/30" : "border-indigo-200" },
    { id: "transport", label: "Transport", icon: "🚌", amount: byType("transport"), gradient: d ? "from-sky-900/60 to-sky-800/40" : "from-sky-50 to-sky-100", text: d ? "text-sky-300" : "text-sky-700", border: d ? "border-sky-700/30" : "border-sky-200" },
    { id: "canteen", label: "Canteen", icon: "🍽️", amount: byType("canteen"), gradient: d ? "from-amber-900/60 to-amber-800/40" : "from-amber-50 to-amber-100", text: d ? "text-amber-300" : "text-amber-700", border: d ? "border-amber-700/30" : "border-amber-200" },
    { id: "hostel", label: "Residence", icon: "🏠", amount: byType("hostel"), gradient: d ? "from-emerald-900/60 to-emerald-800/40" : "from-emerald-50 to-emerald-100", text: d ? "text-emerald-300" : "text-emerald-700", border: d ? "border-emerald-700/30" : "border-emerald-200" },
  ];

  const inputClass = `w-full rounded-xl py-2.5 px-3 text-sm outline-none transition ${d ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500"} border`;

  const getLastMonthSpending = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    return expenses
      .filter(exp => exp.date && exp.date.startsWith(lastMonthStr))
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  };

  const getThisMonthSpending = () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const byCategory = { education: 0, transport: 0, canteen: 0, hostel: 0, total: 0 };
    expenses.forEach(exp => {
      if (!exp.date || !exp.date.startsWith(thisMonth)) return;
      const amount = Number(exp.amount) || 0;
      const cat = exp.type;
      if (cat in byCategory) byCategory[cat] += amount;
      byCategory.total += amount;
    });
    return byCategory;
  };

  const BudgetProgress = ({ category, spent, budget, icon }) => {
    if (!budget || budget <= 0) return null;
    const percentage = Math.min((spent / budget) * 100, 100);
    const isOver = spent > budget;
    const isWarning = percentage >= 80 && percentage < 100;
    const colors = isOver
      ? { bar: 'bg-red-500', text: 'text-red-400' }
      : isWarning
        ? { bar: 'bg-orange-500', text: 'text-orange-400' }
        : { bar: 'bg-green-500', text: 'text-green-400' };

    return (
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-medium ${d ? 'text-slate-400' : 'text-slate-600'}`}>{category}</span>
            <span className={`text-xs font-semibold ${colors.text}`}>
              {isOver ? 'Over!' : `${percentage.toFixed(0)}%`}
            </span>
          </div>
          <div className={`h-2 rounded-full ${d ? 'bg-slate-700' : 'bg-slate-200'} overflow-hidden`}>
            <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
              style={{ width: `${percentage}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>{fmt(spent)}</span>
            <span className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>{fmt(budget)}</span>
          </div>
        </div>
      </div>
    );
  };

  const MonthlySummaryCard = () => {
    const thisMonth = getThisMonthSpending().total;
    const lastMonth = getLastMonthSpending();
    const difference = thisMonth - lastMonth;
    const percentChange = lastMonth > 0 ? ((difference / lastMonth) * 100).toFixed(0) : 0;
    const isUp = difference > 0;
    const isDown = difference < 0;
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });
    const lastMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toLocaleDateString('en-US', { month: 'long' });

    return (
      <div className={`mb-4 p-4 rounded-2xl ${d ? 'bg-slate-800/50' : 'bg-white'} border ${d ? 'border-slate-700' : 'border-slate-200'}`}>
        <h3 className={`text-sm font-medium mb-3 ${d ? 'text-slate-400' : 'text-slate-600'}`}>
          {monthName} Summary
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-slate-900'}`}>{fmt(thisMonth)}</p>
            <p className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>This month</p>
          </div>
          <div className={`text-center px-3 py-2 rounded-xl ${
            isUp ? 'bg-red-500/20' : isDown ? 'bg-green-500/20' : d ? 'bg-slate-700/50' : 'bg-slate-100'
          }`}>
            <p className={`text-lg font-bold ${
              isUp ? 'text-red-400' : isDown ? 'text-green-400' : d ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {isUp ? '↑' : isDown ? '↓' : '→'} {Math.abs(percentChange)}%
            </p>
            <p className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>vs {lastMonthName}</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-semibold ${d ? 'text-slate-400' : 'text-slate-600'}`}>{fmt(lastMonth)}</p>
            <p className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>{lastMonthName}</p>
          </div>
        </div>
        {lastMonth > 0 && (
          <p className={`mt-3 text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>
            {isUp
              ? `📈 Spending ${fmt(Math.abs(difference))} more than last month`
              : isDown
                ? `📉 Saving ${fmt(Math.abs(difference))} compared to last month`
                : '➡️ Spending is about the same as last month'}
          </p>
        )}
      </div>
    );
  };

  const OverspendingAlert = ({ spent, budget }) => {
    if (!budget || budget <= 0 || spent <= budget) return null;
    const overAmount = spent - budget;
    const percentage = ((spent / budget) * 100).toFixed(0);
    return (
      <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🚨</span>
          <div className="flex-1">
            <p className={`font-semibold ${d ? 'text-red-400' : 'text-red-600'}`}>Budget Exceeded!</p>
            <p className={`text-sm ${d ? 'text-red-300/80' : 'text-red-500'}`}>
              You've spent {fmt(overAmount)} over your monthly limit ({percentage}% of budget used)
            </p>
          </div>
          <button onClick={() => navigate('budget-settings')}
            className={`text-xs px-3 py-1.5 rounded-lg ${d ? 'bg-red-500/30 text-red-300' : 'bg-red-100 text-red-600'}`}>
            Adjust
          </button>
        </div>
      </div>
    );
  };

  const BudgetWarningAlert = ({ spent, budget }) => {
    if (!budget || budget <= 0) return null;
    const percentage = (spent / budget) * 100;
    if (percentage < 80 || percentage >= 100) return null;
    const remaining = budget - spent;
    return (
      <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className={`font-semibold ${d ? 'text-orange-400' : 'text-orange-600'}`}>Approaching Budget Limit</p>
            <p className={`text-sm ${d ? 'text-orange-300/80' : 'text-orange-500'}`}>
              Only {fmt(remaining)} left for this month ({percentage.toFixed(0)}% used)
            </p>
          </div>
        </div>
      </div>
    );
  };

  const quickAdd = async (type, subType, amount, label) => {
    try {
      await addExpense({
        userId: user?.id,
        type,
        subType,
        amount,
        date: today(),
        label,
        details: 'Quick add',
      });
    } catch (e) {
      console.error('Quick add failed:', e);
    }
  };

  const QuickAddButton = ({ icon, label, onAdd }) => {
    const [added, setAdded] = useState(false);

    const handleClick = async () => {
      await onAdd();
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    };

    return (
      <button
        onClick={handleClick}
        disabled={added}
        className={`p-3 rounded-xl text-center transition active:scale-95 ${
          added
            ? 'bg-green-500/20 border-green-500/50'
            : d
              ? 'bg-slate-700/50 hover:bg-slate-700 border-slate-600'
              : 'bg-white hover:bg-slate-100 border-slate-200'
        } border`}
      >
        <span className="text-xl">{added ? '✓' : icon}</span>
        <p className={`text-xs mt-1 font-medium ${
          added
            ? 'text-green-400'
            : d ? 'text-slate-300' : 'text-slate-700'
        }`}>
          {added ? 'Added!' : label}
        </p>
      </button>
    );
  };

  const SubChips = ({ type }) => (
    <div className="flex flex-wrap gap-1.5">
      {SUB_CATEGORIES[type]?.map(sub => (
        <button key={sub.id} type="button"
          onClick={() => setFormData({ ...formData, subType: sub.id })}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
            formData.subType === sub.id
              ? 'bg-indigo-600 text-white'
              : d ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
          }`}>
          <span>{sub.icon}</span>
          <span>{sub.label}</span>
        </button>
      ))}
    </div>
  );

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
          <button onClick={toggleTheme} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition ${d ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
            {d ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* Slide-out menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className={`fixed top-0 left-0 bottom-0 w-72 sm:w-80 z-50 shadow-2xl flex flex-col ${d ? "bg-slate-900" : "bg-white"}`} style={{ animation: "slideRight .2s ease-out" }}>
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Budget Alerts */}
        {user?.budgets?.total > 0 && (
          <>
            <OverspendingAlert spent={getThisMonthSpending().total} budget={user.budgets.total} />
            <BudgetWarningAlert spent={getThisMonthSpending().total} budget={user.budgets.total} />
          </>
        )}

        {/* Subtle nudge tip */}
        {showNudge && (
          <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-xs ${d ? "bg-slate-900 text-slate-400 border border-slate-800" : "bg-slate-100 text-slate-500"}`}>
            <span>🚌</span>
            <span className="flex-1">No transport logged today</span>
            <button onClick={dismissNudge} className={`${d ? "text-slate-600 hover:text-slate-400" : "text-slate-400 hover:text-slate-600"}`}>✕</button>
          </div>
        )}

        {/* Education setup reminder */}
        {!user?.educationProfile?.setupComplete && (
          <button onClick={() => navigate('education-setup')}
            className={`w-full mb-4 p-4 rounded-2xl flex items-center gap-3 transition active:scale-[0.98] ${
              d ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30'
                : 'bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200'
            }`}>
            <span className="relative flex">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75" />
              <span className="relative inline-flex rounded-full w-3 h-3 bg-orange-500" />
            </span>
            <div className="flex-1 text-left">
              <p className={`font-semibold text-sm ${d ? 'text-orange-400' : 'text-orange-700'}`}>Setup Your Education Profile</p>
              <p className={`text-xs ${d ? 'text-orange-300/70' : 'text-orange-500/80'}`}>Tap to complete setup for better tracking</p>
            </div>
            <span className={d ? 'text-orange-400' : 'text-orange-600'}>→</span>
          </button>
        )}

        {/* Quick Add Section */}
        <div className="mb-4">
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className={`w-full p-3 rounded-xl flex items-center justify-between ${
              d ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-white hover:bg-slate-50'
            } border ${d ? 'border-slate-700' : 'border-slate-200'} transition`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className={`font-medium ${d ? 'text-white' : 'text-slate-900'}`}>Quick Add</span>
            </div>
            <span className={`text-sm ${d ? 'text-slate-400' : 'text-slate-500'}`}>
              {showQuickAdd ? '▲' : '▼'}
            </span>
          </button>

          {showQuickAdd && (
            <div className={`mt-2 p-3 rounded-xl ${d ? 'bg-slate-800/30' : 'bg-slate-50'} border ${d ? 'border-slate-700' : 'border-slate-200'}`}
              style={{ animation: "slideDown .2s ease-out" }}>
              <p className={`text-xs mb-3 ${d ? 'text-slate-500' : 'text-slate-400'}`}>
                Tap to add instantly
              </p>
              <div className="grid grid-cols-3 gap-2">
                <QuickAddButton icon="🚌" label="Bus ৳20" onAdd={() => quickAdd('transport', 'bus', 20, 'Bus')} />
                <QuickAddButton icon="🛺" label="CNG ৳50" onAdd={() => quickAdd('transport', 'rickshaw', 50, 'Rickshaw/CNG')} />
                <QuickAddButton icon="🍛" label="Lunch ৳80" onAdd={() => quickAdd('canteen', 'lunch', 80, 'Lunch')} />
                <QuickAddButton icon="☕" label="Tea ৳15" onAdd={() => quickAdd('canteen', 'tea_coffee', 15, 'Tea/Coffee')} />
                <QuickAddButton icon="🍿" label="Snacks ৳30" onAdd={() => quickAdd('canteen', 'snacks', 30, 'Snacks')} />
                <QuickAddButton icon="📖" label="Copy ৳20" onAdd={() => quickAdd('education', 'books', 20, 'Photocopy')} />
              </div>
            </div>
          )}
        </div>

        {/* Total Cost — Display only */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 mb-6 shadow-xl shadow-indigo-600/20">
          <p className="text-white/60 text-xs sm:text-sm font-medium mb-2">Total Cost</p>
          <p className="text-white text-4xl sm:text-5xl font-bold tracking-tight">{fmt(total)}</p>
          <p className="text-white/40 text-xs mt-3">
            {expenses.length} transaction{expenses.length !== 1 ? "s" : ""}
            {!isPro && expenses.length > 0 && <span className="ml-2 text-indigo-300/60">· Last 3 months</span>}
          </p>
        </div>

        {/* Budget Progress Section */}
        {user?.budgets?.total > 0 && (
          <div className={`mb-4 p-4 rounded-2xl ${d ? 'bg-slate-800/50' : 'bg-white'} border ${d ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${d ? 'text-white' : 'text-slate-900'}`}>This Month's Budget</h3>
              <button onClick={() => navigate('budget-settings')}
                className={`text-xs ${d ? 'text-indigo-400' : 'text-indigo-600'}`}>Edit →</button>
            </div>
            <div className="mb-4">
              <BudgetProgress category="Total Budget" spent={getThisMonthSpending().total} budget={user.budgets.total} icon="💵" />
            </div>
            <details className="group">
              <summary className={`text-xs cursor-pointer ${d ? 'text-slate-500' : 'text-slate-400'} list-none flex items-center gap-1`}>
                <span className="group-open:rotate-90 transition-transform">▶</span>
                View by category
              </summary>
              <div className="mt-3 space-y-3">
                {user.budgets.education > 0 && <BudgetProgress category="Education" spent={getThisMonthSpending().education} budget={user.budgets.education} icon="🎓" />}
                {user.budgets.transport > 0 && <BudgetProgress category="Transport" spent={getThisMonthSpending().transport} budget={user.budgets.transport} icon="🚌" />}
                {user.budgets.canteen > 0 && <BudgetProgress category="Food" spent={getThisMonthSpending().canteen} budget={user.budgets.canteen} icon="🍽️" />}
                {user.budgets.hostel > 0 && <BudgetProgress category="Residence" spent={getThisMonthSpending().hostel} budget={user.budgets.hostel} icon="🏠" />}
              </div>
            </details>
          </div>
        )}

        {/* Monthly Summary */}
        <MonthlySummaryCard />

        {/* 4 Category Cards — clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <div key={cat.id}>
              <button onClick={() => openForm(cat.id)}
                className={`w-full text-left bg-gradient-to-br ${cat.gradient} border ${cat.border} rounded-2xl p-4 sm:p-5 transition-all hover:scale-[1.02] active:scale-[0.98] ${activeForm === cat.id ? "ring-2 ring-indigo-500" : ""}`}>
                <div className="text-2xl sm:text-3xl mb-3">{cat.icon}</div>
                <p className={`text-xs sm:text-sm font-medium mb-1 ${d ? "text-slate-400" : "text-slate-500"}`}>{cat.label}</p>
                <p className={`text-xl sm:text-2xl font-bold ${cat.text}`}>{fmt(cat.amount)}</p>
              </button>

              {/* Inline input form */}
              {activeForm === cat.id && (
                <div className={`mt-2 rounded-2xl p-4 border transition-all ${d ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-lg"}`}
                  style={{ animation: "slideDown .2s ease-out" }}>

                  {/* Education: sub-type + amount + optional details */}
                  {cat.id === "education" && (
                    <div className="flex flex-col gap-2.5">
                      <SubChips type="education" />
                      <input type="number" placeholder="Amount" value={formData.amount || ""}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className={inputClass} inputMode="numeric" autoFocus />
                      <input type="text" placeholder="Details (optional)" value={formData.details || ""}
                        onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                        className={inputClass} />
                    </div>
                  )}

                  {/* Transport: sub-type + date + amount */}
                  {cat.id === "transport" && (
                    <div className="flex flex-col gap-2.5">
                      <SubChips type="transport" />
                      <input type="date" value={formData.date || today()}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className={inputClass} />
                      <input type="number" placeholder="Amount" value={formData.amount || ""}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className={inputClass} inputMode="numeric" autoFocus />
                    </div>
                  )}

                  {/* Canteen: sub-type + date + amount */}
                  {cat.id === "canteen" && (
                    <div className="flex flex-col gap-2.5">
                      <SubChips type="canteen" />
                      <input type="date" value={formData.date || today()}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className={inputClass} />
                      <input type="number" placeholder="Amount" value={formData.amount || ""}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className={inputClass} inputMode="numeric" autoFocus />
                    </div>
                  )}

                  {/* Residence: sub-type + month + amount */}
                  {cat.id === "hostel" && (
                    <div className="flex flex-col gap-2.5">
                      <SubChips type="hostel" />
                      <input type="month" value={formData.month || currentMonth()}
                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                        className={inputClass} />
                      <input type="number" placeholder="Amount" value={formData.amount || ""}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className={inputClass} inputMode="numeric" autoFocus />
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button onClick={handleSave} disabled={saving || !formData.amount || !formData.subType}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition active:scale-95">
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setActiveForm(null)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${d ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty state when no expenses */}
        {expenses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center mt-4">
            <span className="text-5xl mb-4">💸</span>
            <h3 className={`text-lg font-semibold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              No expenses yet
            </h3>
            <p className={`text-sm mb-6 max-w-xs ${d ? 'text-slate-400' : 'text-slate-500'}`}>
              Start tracking your student expenses. Tap a category above to add your first expense!
            </p>
            <button
              onClick={() => openForm('canteen')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition active:scale-95"
            >
              Add First Expense
            </button>
          </div>
        )}

        {/* Recent Expenses — with delete/undo */}
        {expenses.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowRecent(!showRecent)}
              className={`w-full p-3 rounded-xl flex items-center justify-between ${
                d ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-white hover:bg-slate-50'
              } border ${d ? 'border-slate-700' : 'border-slate-200'} transition`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🕒</span>
                <span className={`font-medium ${d ? 'text-white' : 'text-slate-900'}`}>Recent Expenses</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${d ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {expenses.length}
                </span>
              </div>
              <span className={`text-sm ${d ? 'text-slate-400' : 'text-slate-500'}`}>
                {showRecent ? '▲' : '▼'}
              </span>
            </button>

            {showRecent && (
              <div className={`mt-2 rounded-2xl overflow-hidden border ${d ? 'border-slate-700' : 'border-slate-200'}`}
                style={{ animation: "slideDown .2s ease-out" }}>
                <div className={`px-4 py-2.5 ${d ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>
                    Swipe or tap the delete button to remove a mistaken entry
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {[...expenses].reverse().slice(0, 20).map((exp) => {
                    const catIcons = { education: '🎓', transport: '🚌', canteen: '🍽️', hostel: '🏠' };
                    const isConfirming = deleteConfirm === exp.id;
                    return (
                      <div key={exp.id || `${exp.date}-${exp.amount}-${exp.type}`}
                        className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 ${
                          d ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'
                        }`}>
                        <span className="text-lg">{catIcons[exp.type] || '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-slate-900'}`}>
                            {exp.label || exp.type}
                          </p>
                          <p className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>
                            {exp.date} {exp.details ? `· ${exp.details}` : ''}
                          </p>
                        </div>
                        <p className={`text-sm font-bold shrink-0 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                          {fmt(Number(exp.amount))}
                        </p>
                        {isConfirming ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                removeExpense(exp.id);
                                setDeleteConfirm(null);
                                addToast(`Removed ${exp.label || exp.type} (${fmt(Number(exp.amount))})`, 'info');
                              }}
                              className="text-xs px-2 py-1.5 rounded-lg bg-red-500 text-white font-semibold"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className={`text-xs px-2 py-1.5 rounded-lg font-medium ${
                                d ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(exp.id)}
                            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition ${
                              d ? 'hover:bg-red-500/20 text-slate-600 hover:text-red-400'
                                : 'hover:bg-red-50 text-slate-300 hover:text-red-500'
                            }`}
                            title="Remove this expense"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {expenses.length > 20 && (
                  <div className={`px-4 py-2.5 text-center ${d ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <button onClick={() => navigate('reports')}
                      className={`text-xs font-medium ${d ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      View all {expenses.length} expenses in Reports →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
