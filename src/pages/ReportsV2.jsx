import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { GCard, GCardContent } from '../components/ui';
import { ExpenseChart } from '../components/feature';
import { pageTransition } from '../lib/animations';
import { makeFmt } from '../utils/format';
import { getReportsSummary, getWaiverSaved, getForecast } from '../api';

/**
 * Phase 4 — server-side Reports surface (4 tabs), behind ENABLE_REPORTS_V2.
 * Reads the canonical-ledger aggregation + decomposed forecast from the API, so
 * a migrated user's education payments are counted ONCE (no client double-count).
 * Fails soft: any failed fetch degrades gracefully, never crashes the page.
 */

const CAT = {
  education: '🎓 Education', transport: '🚌 Transport', transit: '🚌 Transport',
  food: '🍽️ Food', residence: '🏠 Residence', rent: '🏠 Residence', hostel: '🏠 Residence',
  materials: '📚 Materials', other: '📦 Other',
};
const catLabel = (c) => CAT[c] || `📦 ${c}`;

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'forecast', label: 'Forecast' },
];

export function ReportsV2() {
  const { user, theme } = useApp();
  const d = theme === 'dark';
  const userId = user?.id;
  const currency = user?.profile?.currency || 'BDT';
  const fmt = makeFmt(currency);
  const sym = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : '৳';
  const m = (minor) => fmt((Number(minor) || 0) / 100); // minor → display

  const [tab, setTab] = useState('overview');
  // Initial loading derives from userId so the effect never needs a synchronous setState.
  const [state, setState] = useState(() => ({ loading: Boolean(userId), summary: null, waiver: null, forecast: null }));

  useEffect(() => { document.title = 'Reports — ClassCost'; }, []);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    Promise.allSettled([getReportsSummary(userId), getWaiverSaved(userId), getForecast(userId)])
      .then(([sum, wav, fc]) => {
        if (!alive) return;
        setState({
          loading: false,
          summary: sum.status === 'fulfilled' ? sum.value : null,
          waiver: wav.status === 'fulfilled' ? wav.value : null,
          forecast: fc.status === 'fulfilled' ? fc.value : null,
        });
      });
    return () => { alive = false; };
  }, [userId]);

  const lifetime = state.summary?.lifetime || { total: 0, byCategory: {} };
  const thisMonth = state.summary?.thisMonth || { total: 0, byCategory: {} };
  const lastMonth = state.summary?.lastMonth || { total: 0, byCategory: {} };
  const thisYear = state.summary?.thisYear || { total: 0, byCategory: {} };

  const chartData = useMemo(() => Object.entries(lifetime.byCategory)
    .map(([type, minor]) => ({ type, amount: (minor || 0) / 100, label: catLabel(type) })),
    [lifetime.byCategory]);

  const sortedCats = useMemo(() => Object.entries(lifetime.byCategory)
    .sort((a, b) => b[1] - a[1]), [lifetime.byCategory]);

  const sub = (label, v) => (
    <p className={`text-sm ${d ? 'text-surface-400' : 'text-surface-500'}`}>{label}</p>
  );

  if (state.loading) {
    return <div className="py-12 text-center"><p className={d ? 'text-surface-400' : 'text-surface-500'}>Loading reports…</p></div>;
  }

  const noData = lifetime.total === 0 && !(state.forecast && state.forecast.available);
  if (noData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <span className="text-5xl mb-4">📊</span>
        <h3 className={`text-lg font-semibold mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>No data yet</h3>
        <p className={`text-sm max-w-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
          Record some payments and they'll show up here as totals, breakdowns, and a cost-to-graduation forecast.
        </p>
      </div>
    );
  }

  return (
    <motion.div {...pageTransition} className="flex flex-col gap-4 pb-4">
      <div>
        <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-surface-900'}`} style={{ fontFamily: "'Fraunces',serif" }}>Reports</h2>
        {sub('Your money, summarized')}
      </div>

      {/* Tab bar */}
      <div className={`flex gap-1 p-1 rounded-xl ${d ? 'bg-surface-800' : 'bg-surface-100'}`}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
              tab === t.id
                ? (d ? 'bg-surface-950 text-white' : 'bg-white text-surface-900 shadow-sm')
                : (d ? 'text-surface-400' : 'text-surface-500')
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          <GCard><GCardContent className="text-center py-6">
            <p className={`text-sm mb-1 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Total spent · lifetime</p>
            <p className={`text-3xl font-bold ${d ? 'text-white' : 'text-surface-900'}`} style={{ fontFamily: "'Fraunces',serif" }}>{m(lifetime.total)}</p>
            <p className={`text-xs mt-2 ${d ? 'text-surface-500' : 'text-surface-400'}`}>{m(thisMonth.total)} this month</p>
          </GCardContent></GCard>

          {state.waiver && state.waiver.totalWaiverMinor > 0 && (
            <GCard>
              <GCardContent className="py-5" style={{ background: d ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)' }}>
                <p className={`text-[11px] uppercase tracking-wide font-semibold ${d ? 'text-primary-400' : 'text-primary-600'}`}>Waiver saved · lifetime</p>
                <p className={`text-2xl font-bold mt-1 ${d ? 'text-white' : 'text-surface-900'}`}>{m(state.waiver.totalWaiverMinor)}</p>
              </GCardContent>
            </GCard>
          )}

          {chartData.length > 0 && (
            <GCard><GCardContent>
              <h3 className={`text-sm font-medium mb-4 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Where it went</h3>
              <ExpenseChart expenses={chartData} currencySymbol={sym} />
            </GCardContent></GCard>
          )}
        </>
      )}

      {/* ── BREAKDOWN ── */}
      {tab === 'breakdown' && (
        <GCard><GCardContent>
          <h3 className={`text-sm font-medium mb-4 ${d ? 'text-surface-400' : 'text-surface-500'}`}>By category · lifetime</h3>
          <div className="space-y-3">
            {sortedCats.map(([cat, minor]) => {
              const pct = lifetime.total > 0 ? Math.round((minor / lifetime.total) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm ${d ? 'text-white' : 'text-surface-900'}`}>{catLabel(cat)}</span>
                    <span className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{m(minor)} <span className={d ? 'text-surface-500' : 'text-surface-400'}>· {pct}%</span></span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${d ? 'bg-surface-800' : 'bg-surface-100'}`}>
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </GCardContent></GCard>
      )}

      {/* ── TIMELINE ── */}
      {tab === 'timeline' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[['This month', thisMonth.total], ['Last month', lastMonth.total], ['This year', thisYear.total], ['Lifetime', lifetime.total]].map(([label, val]) => (
              <GCard key={label}><GCardContent className="py-4">
                <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>{label}</p>
                <p className={`text-lg font-bold mt-0.5 ${d ? 'text-white' : 'text-surface-900'}`}>{m(val)}</p>
              </GCardContent></GCard>
            ))}
          </div>
          <GCard><GCardContent>
            <h3 className={`text-sm font-medium mb-3 ${d ? 'text-surface-400' : 'text-surface-500'}`}>This month vs last month</h3>
            {(() => {
              const max = Math.max(thisMonth.total, lastMonth.total, 1);
              const Bar = ({ label, val }) => (
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span className={d ? 'text-surface-400' : 'text-surface-500'}>{label}</span><span className={d ? 'text-white' : 'text-surface-900'}>{m(val)}</span></div>
                  <div className={`h-2 rounded-full overflow-hidden ${d ? 'bg-surface-800' : 'bg-surface-100'}`}><div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.round((val / max) * 100)}%` }} /></div>
                </div>
              );
              const delta = thisMonth.total - lastMonth.total;
              return (
                <>
                  <Bar label="Last month" val={lastMonth.total} />
                  <Bar label="This month" val={thisMonth.total} />
                  <p className={`text-xs mt-2 ${delta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {delta === 0 ? 'No change' : `${delta > 0 ? '▲' : '▼'} ${m(Math.abs(delta))} vs last month`}
                  </p>
                </>
              );
            })()}
          </GCardContent></GCard>
        </>
      )}

      {/* ── FORECAST ── */}
      {tab === 'forecast' && (() => {
        const f = state.forecast;
        if (!f) return <GCard><GCardContent className="py-6"><p className={d ? 'text-surface-400' : 'text-surface-500'}>Forecast unavailable.</p></GCardContent></GCard>;
        if (!f.available) return <GCard><GCardContent className="py-6"><p className={`text-sm ${d ? 'text-surface-400' : 'text-surface-500'}`}>{f.reason}</p></GCardContent></GCard>;
        const Row = ({ label, model }) => model ? (
          <div className="flex items-center justify-between py-1.5">
            <span className={`text-sm ${d ? 'text-surface-300' : 'text-surface-600'}`}>{label}</span>
            <span className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{m(model.medianMinor)}</span>
          </div>
        ) : null;
        return (
          <>
            <GCard><GCardContent className="py-6">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs uppercase tracking-wide font-semibold ${d ? 'text-primary-400' : 'text-primary-600'}`}>Cost to graduation</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-600'}`}>{f.confidence} confidence</span>
              </div>
              <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-surface-900'}`} style={{ fontFamily: "'Fraunces',serif" }}>{m(f.combined.medianMinor)}</p>
              <p className={`text-xs mt-1 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Range {m(f.combined.lowMinor)} – {m(f.combined.highMinor)}</p>
              <p className={`text-[11px] mt-2 ${d ? 'text-surface-500' : 'text-surface-400'}`}>Already spent {m(f.pastActualMinor)} · ~{f.assumptions.semestersRemaining} semesters left · {f.assumptions.inflationPct}% inflation</p>
            </GCardContent></GCard>
            <GCard><GCardContent>
              <h3 className={`text-sm font-medium mb-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>What makes up the projection</h3>
              <Row label="🎓 Tuition (remaining)" model={f.subModels.tuition} />
              <Row label="🏠 Residence (remaining)" model={f.subModels.residence} />
              <Row label="🍽️ Lifestyle (remaining)" model={f.subModels.lifestyle} />
              <p className={`text-[11px] mt-3 ${d ? 'text-surface-500' : 'text-surface-400'}`}>Lifestyle is extrapolated from recent spending — the loosest part of the estimate.</p>
            </GCardContent></GCard>
          </>
        );
      })()}
    </motion.div>
  );
}

export default ReportsV2;
