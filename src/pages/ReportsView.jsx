import React, { useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis } from 'recharts';
import { useApp } from '../contexts/AppContext';
import { COLORS } from '../constants';
import { makeFmt } from '../utils/format';

export const ReportsView = () => {
  const { expenses, user, theme } = useApp();
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || "BDT");
  const d = theme === "dark";

  useEffect(() => { document.title = "ClassCost — Reports"; }, []);

  const byType = (t) => expenses.filter((e) => e.type === t).reduce((s, e) => s + Number(e.amount), 0);
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
    expenses.forEach((e) => { const k = (e.date || "").slice(0, 7); if (k) m[k] = (m[k] || 0) + Number(e.amount); });
    return Object.entries(m).sort().slice(-6).map(([mo, amt]) => ({ month: mo.slice(5) + "/" + mo.slice(2, 4), amt }));
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

      {grand === 0 && (
        <div className={`text-center py-12 ${d ? "text-slate-500" : "text-slate-400"}`}>
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">No expenses logged yet</p>
        </div>
      )}
    </div>
  );
};
