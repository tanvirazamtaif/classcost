import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { Sidebar } from '../components/layout';
import { LayoutBottomNav } from '../components/layout/LayoutBottomNav';
import { AddPaymentV3 } from '../components/feature';
import { Logo } from '../components/ui';
import { makeFmt } from '../utils/format';
import { haptics } from '../lib/haptics';
import { getThemeColors } from '../lib/themeColors';

// ─── Category SVG icons (16x16) ──────────────────────────────
const CAT_ICONS = {
  education: { d: 'M8 2L1 6l7 4 7-4-7-4zM3 8v4l5 3 5-3V8', color: '#6366f1' },
  transport: { d: 'M3 11V5a2 2 0 012-2h6a2 2 0 012 2v6m-10 0h10m-10 0v2h2v-2m6 0v2h2v-2M6 7h4', color: '#3b82f6' },
  food: { d: 'M4 2v5a3 3 0 003 3h0a3 3 0 003-3V2M4 5h6M7 10v4m5-12v4a2 2 0 01-2 2h0v2h0v4', color: '#f97316' },
  residence: { d: 'M2 14V7l6-5 6 5v7H9V10H7v4H2z', color: '#22c55e' },
  materials: { d: 'M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm2 3h4m-4 3h4m-4 3h2', color: '#eab308' },
  clubs: { d: 'M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0', color: '#ec4899' },
  other: { d: 'M8 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z', color: '#64748b' },
};

// Map v3 categories to display categories
const CATEGORY_MAP = {
  semester_fee: 'education', tuition: 'education', exam_fee: 'education', lab_fee: 'education',
  admission_fee: 'education', library_fee: 'education', registration_fee: 'education',
  development_fee: 'education', uniform: 'education', id_card: 'education',
  coaching_monthly: 'education', batch_fee: 'education', coaching_materials: 'education',
  transport: 'transport', food: 'food',
  rent: 'residence', mess_fee: 'residence', utilities: 'residence', deposit: 'residence', moving: 'residence',
  books: 'materials', stationery: 'materials', devices: 'materials',
  medical: 'other', internet: 'other', loan_repayment: 'other', other: 'other',
};

