import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

export const BudgetSettingsView = () => {
  const { user, setUser, navigate, theme } = useApp();
  const d = theme === 'dark';

  const [budgets, setBudgets] = useState({
    education: '',
    transport: '',
    canteen: '',
    hostel: '',
    total: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.title = 'Budget Settings — ClassCost';
    // Load existing budgets
    if (user?.budgets) {
      setBudgets({
        education: user.budgets.education || '',
        transport: user.budgets.transport || '',
        canteen: user.budgets.canteen || '',
        hostel: user.budgets.hostel || '',
        total: user.budgets.total || '',
      });
    }
  }, [user]);

  const categories = [
    { id: 'education', label: 'Education', bangla: 'শিক্ষা', icon: '🎓', hint: 'Tuition, books, coaching' },
    { id: 'transport', label: 'Transport', bangla: 'যাতায়াত', icon: '🚌', hint: 'Bus, CNG, trips home' },
    { id: 'canteen', label: 'Food', bangla: 'খাবার', icon: '🍽️', hint: 'Canteen, mess, outside food' },
    { id: 'hostel', label: 'Residence', bangla: 'থাকা', icon: '🏠', hint: 'Rent, utilities, hostel' },
  ];

  const handleSave = () => {
    const budgetData = {
      education: Number(budgets.education) || 0,
      transport: Number(budgets.transport) || 0,
      canteen: Number(budgets.canteen) || 0,
      hostel: Number(budgets.hostel) || 0,
      total: Number(budgets.total) || 0,
      updatedAt: new Date().toISOString(),
    };

    setUser(prev => ({
      ...prev,
      budgets: budgetData,
    }));

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigate('settings');
    }, 1500);
  };

  const calculateSuggestedTotal = () => {
    return (Number(budgets.education) || 0) +
           (Number(budgets.transport) || 0) +
           (Number(budgets.canteen) || 0) +
           (Number(budgets.hostel) || 0);
  };

  const inputClass = `w-full rounded-xl py-3 px-4 text-lg outline-none transition text-right ${
    d ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
  } border`;

  return (
    <div className={`min-h-screen ${d ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 px-4 py-4 ${d ? 'bg-slate-950/90' : 'bg-white/90'} backdrop-blur-xl border-b ${d ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('settings')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${d ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
            <span className={d ? 'text-slate-400' : 'text-slate-500'}>←</span>
          </button>
          <h1 className={`text-lg font-bold ${d ? 'text-white' : 'text-slate-900'}`}>
            Monthly Budget
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Info Card */}
        <div className={`p-4 rounded-2xl mb-6 ${d ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'} border`}>
          <p className={`text-sm ${d ? 'text-indigo-300' : 'text-indigo-700'}`}>
            মাসিক বাজেট সেট করুন — Set your monthly spending limits. You'll get alerts when approaching or exceeding these limits.
          </p>
        </div>

        {/* Category Budgets */}
        <div className="space-y-4 mb-6">
          {categories.map((cat) => (
            <div key={cat.id} className={`p-4 rounded-2xl ${d ? 'bg-slate-800/50' : 'bg-white'} border ${d ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1">
                  <p className={`font-semibold ${d ? 'text-white' : 'text-slate-900'}`}>
                    {cat.label} <span className={`font-normal ${d ? 'text-slate-500' : 'text-slate-400'}`}>({cat.bangla})</span>
                  </p>
                  <p className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>{cat.hint}</p>
                </div>
              </div>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${d ? 'text-slate-400' : 'text-slate-500'}`}>৳</span>
                <input
                  type="number"
                  placeholder="0"
                  value={budgets[cat.id]}
                  onChange={(e) => setBudgets({ ...budgets, [cat.id]: e.target.value })}
                  className={`${inputClass} pl-10`}
                  inputMode="numeric"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Total Budget */}
        <div className={`p-4 rounded-2xl mb-6 ${d ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-500/30' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'} border`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">💵</span>
            <div className="flex-1">
              <p className={`font-semibold ${d ? 'text-white' : 'text-slate-900'}`}>Total Monthly Budget</p>
              <p className={`text-xs ${d ? 'text-slate-400' : 'text-slate-500'}`}>
                Suggested: ৳{calculateSuggestedTotal().toLocaleString('en-BD')}
              </p>
            </div>
          </div>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${d ? 'text-slate-400' : 'text-slate-500'}`}>৳</span>
            <input
              type="number"
              placeholder={calculateSuggestedTotal().toString()}
              value={budgets.total}
              onChange={(e) => setBudgets({ ...budgets, total: e.target.value })}
              className={`${inputClass} pl-10`}
              inputMode="numeric"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-6">
          <p className={`text-sm mb-3 ${d ? 'text-slate-400' : 'text-slate-600'}`}>Quick presets:</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Student (৳5K)', values: { education: 2000, transport: 1000, canteen: 1500, hostel: 0, total: 5000 } },
              { label: 'Hostel (৳10K)', values: { education: 2000, transport: 1500, canteen: 3000, hostel: 3000, total: 10000 } },
              { label: 'Private Uni (৳20K)', values: { education: 8000, transport: 2000, canteen: 4000, hostel: 5000, total: 20000 } },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setBudgets(preset.values)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                  d ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saved}
          className={`w-full py-4 rounded-2xl font-semibold text-lg transition ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98]'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save Budget'}
        </button>

        {/* Clear Button */}
        <button
          onClick={() => setBudgets({ education: '', transport: '', canteen: '', hostel: '', total: '' })}
          className={`w-full mt-3 py-3 text-sm ${d ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'}`}
        >
          Clear all limits
        </button>
      </div>
    </div>
  );
};

export default BudgetSettingsView;
