import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, ChevronRight, Home, Calendar, Archive } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GButton } from '../components/ui';
import { LayoutBottomNav } from '../components/layout';
import { haptics } from '../lib/haptics';
import { pageTransition, fadeInUp } from '../lib/animations';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const TYPE_META = {
  apartment: { icon: '🏢', label: 'Apartment' },
  mess: { icon: '🏘️', label: 'Mess' },
  hostel: { icon: '🏨', label: 'Hostel' },
  hotel: { icon: '🏩', label: 'Hotel' },
  dorm: { icon: '🛏️', label: 'Dorm' },
  other: { icon: '🏠', label: 'Other' },
};

function getTypeMeta(type) { return TYPE_META[type] || TYPE_META.other; }

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const HousingLandingPage = () => {
  const { navigate, theme, expenses, housings } = useApp();
  const d = theme === 'dark';

  const activeSetups = useMemo(() => (housings || []).filter(h => h.status === 'active'), [housings]);
  const archivedSetups = useMemo(() => (housings || []).filter(h => h.status === 'inactive'), [housings]);

  // Housing expenses from the regular expense system
  const housingExpenses = useMemo(() => {
    return (expenses || [])
      .filter(e => e.type === 'hostel')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 10);
  }, [expenses]);

  const totalSpent = useMemo(() => {
    return (expenses || []).filter(e => e.type === 'hostel').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [expenses]);

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => { haptics.light(); navigate('dashboard'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Housing</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">

        {/* Add button */}
        <GButton fullWidth size="lg" icon={Plus} onClick={() => { haptics.light(); navigate('add-housing'); }}>
          Add Housing
        </GButton>

        {/* Active housing setups */}
        {activeSetups.length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${d ? 'text-white' : 'text-surface-900'}`}>
              <Home className="w-4 h-4 text-primary-500" /> Active Housing
            </h2>
            <div className="space-y-2.5">
              {activeSetups.map((setup) => {
                const meta = getTypeMeta(setup.type);
                return (
                  <motion.button
                    key={setup.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { haptics.light(); navigate('housing-detail', { params: { housingId: setup.id } }); }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${d ? 'bg-green-900/30' : 'bg-green-50'}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-surface-900'}`}>{setup.name}</p>
                        <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
                          {meta.label}
                          {setup.occupancy === 'shared' ? ' · Shared' : ''}
                          {setup.monthlyRent ? ` · ৳${setup.monthlyRent.toLocaleString()}/mo` : ''}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${d ? 'text-surface-600' : 'text-surface-400'}`} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary card */}
        {totalSpent > 0 && (
          <div className={`p-4 rounded-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>Total Housing Spent</p>
                <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-surface-900'}`}>৳{totalSpent.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent housing transactions */}
        {housingExpenses.length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 ${d ? 'text-white' : 'text-surface-900'}`}>Recent</h2>
            <div className="space-y-2">
              {housingExpenses.map((exp, i) => (
                <div key={exp.id || i} className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'
                }`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg">🏠</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-surface-900'}`}>
                        {exp.details || exp.label || 'Housing'}
                      </p>
                      <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                        {exp.date ? new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold shrink-0 ${d ? 'text-white' : 'text-surface-900'}`}>
                    ৳{(Number(exp.amount) || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Archived */}
        {archivedSetups.length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>
              <Archive className="w-4 h-4" /> Previous Housing
            </h2>
            <div className="space-y-2">
              {archivedSetups.map(setup => {
                const meta = getTypeMeta(setup.type);
                return (
                  <div key={setup.id} className={`p-3.5 rounded-xl border opacity-60 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{meta.icon}</span>
                      <div>
                        <p className={`text-sm font-medium ${d ? 'text-surface-300' : 'text-surface-600'}`}>{setup.name}</p>
                        <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                          {meta.label} · Moved out {setup.moveOutDate ? new Date(setup.moveOutDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {activeSetups.length === 0 && housingExpenses.length === 0 && (
          <div className={`text-center py-12 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
            <span className="text-5xl block mb-3">🏠</span>
            <p className="text-sm font-medium">No housing set up yet</p>
            <p className="text-xs mt-1">Add your apartment, mess, or hostel to start tracking</p>
          </div>
        )}

      </main>
      <LayoutBottomNav />
    </motion.div>
  );
};

export default HousingLandingPage;