const SCOPES = [
  { id: 'lifetime', label: 'Lifetime' },
  { id: 'thisYear', label: 'This year' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
];

const CATEGORY_GRID = [
  { id: 'education', label: 'Education', nav: 'education-home' },
  { id: 'transport', label: 'Transport', nav: 'transport-page' },
  { id: 'food', label: 'Food', nav: 'food-page' },
  { id: 'residence', label: 'Residence', nav: 'housing-landing' },
  { id: 'materials', label: 'Materials', nav: 'materials-page' },
  { id: 'clubs', label: 'Clubs', nav: 'general-cost-tracker' },
  { id: 'other', label: 'Other', nav: 'other-page' },
];

const ENTITY_TABS = [
  { id: 'institutions', label: 'Institutions', types: ['INSTITUTION'] },
  { id: 'residence', label: 'Residence', types: ['RESIDENCE'] },
  { id: 'clubs', label: 'Clubs', types: ['COACHING'] },
  { id: 'expenses', label: 'Expenses', types: null },
];

function CatIcon({ id, size = 16 }) {
  const icon = CAT_ICONS[id];
  if (!icon) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke={icon.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={icon.d} />
    </svg>
  );
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── DASHBOARD ────────────────────────────────────────────────
export const DashboardV3 = () => {
  const { user, navigate, theme } = useApp();
  const {
    entities, upcomingObligations, ledgerSummary, recentEntries,
    loading, scopedTotals, monthTrend, recordPayment,
  } = useV3();

  const d = theme === 'dark';
  const c = getThemeColors(d);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scope, setScope] = useState('lifetime');
  const [entityTab, setEntityTab] = useState('institutions');

  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || 'BDT');
  const firstName = user?.name?.split(' ')[0] || 'there';

  useEffect(() => { document.title = 'Dashboard — ClassCost'; }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const overdue = useMemo(
    () => upcomingObligations.filter(o => o.status === 'OVERDUE'),
    [upcomingObligations]
  );

  const activeEntities = useMemo(() => (entities || []).filter(e => e.isActive), [entities]);

  // Category totals for current scope
  const categoryTotals = useMemo(() => {
    const byCategory = scopedTotals[scope]?.byCategory || {};
    const grouped = {};
    for (const [cat, amount] of Object.entries(byCategory)) {
      const display = CATEGORY_MAP[cat] || 'other';
      grouped[display] = (grouped[display] || 0) + amount;
    }
    return grouped;
  }, [scope, scopedTotals]);

  const scopeTotal = scopedTotals[scope]?.total || 0;

  // Entity totals from summary
  const entityTotals = useMemo(() => {
    const map = {};
    if (ledgerSummary?.perEntity) {
      for (const e of ledgerSummary.perEntity) {
        if (e.entityId) map[e.entityId] = e.net;
      }
    }
    return map;
  }, [ledgerSummary]);

  // Filtered entities for tab
  const tabEntities = useMemo(() => {
    const tab = ENTITY_TABS.find(t => t.id === entityTab);
    if (!tab || !tab.types) return [];
    return activeEntities.filter(e => tab.types.includes(e.type));
  }, [entityTab, activeEntities]);

  const recentList = useMemo(() => (recentEntries || []).slice(0, 15), [recentEntries]);

  // Institution breakdown for education card
  const instBreakdown = useMemo(() => {
    if (!ledgerSummary?.perEntity) return '';
    return ledgerSummary.perEntity
      .filter(e => e.entityId)
      .map(e => {
        const entity = activeEntities.find(ent => ent.id === e.entityId);
        if (!entity || entity.type !== 'INSTITUTION') return null;
        const shortName = entity.name.length > 12 ? entity.name.slice(0, 12) : entity.name;
        return `${shortName} ${fmt(e.net / 100)}`;
      })
      .filter(Boolean)
      .slice(0, 3)
      .join(' · ');
  }, [ledgerSummary, activeEntities, fmt]);

  return (
    <div className="min-h-screen pb-24" style={{ background: c.bg }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 backdrop-blur-xl"
        style={{ height: 56, background: c.headerBg, borderBottom: `0.5px solid ${BORDER}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { haptics.light(); setSidebarOpen(true); }} className="p-1">
            <Menu size={20} color={TEXT2} />
          </button>
          <Logo size={24} />
          <span className="text-sm" style={{ color: c.text2 }}>{greeting}, <span style={{ color: c.text1 }}>{firstName}</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-1">
            <Bell size={18} color={TEXT2} />
            {overdue.length > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          <button onClick={() => navigate('settings')} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
            style={{ background: c.accent }}>
            {(user?.name || 'U')[0].toUpperCase()}
          </button>
        </div>
      </header>

      <div className="max-w-[420px] mx-auto px-4 pt-4">

        {/* ── Hero Card (4 quadrants) ──────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="rounded-2xl p-4 mb-4"
          style={{ background: c.heroBg, border: `0.5px solid ${c.heroBorder}` }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-medium" style={{ color: '#8b5cf6' }}>Lifetime</p>
              <p className="text-[22px] font-medium mt-0.5" style={{ color: c.text1 }}>
                {fmt((scopedTotals.lifetime?.total || 0) / 100)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium" style={{ color: '#8b5cf6' }}>This month</p>
              <p className="text-[22px] font-medium mt-0.5" style={{ color: c.text1 }}>
                {fmt((scopedTotals.thisMonth?.total || 0) / 100)}
              </p>
              {monthTrend.direction !== 'flat' && (
                <span className="text-[10px]" style={{ color: monthTrend.direction === 'down' ? '#22c55e' : '#ef4444' }}>
                  {monthTrend.direction === 'up' ? '↑' : '↓'} {monthTrend.pct}%
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px]" style={{ color: c.text3 }}>This year</p>
              <p className="text-sm font-medium" style={{ color: c.text2 }}>
                {fmt((scopedTotals.thisYear?.total || 0) / 100)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px]" style={{ color: c.text3 }}>Last month</p>
              <p className="text-sm font-medium" style={{ color: c.text2 }}>
                {fmt((scopedTotals.lastMonth?.total || 0) / 100)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Welcome banner (new users only) ────────────── */}
        {!loading && activeEntities.length === 0 && recentList.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl p-4 mb-4 text-center"
            style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
            <p className="text-sm font-medium" style={{ color: c.text1 }}>Welcome to ClassCost</p>
            <p className="text-xs mt-1" style={{ color: c.text3 }}>
              Tap the <span style={{ color: c.accent }}>+</span> button below to add your first expense
            </p>
          </motion.div>
        )}

        {/* ── Scope Switcher ───────────────────────────────── */}
        <div className="rounded-xl p-[3px] mb-4 flex" style={{ background: c.heroBg, border: `0.5px solid ${c.border}` }}>
          {SCOPES.map(s => (
            <button key={s.id} onClick={() => { haptics.light(); setScope(s.id); }}
              className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-all"
              style={{
                background: scope === s.id ? ACCENT : 'transparent',
                color: scope === s.id ? 'white' : TEXT3,
              }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Category Grid ────────────────────────────────── */}
        <div className="space-y-2.5 mb-5">
          {/* Education hero card */}
          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate('education-home')}
            className="w-full text-left rounded-xl p-4" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CatIcon id="education" size={20} />
                <span className="text-xs font-medium" style={{ color: c.text2 }}>Education</span>
              </div>
              <ChevronRight size={14} color={TEXT3} />
            </div>
            <p className="text-lg font-semibold mt-2" style={{ color: c.text1 }}>
              {fmt((categoryTotals.education || 0) / 100)}
            </p>
            {scopeTotal > 0 && (
              <div className="mt-2">
                <div className="h-[2px] rounded-full overflow-hidden" style={{ background: c.border }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(100, Math.round(((categoryTotals.education || 0) / scopeTotal) * 100))}%`,
                    background: c.accent,
                  }} />
                </div>
              </div>
            )}
            {instBreakdown && (
              <p className="text-[10px] mt-1.5 truncate" style={{ color: c.text3 }}>{instBreakdown}</p>
            )}
          </motion.button>

          {/* Row 2: Transport | Food | Residence */}
          <div className="grid grid-cols-3 gap-2.5">
            {CATEGORY_GRID.slice(1, 4).map((cat, i) => (
              <motion.button key={cat.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }} whileTap={{ scale: 0.96 }}
                onClick={() => navigate(cat.nav)}
                className="rounded-xl p-3 text-left" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                <CatIcon id={cat.id} />
                <p className="text-[11px] mt-1.5" style={{ color: c.text2 }}>{cat.label}</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: c.text1 }}>
                  {fmt((categoryTotals[cat.id] || 0) / 100)}
                </p>
                {scopeTotal > 0 && (
                  <div className="h-[2px] rounded-full mt-1.5 overflow-hidden" style={{ background: c.border }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, Math.round(((categoryTotals[cat.id] || 0) / scopeTotal) * 100))}%`,
                      background: CAT_ICONS[cat.id]?.color || TEXT3,
                    }} />
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Row 3: Materials | Clubs | Other */}
          <div className="grid grid-cols-3 gap-2.5">
            {CATEGORY_GRID.slice(4).map((cat, i) => (
              <motion.button key={cat.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }} whileTap={{ scale: 0.96 }}
                onClick={() => navigate(cat.nav)}
                className="rounded-xl p-3 text-left" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                <CatIcon id={cat.id} />
                <p className="text-[11px] mt-1.5" style={{ color: c.text2 }}>{cat.label}</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: c.text1 }}>
                  {fmt((categoryTotals[cat.id] || 0) / 100)}
                </p>
                {scopeTotal > 0 && (
                  <div className="h-[2px] rounded-full mt-1.5 overflow-hidden" style={{ background: c.border }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, Math.round(((categoryTotals[cat.id] || 0) / scopeTotal) * 100))}%`,
                      background: CAT_ICONS[cat.id]?.color || TEXT3,
                    }} />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Entity Tabs ──────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex gap-1 mb-3 rounded-xl p-[3px]" style={{ background: c.heroBg, border: `0.5px solid ${c.border}` }}>
            {ENTITY_TABS.map(tab => (
              <button key={tab.id} onClick={() => { haptics.light(); setEntityTab(tab.id); }}
                className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: entityTab === tab.id ? ACCENT : 'transparent',
                  color: entityTab === tab.id ? 'white' : TEXT3,
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {entityTab !== 'expenses' ? (
            <div className="space-y-2">
              {tabEntities.length === 0 ? (
                <div className="rounded-xl p-6 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                  <p className="text-sm" style={{ color: c.text3 }}>No {entityTab} yet</p>
                </div>
              ) : (
                tabEntities.map(entity => (
                  <button key={entity.id}
                    onClick={() => navigate('institution-detail', { params: { entityId: entity.id } })}
                    className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition hover:opacity-90"
                    style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: 'rgba(99,102,241,0.1)' }}>
                      {entity.type === 'INSTITUTION' ? '🎓' : entity.type === 'RESIDENCE' ? '🏠' : '📖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: c.text1 }}>{entity.name}</p>
                      <p className="text-[11px]" style={{ color: c.text3 }}>{fmt((entityTotals[entity.id] || 0) / 100)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                        Active
                      </span>
                      <ChevronRight size={14} color={TEXT3} />
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Expenses tab: recent entries */
            <div className="rounded-xl overflow-hidden" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
              {recentList.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm" style={{ color: c.text3 }}>No transactions yet</p>
                </div>
              ) : (
                recentList.map((entry, i) => {
                  const displayCat = CATEGORY_MAP[entry.category] || 'other';
                  const isCredit = entry.direction === 'CREDIT';
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5"
                      style={{ borderTop: i > 0 ? `0.5px solid ${BORDER}` : 'none' }}>
                      <CatIcon id={displayCat} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: c.text1 }}>
                          {entry.note || entry.category}
                        </p>
                        <p className="text-[10px]" style={{ color: c.text3 }}>{fmtDate(entry.date)}</p>
                      </div>
                      <span className="text-sm font-medium" style={{ color: isCredit ? '#22c55e' : TEXT1 }}>
                        {isCredit ? '+' : ''}{fmt(entry.amountMinor / 100)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Nav + Sheet ──────────────────────────────── */}
      <AddPaymentV3
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
      <LayoutBottomNav onAddPress={() => setSheetOpen(true)} />
    </div>
  );
};

export default DashboardV3;
