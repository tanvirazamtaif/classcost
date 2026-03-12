import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis } from 'recharts';
import { useApp } from '../contexts/AppContext';
import { useSubscription } from '../hooks';
import { PaywallModal } from '../components/feature';
import { COLORS } from '../constants';
import { makeFmt } from '../utils/format';

export const ReportsView = () => {
  const { expenses, user, theme } = useApp();
  const { canAccess } = useSubscription();
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || "BDT");
  const d = theme === "dark";

  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');
  const [includeHistorical, setIncludeHistorical] = useState(true);

  useEffect(() => { document.title = "Reports — ClassCost"; }, []);

  const hasHistorical = expenses.some(e => e.isHistorical);
  const filteredExpenses = includeHistorical ? expenses : expenses.filter(e => !e.isHistorical);

  const byType = (t) => filteredExpenses.filter((e) => e.type === t).reduce((s, e) => s + Number(e.amount), 0);
  const transport = byType("transport"), canteen = byType("canteen"), hostel = byType("hostel"),
    coaching = byType("coaching"), batch = byType("batch"), other = byType("other"),
    education = byType("education");
  const grand = transport + canteen + hostel + coaching + batch + other + education;

  const pieData = [
    { name: "Education", value: education }, { name: "Transport", value: transport },
    { name: "Canteen", value: canteen }, { name: "Residence", value: hostel },
    { name: "Coaching", value: coaching }, { name: "Batch", value: batch },
    { name: "Others", value: other },
  ].filter((dd) => dd.value > 0);

  const monthly = () => {
    const m = {};
    filteredExpenses.forEach((e) => { const k = (e.date || "").slice(0, 7); if (k) m[k] = (m[k] || 0) + Number(e.amount); });
    return Object.entries(m).sort().slice(-6).map(([mo, amt]) => ({ month: mo.slice(5) + "/" + mo.slice(2, 4), amt }));
  };

  const getSubCategoryTotals = () => {
    const totals = {};
    filteredExpenses.forEach(exp => {
      const cat = exp.type || 'other';
      const sub = exp.subType || 'other';
      if (!totals[cat]) totals[cat] = {};
      if (!totals[cat][sub]) totals[cat][sub] = 0;
      totals[cat][sub] += Number(exp.amount) || 0;
    });
    return totals;
  };

  const getCategoryLabel = (category) => {
    const labels = { education: '🎓 Education', transport: '🚌 Transport', canteen: '🍽️ Food', hostel: '🏠 Residence' };
    return labels[category] || category;
  };

  const getSubTypeLabel = (category, subType) => {
    const labels = {
      education: { tuition: 'Tuition Fee', admission: 'Admission Fee', exam: 'Exam Fee', books: 'Books/Supplies', coaching: 'Coaching/Tutor', lab: 'Lab Fee', library: 'Library Fee', other_edu: 'Other', historical: 'Previous (Est.)' },
      transport: { bus: 'Bus', rickshaw: 'Rickshaw/CNG', ride_share: 'Uber/Pathao', train: 'Train', fuel: 'Fuel/Petrol', other_transport: 'Other', historical: 'Previous (Est.)' },
      canteen: { lunch: 'Lunch', snacks: 'Snacks', tea_coffee: 'Tea/Coffee', breakfast: 'Breakfast', dinner: 'Dinner', other_food: 'Other', historical: 'Previous (Est.)' },
      hostel: { rent: 'Rent', electricity: 'Electricity', internet: 'Internet/WiFi', water: 'Water Bill', laundry: 'Laundry', other_hostel: 'Other', historical: 'Previous (Est.)' },
    };
    return labels[category]?.[subType] || subType || 'Other';
  };

  const cardClass = `rounded-2xl p-5 border ${d ? "bg-[#0f0f1e] border-[#1e1e3a]" : "bg-white border-slate-200"}`;
  const headingClass = `text-sm font-bold mb-4 ${d ? "text-[#e2e0ff]" : "text-slate-700"}`;
  const labelClass = d ? "text-[#94a3b8]" : "text-slate-600";

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div>
        <h2 className={`text-xl font-bold ${d ? "text-[#e2e0ff]" : "text-slate-900"}`} style={{ fontFamily: "'Fraunces',serif" }}>Analytics</h2>
        <p className={`text-sm ${d ? "text-[#94a3b8]" : "text-slate-400"}`}>Your expense breakdown</p>
      </div>

      <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-600 to-purple-700 border-0">
        <p className="text-indigo-200 text-xs mb-1">TOTAL LIFETIME EXPENSE</p>
        <p className="text-4xl font-bold text-white">{fmt(grand)}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[["Daily", fmt(transport + canteen + other)], ["Education", fmt(education)], ["Housing", fmt(hostel + coaching + batch)]].map(([l, v]) => (
            <div key={l} className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-indigo-200 text-xs">{l}</p>
              <p className="text-white font-bold text-sm">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {pieData.length > 0 && (
        <div className={cardClass}>
          <h3 className={headingClass}>Expense Breakdown</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={pieData} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [fmt(v)]}
                  contentStyle={{ borderRadius: "12px", border: "none", background: d ? "#0f0f1a" : "#fff", color: d ? "#e2e0ff" : "#333" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col gap-1.5">
              {pieData.map((dd, i) => (
                <div key={dd.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <p className={`text-xs flex-1 ${labelClass}`}>{dd.name}</p>
                  <p className={`text-xs font-bold ${d ? "text-[#e2e0ff]" : "text-slate-800"}`}>{grand > 0 ? Math.round(dd.value / grand * 100) : 0}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {monthly().length > 0 && (
        <div className={cardClass}>
          <h3 className={headingClass}>Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={monthly()}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: d ? "#666" : "#999" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => [fmt(v), "Total"]}
                contentStyle={{ borderRadius: "12px", border: "none", background: d ? "#0f0f1a" : "#fff", color: d ? "#e2e0ff" : "#333" }} />
              <Line type="monotone" dataKey="amt" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: "#7c3aed", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Historical toggle */}
      {hasHistorical && (
        <button onClick={() => setIncludeHistorical(!includeHistorical)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            includeHistorical
              ? d ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              : d ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
          <span className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
            includeHistorical ? 'bg-indigo-500 text-white' : d ? 'bg-slate-700' : 'bg-slate-300'
          }`}>{includeHistorical ? '✓' : ''}</span>
          Include historical estimates
        </button>
      )}

      {/* Sub-category Breakdown */}
      {grand > 0 && Object.keys(getSubCategoryTotals()).length > 0 && (
        <div className={cardClass}>
          <h3 className={headingClass}>📊 Detailed Breakdown</h3>
          {Object.entries(getSubCategoryTotals()).map(([category, subCategories]) => (
            <div key={category} className="mb-4 last:mb-0">
              <p className={`text-sm font-medium mb-2 ${d ? 'text-slate-400' : 'text-slate-600'}`}>
                {getCategoryLabel(category)}
              </p>
              <div className="space-y-2">
                {Object.entries(subCategories)
                  .sort((a, b) => b[1] - a[1])
                  .map(([subType, amount]) => (
                    <div key={subType} className="flex items-center justify-between">
                      <span className={`text-sm ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                        {getSubTypeLabel(category, subType)}
                      </span>
                      <span className={`text-sm font-medium ${d ? 'text-white' : 'text-slate-900'}`}>
                        {fmt(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Expenses */}
      {filteredExpenses.filter(e => !e.isHistorical).length > 0 && (
        <div className={cardClass}>
          <h3 className={headingClass}>🔝 Top Expenses</h3>
          <div className="space-y-3">
            {filteredExpenses
              .filter(e => !e.isHistorical)
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 5)
              .map((exp, i) => (
                <div key={exp.id || i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      d ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                    }`}>{i + 1}</span>
                    <div>
                      <p className={`text-sm ${d ? 'text-white' : 'text-slate-900'}`}>
                        {exp.label || getSubTypeLabel(exp.type, exp.subType)}
                      </p>
                      <p className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>
                        {exp.date ? new Date(exp.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${d ? 'text-white' : 'text-slate-900'}`}>{fmt(Number(exp.amount))}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Export buttons */}
      {grand > 0 && (
        <div className={cardClass}>
          <h3 className={headingClass}>Export Data</h3>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!canAccess('exportPdf')) {
                  setPaywallFeature('exportPdf');
                  setShowPaywall(true);
                  return;
                }
                // TODO: implement PDF export
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition active:scale-[0.98] ${
                d ? "border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-400" : "border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              📄 Export PDF
            </button>
            <button
              onClick={() => {
                if (!canAccess('exportExcel')) {
                  setPaywallFeature('exportExcel');
                  setShowPaywall(true);
                  return;
                }
                // TODO: implement Excel export
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition active:scale-[0.98] ${
                d ? "border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400" : "border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-600"
              }`}
            >
              📊 Export Excel
            </button>
          </div>
        </div>
      )}

      {grand === 0 && (
        <div className={`text-center py-12 ${d ? "text-slate-500" : "text-slate-400"}`}>
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">No expenses logged yet</p>
        </div>
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={paywallFeature}
        title={paywallFeature === 'exportPdf' ? 'Export to PDF' : 'Export to Excel'}
      />
    </div>
  );
};
