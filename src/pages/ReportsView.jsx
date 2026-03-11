import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis } from 'recharts';
import { useApp } from '../contexts/AppContext';
import { Card } from '../components/ui';
import { EDU, WAIVER_OPTIONS, COLORS } from '../constants';
import { makeFmt } from '../utils/format';

export const ReportsView = () => {
  const { expenses, semesters, user } = useApp();
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || "BDT");
  const mod = EDU[profile?.educationLevel || "undergrad_private"];

  const byType = (t) => expenses.filter((e) => e.type === t).reduce((s, e) => s + Number(e.amount), 0);
  const transport = byType("transport"), canteen = byType("canteen"), hostel = byType("hostel"),
    coaching = byType("coaching"), batch = byType("batch"), other = byType("other");
  const semTotal = semesters.reduce((s, sem) => s + Number(sem.semesterFee || 0) + sem.courses.reduce((c, co) => c + Number(co.fee || 0), 0) + Number(sem.additionalFee || 0), 0);
  const admFee = Number(profile?.admissionFee || 0) * (1 - (WAIVER_OPTIONS.find((w) => w.id === profile?.admissionWaiver)?.pct || 0) / 100);
  const grand = transport + canteen + hostel + coaching + batch + other + semTotal + admFee;

  const pieData = [
    { name: "Transport", value: transport }, { name: "Canteen", value: canteen },
    { name: "Hostel", value: hostel }, { name: "Coaching", value: coaching },
    { name: "Batch", value: batch }, { name: "Fees", value: semTotal },
    { name: "Others", value: other + admFee },
  ].filter((d) => d.value > 0);

  const monthly = () => {
    const m = {};
    expenses.forEach((e) => { const k = e.date.slice(0, 7); m[k] = (m[k] || 0) + Number(e.amount); });
    return Object.entries(m).sort().slice(-6).map(([mo, amt]) => ({ month: mo.slice(5) + "/" + mo.slice(2, 4), amt }));
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Fraunces',serif" }}>Analytics</h2>
        <p className="text-slate-400 text-sm">{mod?.icon} {mod?.label}</p>
      </div>
      <Card className="p-5 bg-gradient-to-br from-indigo-600 to-purple-700 border-0">
        <p className="text-indigo-200 text-xs mb-1">TOTAL LIFETIME EXPENSE</p>
        <p className="text-4xl font-bold text-white">{fmt(grand)}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[["Daily", fmt(transport + canteen + other)], ["Fees", fmt(semTotal + admFee)], ["Housing", fmt(hostel + coaching + batch)]].map(([l, v]) => (
            <div key={l} className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-indigo-200 text-xs">{l}</p>
              <p className="text-white font-bold text-sm">{v}</p>
            </div>
          ))}
        </div>
      </Card>
      {pieData.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Expense Breakdown</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={pieData} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [fmt(v)]} contentStyle={{ borderRadius: "12px", border: "none" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col gap-1.5">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <p className="text-xs text-slate-600 flex-1">{d.name}</p>
                  <p className="text-xs font-bold">{Math.round(d.value / grand * 100)}%</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      {monthly().length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={monthly()}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => [fmt(v), "Total"]} contentStyle={{ borderRadius: "12px", border: "none" }} />
              <Line type="monotone" dataKey="amt" stroke="#4f46e5" strokeWidth={2.5} dot={{ fill: "#4f46e5", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};
