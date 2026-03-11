import React, { useState, useRef } from 'react';
import { EDU, WAIVER_OPTIONS } from '../../constants';

const computeCostMetrics = (profile, expenses, semesters, loans = []) => {
  if (!profile) return [];
  const eduLevel = profile.educationLevel;
  const mod = EDU[eduLevel];
  const group = mod?.group;
  const semType = profile.semesterType || "bi";

  const sumExp = (filter) => expenses.filter(filter).reduce((s, e) => s + Number(e.amount || 0), 0);
  const admFee = Number(profile.admissionFee || 0) * (1 - (WAIVER_OPTIONS.find((w) => w.id === profile.admissionWaiver)?.pct || 0) / 100);
  const semFees = semesters.reduce((s, sem) =>
    s + Number(sem.semesterFee || 0) + Number(sem.additionalFee || 0) +
    sem.courses.reduce((c, co) => c + Number(co.fee || 0) * (1 - (co.waiver || 0) / 100), 0), 0);

  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonthPfx = today.toISOString().slice(0, 7);
  const yearStart = `${thisYear}-01-01`;
  const semDays = semType === "tri" ? 122 : semType === "yearly" ? 365 : 183;
  const semStart = new Date(Date.now() - semDays * 86400000).toISOString().split("T")[0];

  const monthlyExp = sumExp((e) => e.date?.startsWith(thisMonthPfx));
  const semesterExp = sumExp((e) => e.date >= semStart) + semFees;
  const yearlyExp = sumExp((e) => e.date >= yearStart);
  const stageTotal = sumExp(() => true) + semFees + admFee;
  const prevTotal = (profile.previousStages || []).reduce((s, st) => s + Number(st.totalAmount || 0), 0);
  const lifetimeTotal = stageTotal + prevTotal;
  const hasPrevStages = prevTotal > 0;

  if (group === "early" || group === "school") {
    return [
      { id: "class", label: `${profile.classYear || "Current"} Cost`, sublabel: "this academic year", value: yearlyExp, alwaysVisible: true, parentLockable: false },
      { id: "stage", label: "Full School Cost", sublabel: "entire time at this school", value: stageTotal, alwaysVisible: false, parentLockable: true },
      { id: "lifetime", label: "Student Life Cost", sublabel: hasPrevStages ? "all stages combined" : "total so far", value: lifetimeTotal, alwaysVisible: false, parentLockable: true, hasPrevStages },
    ];
  } else if (group === "college") {
    return [
      { id: "year", label: "This Year", sublabel: "current academic year", value: yearlyExp, alwaysVisible: true, parentLockable: false },
      { id: "stage", label: "Total College Cost", sublabel: "entire time at this college", value: stageTotal, alwaysVisible: false, parentLockable: true },
      { id: "lifetime", label: "Student Life Cost", sublabel: hasPrevStages ? "school + college combined" : "total so far", value: lifetimeTotal, alwaysVisible: false, parentLockable: true, hasPrevStages },
    ];
  } else if (group === "university") {
    return [
      { id: "month", label: "This Month", sublabel: "current month spending", value: monthlyExp, alwaysVisible: true, parentLockable: false },
      { id: "semester", label: `This ${semType === "tri" ? "Trimester" : "Semester"}`, sublabel: "~last " + semDays + " days", value: semesterExp, alwaysVisible: true, parentLockable: false },
      { id: "year", label: "This Year", sublabel: "current calendar year", value: yearlyExp, alwaysVisible: false, parentLockable: false },
      { id: "stage", label: "Total at University", sublabel: "entire time here", value: stageTotal, alwaysVisible: false, parentLockable: true },
      { id: "lifetime", label: "Student Life Cost", sublabel: hasPrevStages ? "school + college + uni" : "total so far", value: lifetimeTotal, alwaysVisible: false, parentLockable: true, hasPrevStages },
    ];
  } else {
    return [
      { id: "year", label: "This Year", sublabel: "current year", value: yearlyExp, alwaysVisible: true, parentLockable: false },
      { id: "stage", label: "Total Programme Cost", sublabel: "entire programme", value: stageTotal, alwaysVisible: false, parentLockable: true },
      { id: "lifetime", label: "Student Life Cost", sublabel: hasPrevStages ? "all stages combined" : "total so far", value: lifetimeTotal, alwaysVisible: false, parentLockable: true, hasPrevStages },
    ];
  }
};

