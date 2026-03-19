import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ChevronRight, Plus, Clock, CreditCard } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { Header, LayoutBottomNav, Sidebar } from '../components/layout';
import { FAB } from '../components/ui';
import { AddPaymentV3 } from '../components/feature';
import { CATEGORIES as V3_CATEGORIES } from '../core/categories';
import { stagger, fadeInUp } from '../lib/animations';
import { makeFmt } from '../utils/format';

const ENTITY_ICONS = {
  INSTITUTION: '🎓',
  RESIDENCE: '🏠',
  COACHING: '📖',
};

const ENTITY_BADGES = {
  INSTITUTION: { label: 'Institution', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  RESIDENCE: { label: 'Residence', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  COACHING: { label: 'Coaching', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
};

const PERSONAL_BG = {
  transport: 'bg-blue-100 dark:bg-blue-900/30',
  food: 'bg-orange-100 dark:bg-orange-900/30',
  books: 'bg-amber-100 dark:bg-amber-900/30',
  stationery: 'bg-yellow-100 dark:bg-yellow-900/30',
  devices: 'bg-indigo-100 dark:bg-indigo-900/30',
  medical: 'bg-red-100 dark:bg-red-900/30',
  internet: 'bg-cyan-100 dark:bg-cyan-900/30',
  other: 'bg-gray-100 dark:bg-gray-900/30',
};

export const DashboardV3 = () => {
  const { user, theme, navigate } = useApp();
  const {
    entities, upcomingObligations, ledgerSummary, recentEntries,
    loading, recordPayment, refreshSummary,
  } = useV3();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paymentObligation, setPaymentObligation] = useState(null);
  const d = theme === 'dark';
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || 'BDT');

  useEffect(() => { document.title = 'Dashboard — ClassCost'; }, []);

  // Derived data
  const overdue = useMemo(
    () => upcomingObligations.filter((o) => o.status === 'OVERDUE'),
    [upcomingObligations]
  );

  const upcoming7 = useMemo(() => {
    const now = new Date();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    return upcomingObligations.filter((o) => {
      if (o.status === 'OVERDUE') return false;
      if (!o.dueDate) return true;
      const due = new Date(o.dueDate);
      return due >= now && due <= in7;
    });
  }, [upcomingObligations]);

  const activeEntities = useMemo(
    () => entities.filter((e) => e.isActive),
    [entities]
  );

  const personalCategories = useMemo(() => {
    if (!ledgerSummary?.perCategory) return [];
    return ledgerSummary.perCategory
      .filter((c) => {
        const cat = V3_CATEGORIES[c.category];
        return cat && cat.entityTypes === null;
      })
      .sort((a, b) => b.net - a.net);
  }, [ledgerSummary]);

  const recentList = useMemo(() => (recentEntries || []).slice(0, 10), [recentEntries]);

  // Entity total lookup from summary
  const entityTotals = useMemo(() => {
    const map = {};
    if (ledgerSummary?.perEntity) {
      for (const e of ledgerSummary.perEntity) {
        if (e.entityId) map[e.entityId] = e.net;
      }
    }
    return map;
  }, [ledgerSummary]);

  function daysOverdue(dueDate) {
    if (!dueDate) return 0;
    const diff = Date.now() - new Date(dueDate).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  function fmtDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function handleQuickPay(obl) {
    setPaymentObligation(obl);
    setSheetOpen(true);
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading && !ledgerSummary) {
    return (
      <div className={`min-h-screen ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="max-w-md mx-auto px-4 pt-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
          <p className={`mt-4 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <motion.div className="max-w-md mx-auto pb-28 px-4 pt-4" {...stagger}>

        {/* ── 2. Monthly Total Card ──────────────────────────────── */}
        <motion.div {...fadeInUp} className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 p-5 text-white shadow-lg mb-5">
          <p className="text-sm opacity-80">{greeting}, {user?.name?.split(' ')[0] || 'there'}</p>
          <p className="text-3xl font-bold mt-1">
            {fmt((ledgerSummary?.monthlyTotal || 0) / 100)}
          </p>
          <p className="text-sm opacity-70 mt-1">this month</p>
          <div className="flex items-center gap-4 mt-3 text-xs opacity-70">
            <span>Lifetime: {fmt((ledgerSummary?.lifetimeTotal || 0) / 100)}</span>
            <span>Year: {fmt((ledgerSummary?.yearlyTotal || 0) / 100)}</span>
          </div>
        </motion.div>

        {/* ── 3. Overdue Obligations ────────────────────────────── */}
        {overdue.length > 0 && (
          <motion.div {...fadeInUp} className="mb-5">
            <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 rounded-xl px-4 py-3 mb-3">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                {overdue.length} overdue payment{overdue.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {overdue.map((obl) => (
                <div
                  key={obl.id}
                  className={`rounded-xl p-4 border ${d ? 'bg-surface-900 border-red-900/40' : 'bg-white border-red-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${d ? 'text-surface-100' : 'text-surface-800'}`}>
                        {obl.label}
                      </p>
                      <p className="text-xs text-red-500 mt-0.5">
                        {daysOverdue(obl.dueDate)} days overdue
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className={`text-sm font-bold ${d ? 'text-surface-100' : 'text-surface-800'}`}>
                        {fmt((obl.amountRemaining ?? obl.amountMinor) / 100)}
                      </p>
                      <button
                        onClick={() => handleQuickPay(obl)}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg mt-1 hover:bg-red-700 transition"
                      >
                        Pay now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── 4. Upcoming Dues (7 days) ────────────────────────── */}
        {upcoming7.length > 0 && (
          <motion.div {...fadeInUp} className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className={d ? 'text-amber-400' : 'text-amber-600'} />
              <h3 className={`text-sm font-semibold ${d ? 'text-surface-200' : 'text-surface-700'}`}>
                Due this week
              </h3>
            </div>
            <div className="space-y-2">
              {upcoming7.map((obl) => (
                <div
                  key={obl.id}
                  className={`rounded-xl p-4 border ${d ? 'bg-surface-900 border-amber-900/30' : 'bg-white border-amber-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${d ? 'text-surface-100' : 'text-surface-800'}`}>
                        {obl.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {obl.dueDate && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            Due {fmtDate(obl.dueDate)}
                          </span>
                        )}
                        {obl.entity && (
                          <span className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                            {obl.entity.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className={`text-sm font-bold ${d ? 'text-surface-100' : 'text-surface-800'}`}>
                        {fmt((obl.amountRemaining ?? obl.amountMinor) / 100)}
                      </p>
                      <button
                        onClick={() => handleQuickPay(obl)}
                        className="text-xs bg-amber-600 text-white px-3 py-1 rounded-lg mt-1 hover:bg-amber-700 transition"
                      >
                        Mark paid
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── 5. My Entities ───────────────────────────────────── */}
        <motion.div {...fadeInUp} className="mb-5">
          <h3 className={`text-sm font-semibold mb-3 ${d ? 'text-surface-200' : 'text-surface-700'}`}>
            My Places
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {activeEntities.map((entity) => {
              const badge = ENTITY_BADGES[entity.type];
              return (
                <button
                  key={entity.id}
                  onClick={() => navigate('institution-detail', { params: { entityId: entity.id } })}
                  className={`rounded-xl p-4 border text-left transition hover:scale-[1.02] ${
                    d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{ENTITY_ICONS[entity.type] || '🏛️'}</div>
                  <p className={`text-sm font-medium truncate ${d ? 'text-surface-100' : 'text-surface-800'}`}>
                    {entity.name}
                  </p>
                  {badge && (
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  )}
                  <p className={`text-xs mt-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>
                    {fmt((entityTotals[entity.id] || 0) / 100)}
                  </p>
                </button>
              );
            })}
            <button
              onClick={() => navigate('education-setup')}
              className={`rounded-xl p-4 border border-dashed flex flex-col items-center justify-center transition ${
                d ? 'border-surface-700 hover:border-surface-600 text-surface-500' : 'border-surface-300 hover:border-surface-400 text-surface-400'
              }`}
            >
              <Plus size={20} />
              <span className="text-xs mt-1">Add place</span>
            </button>
          </div>
        </motion.div>

        {/* ── 6. Personal Summary ──────────────────────────────── */}
        {personalCategories.length > 0 && (
          <motion.div {...fadeInUp} className="mb-5">
            <h3 className={`text-sm font-semibold mb-3 ${d ? 'text-surface-200' : 'text-surface-700'}`}>
              Personal Spending
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {personalCategories.map((pc) => {
                const cat = V3_CATEGORIES[pc.category];
                if (!cat) return null;
                return (
                  <div
                    key={pc.category}
                    className={`flex-shrink-0 w-28 rounded-xl p-3 ${PERSONAL_BG[pc.category] || 'bg-gray-100 dark:bg-gray-900/30'}`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <p className={`text-xs font-medium mt-1 ${d ? 'text-surface-200' : 'text-surface-700'}`}>
                      {cat.label}
                    </p>
                    <p className={`text-sm font-bold mt-0.5 ${d ? 'text-surface-100' : 'text-surface-800'}`}>
                      {fmt(pc.net / 100)}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── 7. Recent Entries ─────────────────────────────────── */}
        {recentList.length > 0 && (
          <motion.div {...fadeInUp}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${d ? 'text-surface-200' : 'text-surface-700'}`}>
                Recent Transactions
              </h3>
              <button
                onClick={() => navigate('reports')}
                className="text-xs text-primary-500 flex items-center gap-0.5"
              >
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div className={`rounded-xl border divide-y ${
              d ? 'bg-surface-900 border-surface-800 divide-surface-800' : 'bg-white border-surface-200 divide-surface-100'
            }`}>
              {recentList.map((entry) => {
                const cat = V3_CATEGORIES[entry.category];
                const isCredit = entry.direction === 'CREDIT';
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg flex-shrink-0">{cat?.icon || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${d ? 'text-surface-100' : 'text-surface-800'}`}>
                        {entry.note || cat?.label || entry.category}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                          {fmtDate(entry.date)}
                        </span>
                        {entry.tracker?.entity ? (
                          <span className="text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded">
                            {entry.tracker.entity.name}
                          </span>
                        ) : (
                          <span className={`text-[10px] ${d ? 'text-surface-600' : 'text-surface-300'}`}>Personal</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ${
                      isCredit ? 'text-emerald-600 dark:text-emerald-400' : (d ? 'text-surface-100' : 'text-surface-800')
                    }`}>
                      {isCredit ? '+' : ''}{fmt(entry.amountMinor / 100)}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ── 8. FAB + Payment Sheet ────────────────────────────── */}
      <FAB onClick={() => setSheetOpen(true)} />
      <AddPaymentV3
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); setPaymentObligation(null); }}
        preselectedObligation={paymentObligation}
      />
      <LayoutBottomNav />
    </div>
  );
};

export default DashboardV3;
