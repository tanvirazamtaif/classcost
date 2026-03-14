import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { makeFmt } from '../utils/format';

const PERIODS = [
  { id: 'this_year', label: 'এই বছর (This Year)', icon: '📅' },
  { id: 'last_year', label: 'গত বছর (Last Year)', icon: '📆' },
  { id: 'last_2_years', label: 'গত ২ বছর (Last 2 Years)', icon: '🗓️' },
  { id: 'all_previous', label: 'পুরো আগের সময় (All Previous)', icon: '📊' },
];

const CATEGORIES = [
  { id: 'education', label: 'Education', bangla: 'শিক্ষা', icon: '🎓', color: 'indigo', hint: 'Tuition, books, coaching, exam fees' },
  { id: 'transport', label: 'Transport', bangla: 'যাতায়াত', icon: '🚌', color: 'sky', hint: 'Bus, rickshaw, fuel costs' },
  { id: 'canteen', label: 'Canteen', bangla: 'খাবার', icon: '🍽️', color: 'amber', hint: 'Lunch, snacks, tea/coffee' },
  { id: 'hostel', label: 'Residence', bangla: 'থাকা', icon: '🏠', color: 'emerald', hint: 'Rent, electricity, internet' },
];

export const HistoricalDataView = () => {
  const { user, setUser, addExpense, navigate, goBack, theme, addToast } = useApp();
  const d = theme === 'dark';
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || 'BDT');

  const [step, setStep] = useState(1); // 1: period, 2: amounts, 3: confirm
  const [period, setPeriod] = useState('');
  const [amounts, setAmounts] = useState({
    education: '',
    transport: '',
    canteen: '',
    hostel: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = 'Add Past Expenses — ClassCost'; }, []);

  const totalEstimate = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const hasAnyAmount = Object.values(amounts).some(v => Number(v) > 0);

  const getPeriodLabel = () => PERIODS.find(p => p.id === period)?.label || '';

  const getPeriodDate = () => {
    const now = new Date();
    switch (period) {
      case 'this_year': return `${now.getFullYear()}-01-01`;
      case 'last_year': return `${now.getFullYear() - 1}-01-01`;
      case 'last_2_years': return `${now.getFullYear() - 2}-01-01`;
      case 'all_previous': return `${now.getFullYear() - 3}-01-01`;
      default: return now.toISOString().slice(0, 10);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const date = getPeriodDate();
      const entries = CATEGORIES
        .filter(cat => Number(amounts[cat.id]) > 0)
        .map(cat => ({
          userId: user?.id,
          type: cat.id,
          subType: 'historical',
          amount: Number(amounts[cat.id]),
          date,
          label: `${cat.label} (Historical)`,
          details: `Past expense — ${getPeriodLabel()}`,
          isHistorical: true,
        }));

      for (const expense of entries) {
        await addExpense(expense);
      }

      // Mark historical data as added in user profile
      setUser(prev => ({
        ...prev,
        educationProfile: {
          ...(prev.educationProfile || {}),
          historicalData: {
            amount: totalEstimate,
            period,
            addedAt: new Date().toISOString(),
          },
        },
      }));

      addToast('Past expenses added successfully!', 'success');
      navigate('dashboard');
    } catch (e) {
      console.error(e);
      addToast('Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = `w-full rounded-xl py-3 px-4 text-base outline-none transition border ${
    d ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
  }`;

  const colorMap = {
    indigo: { bg: d ? 'bg-indigo-500/15' : 'bg-indigo-50', border: d ? 'border-indigo-500/30' : 'border-indigo-200', text: d ? 'text-indigo-300' : 'text-indigo-700' },
    sky: { bg: d ? 'bg-sky-500/15' : 'bg-sky-50', border: d ? 'border-sky-500/30' : 'border-sky-200', text: d ? 'text-sky-300' : 'text-sky-700' },
    amber: { bg: d ? 'bg-amber-500/15' : 'bg-amber-50', border: d ? 'border-amber-500/30' : 'border-amber-200', text: d ? 'text-amber-300' : 'text-amber-700' },
    emerald: { bg: d ? 'bg-emerald-500/15' : 'bg-emerald-50', border: d ? 'border-emerald-500/30' : 'border-emerald-200', text: d ? 'text-emerald-300' : 'text-emerald-700' },
  };

  return (
    <div className={`min-h-screen ${d ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 px-4 py-4 backdrop-blur-xl border-b ${d ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => step > 1 ? setStep(step - 1) : goBack()}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${d ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            ←
          </button>
          <div className="flex-1">
            <h1 className={`font-bold ${d ? 'text-white' : 'text-slate-900'}`}>Add Past Expenses</h1>
            <p className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>Step {step} of 3</p>
          </div>
          {/* Step indicators */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition ${
                s < step ? 'bg-green-500' : s === step ? 'bg-indigo-500' : d ? 'bg-slate-700' : 'bg-slate-300'
              }`} />
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">

        {/* STEP 1: Select Period */}
        {step === 1 && (
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              কোন সময়ের খরচ? 📅
            </h2>
            <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>
              Which period's expenses do you want to add?
            </p>

            <div className={`p-3 rounded-xl mb-6 flex items-start gap-2 ${d ? 'bg-indigo-500/15 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-200'}`}>
              <span className="text-lg">💡</span>
              <p className={`text-sm ${d ? 'text-indigo-300' : 'text-indigo-700'}`}>
                সঠিক না হলেও চলবে — আনুমানিক হিসাব দিন, পরে এডিট করতে পারবেন।
              </p>
            </div>

            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all mb-3 ${
                  period === p.id
                    ? 'border-indigo-500 bg-indigo-500/20'
                    : d ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{p.icon}</span>
                  <span className={`font-semibold ${d ? 'text-white' : 'text-slate-900'}`}>{p.label}</span>
                  {period === p.id && <span className="ml-auto text-indigo-500 text-xl">✓</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2: Enter Amounts */}
        {step === 2 && (
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              আনুমানিক খরচ লিখুন ✍️
            </h2>
            <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>
              Enter estimated costs per category
            </p>

            <div className="space-y-4">
              {CATEGORIES.map(cat => {
                const c = colorMap[cat.color];
                return (
                  <div key={cat.id} className={`p-4 rounded-2xl border ${c.bg} ${c.border}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <p className={`font-semibold ${d ? 'text-white' : 'text-slate-900'}`}>
                          {cat.bangla} ({cat.label})
                        </p>
                        <p className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>{cat.hint}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-medium ${d ? 'text-slate-400' : 'text-slate-500'}`}>৳</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={amounts[cat.id]}
                        onChange={e => setAmounts({ ...amounts, [cat.id]: e.target.value })}
                        className={`${inputClass} pl-10`}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {totalEstimate > 0 && (
              <div className={`mt-4 p-4 rounded-2xl text-center ${d ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-slate-200'}`}>
                <p className={`text-sm ${d ? 'text-slate-400' : 'text-slate-500'}`}>Estimated Total</p>
                <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-slate-900'}`}>{fmt(totalEstimate)}</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Review & Confirm */}
        {step === 3 && (
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              চেক করে নিন ✅
            </h2>
            <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>
              Review your past expenses before saving
            </p>

            <div className={`p-4 rounded-2xl mb-4 ${d ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📅</span>
                <span className={`text-sm font-medium ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                  Period: {getPeriodLabel()}
                </span>
              </div>

              <div className="space-y-3">
                {CATEGORIES.filter(cat => Number(amounts[cat.id]) > 0).map(cat => (
                  <div key={cat.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className={`text-sm ${d ? 'text-slate-300' : 'text-slate-700'}`}>{cat.label}</span>
                    </div>
                    <span className={`font-semibold ${d ? 'text-white' : 'text-slate-900'}`}>
                      {fmt(Number(amounts[cat.id]))}
                    </span>
                  </div>
                ))}
              </div>

              <div className={`mt-4 pt-4 border-t flex items-center justify-between ${d ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className={`font-semibold ${d ? 'text-slate-300' : 'text-slate-700'}`}>Total</span>
                <span className={`text-xl font-bold ${d ? 'text-white' : 'text-slate-900'}`}>{fmt(totalEstimate)}</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl flex items-start gap-2 ${d ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
              <span className="text-lg">⚠️</span>
              <p className={`text-sm ${d ? 'text-amber-300' : 'text-amber-700'}`}>
                These will be added as historical entries. You can edit or delete them later from the Reports page.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className={`flex-1 py-3 rounded-xl font-semibold transition ${
                d ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}>
              ← Back
            </button>
          )}
          {step < 3 && (
            <button onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !period : !hasAnyAmount}
              className={`flex-1 py-3 rounded-xl font-semibold transition ${
                (step === 1 ? !!period : hasAnyAmount)
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98]'
                  : d ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}>
              Next →
            </button>
          )}
          {step === 3 && (
            <button onClick={handleSave} disabled={saving}
              className={`flex-1 py-3 rounded-xl font-semibold transition ${
                saving
                  ? 'bg-indigo-400 text-white cursor-wait'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98]'
              }`}>
              {saving ? 'Saving...' : '✓ Save Past Expenses'}
            </button>
          )}
        </div>

        <button onClick={() => navigate('dashboard')}
          className={`w-full mt-4 py-2 text-sm ${d ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'}`}>
          Skip, I'll add later
        </button>
      </div>
    </div>
  );
};

export default HistoricalDataView;