export const CostSummaryCard = ({ profile, expenses, semesters, loans = [], fmt, gradClass, priv, onLockToggle, onRequestShare }) => {
  const metrics = computeCostMetrics(profile, expenses, semesters, loans);
  const parentRestrictions = profile?.parentRestrictions || {};
  const mod = EDU[profile?.educationLevel];
  const [tempRevealed, setTempRevealed] = useState(false);
  const revealTimer = useRef(null);

  const isStudentLocked = priv.isLocked && priv.studentPIN;
  const isParentLocked = (metricId) => !tempRevealed && parentRestrictions.hideLockable && metrics.find((m) => m.id === metricId)?.parentLockable;

  const alwaysVisible = metrics.filter((m) => m.alwaysVisible);
  const lockable = metrics.filter((m) => !m.alwaysVisible);

  const handleShareReveal = () => {
    setTempRevealed(true);
    clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setTempRevealed(false), 60000);
  };

  const totalDebt = loans.reduce((s, l) => s + Number(l.principal || 0), 0);
  const totalPaid = loans.reduce((s, l) => s + (l.payments || []).reduce((ps, p) => ps + Number(p.amount || 0), 0), 0);
  const outstanding = Math.max(0, totalDebt - totalPaid);

  const MetricRow = ({ metric, dimmed = false }) => {
    const parentHidden = isParentLocked(metric.id);
    const selfHidden = isStudentLocked;

    return (
      <div className={`flex items-center justify-between py-2.5 ${dimmed ? "border-t border-white/10 mt-1" : ""}`}>
        <div>
          <p className={`text-sm font-semibold ${dimmed ? "text-white/80" : "text-white"}`}>{metric.label}</p>
          <p className="text-white/40 text-xs">{metric.sublabel}</p>
        </div>
        <div className="text-right">
          {selfHidden ? (
            <p className="text-white/40 text-sm font-mono tracking-widest">••••••</p>
          ) : parentHidden ? (
            <button onClick={() => onRequestShare(handleShareReveal)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition rounded-xl px-2.5 py-1.5 group">
              <span className="text-white/50 text-xs">🔒</span>
              <span className="text-white/50 text-xs font-medium group-hover:text-white/80 transition">Tap to reveal</span>
            </button>
          ) : (
            <div>
              <p className={`text-base font-bold ${dimmed ? "text-white/90" : "text-white"} tabular-nums`}>{fmt(metric.value)}</p>
              {metric.hasPrevStages && <p className="text-white/40 text-xs">incl. prev stages</p>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-gradient-to-br ${gradClass} rounded-3xl overflow-hidden shadow-xl`}>
      {tempRevealed && (
        <div className="bg-white/20 px-5 py-2 flex items-center justify-between">
          <p className="text-white text-xs font-semibold">👁 Costs visible for 60s</p>
          <button onClick={() => { setTempRevealed(false); clearTimeout(revealTimer.current); }}
            className="text-white/60 hover:text-white text-xs font-bold">Hide now</button>
        </div>
      )}

      <div className="px-5 pt-5 pb-4 flex items-start justify-between">
        <div>
          <p className="text-white/60 text-xs font-medium tracking-wide uppercase mb-0.5">Welcome back</p>
          <h1 className="text-2xl font-bold text-white leading-tight" style={{ fontFamily: "'Fraunces',serif" }}>
            {profile?.fullName?.split(" ")[0] || "Student"} {mod?.icon || "🎓"}
          </h1>
          <p className="text-white/50 text-xs mt-0.5 truncate max-w-48">{profile?.institutionName || ""}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs px-2.5 py-1 bg-white/20 text-white font-bold rounded-xl">{mod?.shortLabel}</span>
          <button onClick={onLockToggle}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-semibold transition ${priv.studentPIN ? (priv.isLocked ? "bg-white/30 text-white" : "bg-white/15 text-white/70 hover:bg-white/25") : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
            {priv.studentPIN ? (priv.isLocked ? "🔒 Locked" : "🔓 Visible") : "🔒 Set PIN"}
          </button>
        </div>
      </div>

      <div className="px-5 pb-2">
        <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Cost Overview</p>
        {alwaysVisible.map((m) => <MetricRow key={m.id} metric={m} />)}
      </div>

      {lockable.length > 0 && (
        <div className="mx-4 mb-4 bg-black/20 rounded-2xl px-4 py-1">
          {lockable.map((m, i) => <MetricRow key={m.id} metric={m} dimmed={i > 0} />)}
          {outstanding > 0 && !isStudentLocked && (
            <div className="flex items-center justify-between py-2.5 border-t border-white/10 mt-1">
              <div>
                <p className="text-sm font-semibold text-rose-300">Outstanding Loans</p>
                <p className="text-white/40 text-xs">education debt remaining</p>
              </div>
              <p className="text-base font-bold text-rose-300 tabular-nums">{fmt(outstanding)}</p>
            </div>
          )}
        </div>
      )}

      {metrics.find((m) => m.id === "lifetime")?.hasPrevStages && !isStudentLocked && (
        <div className="mx-4 mb-4 bg-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-white/60 text-xs">📚</span>
          <p className="text-white/60 text-xs">Includes {(profile?.previousStages || []).length} previous stage{(profile?.previousStages || []).length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
};
