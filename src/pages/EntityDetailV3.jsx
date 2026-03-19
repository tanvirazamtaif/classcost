import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Filter } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { ClubsTab } from '../components/institution/ClubsTab';
import { StudentInfoTab } from '../components/institution/StudentInfoTab';
import { AddPaymentV3 } from '../components/feature';
import { FAB } from '../components/ui';
import { CATEGORIES as V3_CATEGORIES } from '../core/categories';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { makeFmt } from '../utils/format';
import * as api from '../api';

const TYPE_ICONS = { INSTITUTION: '🎓', RESIDENCE: '🏠', COACHING: '📖' };
const TYPE_LABELS = { INSTITUTION: 'Institution', RESIDENCE: 'Residence', COACHING: 'Coaching' };

const TRACKER_TYPE_BADGES = {
  MONTHLY: { label: 'Monthly', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  SEMESTER: { label: 'Semester', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  ONE_TIME: { label: 'One-time', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  CUSTOM: { label: 'Custom', bg: 'bg-surface-100 dark:bg-surface-800', text: 'text-surface-600 dark:text-surface-400' },
};

export const EntityDetailV3 = () => {
  const { goBack, navigate, addToast, theme, routeParams, user, setUser, clubs, addClub, updateClub, removeClub } = useApp();
  const { entities, trackers, upcomingObligations, ledgerSummary } = useV3();
  const d = theme === 'dark';
  const { entityId } = routeParams || {};

  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || 'BDT');

  const [activeTab, setActiveTab] = useState('trackers');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedTracker, setExpandedTracker] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState(null);

  // Find entity
  const entity = useMemo(
    () => (entities || []).find((e) => e.id === entityId) || null,
    [entities, entityId]
  );

  // Entity trackers
  const entityTrackers = useMemo(
    () => (trackers || []).filter((t) => t.entityId === entityId && t.status === 'ACTIVE'),
    [trackers, entityId]
  );

  // Entity obligations grouped by tracker
  const obligationsByTracker = useMemo(() => {
    const map = {};
    (upcomingObligations || []).forEach((obl) => {
      if (obl.trackerId && entityTrackers.some((t) => t.id === obl.trackerId)) {
        if (!map[obl.trackerId]) map[obl.trackerId] = [];
        map[obl.trackerId].push(obl);
      }
    });
    return map;
  }, [upcomingObligations, entityTrackers]);

  // Entity total from summary
  const entityTotal = useMemo(() => {
    if (!ledgerSummary?.perEntity) return 0;
    const entry = ledgerSummary.perEntity.find((e) => e.entityId === entityId);
    return entry ? entry.net : 0;
  }, [ledgerSummary, entityId]);

  // Load timeline when tab switches
  const loadTimeline = useCallback(async () => {
    if (!entityId || !user?.id) return;
    setTimelineLoading(true);
    try {
      const result = await api.getLedgerEntries(user.id, { entityId });
      setTimeline(result?.data || []);
    } catch (err) {
      console.error('Load timeline error:', err);
    } finally {
      setTimelineLoading(false);
    }
  }, [entityId, user?.id]);

  useEffect(() => {
    if (activeTab === 'timeline') loadTimeline();
  }, [activeTab, loadTimeline]);

  // Student info completeness
  const isInfoIncomplete = entity?.type === 'INSTITUTION' && !user?.profile?.institutionInfo?.[entity?.name]?.classYear;

  if (!entity) {
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <p className={`text-sm ${d ? 'text-surface-400' : 'text-surface-500'}`}>Entity not found</p>
        <button onClick={() => navigate('dashboard', { replace: true })}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm">Back</button>
      </motion.div>
    );
  }

  const isInstitution = entity.type === 'INSTITUTION';

  const TABS = [
    { id: 'trackers', label: 'Trackers' },
    { id: 'timeline', label: 'Timeline' },
    ...(isInstitution ? [{ id: 'clubs', label: 'Clubs' }] : []),
    ...(isInstitution ? [{ id: 'info', label: 'Info', dot: isInfoIncomplete }] : []),
  ];

  function fmtDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function getNextDue(trackerId) {
    const obls = obligationsByTracker[trackerId] || [];
    const pending = obls.filter((o) => ['UPCOMING', 'DUE', 'OVERDUE'].includes(o.status)).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    return pending[0] || null;
  }

  function getTrackerProgress(trackerId) {
    const obls = obligationsByTracker[trackerId] || [];
    const total = obls.reduce((s, o) => s + o.amountMinor, 0);
    const paid = obls.reduce((s, o) => s + (o.amountPaid || 0), 0);
    return { total, paid, remaining: total - paid };
  }

  const filteredTimeline = useMemo(() => {
    if (!filterCategory) return timeline;
    return timeline.filter((e) => e.category === filterCategory);
  }, [timeline, filterCategory]);

  const timelineCategories = useMemo(() => {
    const cats = new Set(timeline.map((e) => e.category));
    return [...cats];
  }, [timeline]);

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => { haptics.light(); goBack(); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-lg font-semibold truncate ${d ? 'text-white' : 'text-surface-900'}`}>
              {entity.name}
            </h1>
            <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
              {TYPE_ICONS[entity.type]} {TYPE_LABELS[entity.type]}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className={`flex border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => { haptics.light(); setActiveTab(t.id); }}
              className={`flex-1 py-2.5 text-xs font-medium text-center transition-all flex items-center justify-center gap-1 ${
                activeTab === t.id
                  ? `${d ? 'text-white' : 'text-surface-900'} border-b-2 border-primary-600`
                  : `${d ? 'text-surface-500' : 'text-surface-400'} border-b-2 border-transparent`
              }`}>
              {t.label}
              {t.dot && <span className="inline-block w-2 h-2 rounded-full bg-red-500" style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* Summary card */}
        <div className={`rounded-2xl p-4 mb-5 ${d ? 'bg-surface-900 border border-surface-800' : 'bg-white border border-surface-200'}`}>
          <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>Total paid</p>
          <p className={`text-2xl font-bold mt-0.5 ${d ? 'text-white' : 'text-surface-900'}`}>
            {fmt(entityTotal / 100)}
          </p>
        </div>

        {/* ── TAB 1: Trackers ──────────────────────────────────── */}
        {activeTab === 'trackers' && (
          <div>
            {entityTrackers.length === 0 ? (
              <div className={`text-center py-12 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                <p className="text-3xl mb-3">📋</p>
                <p className="text-sm">No fee streams yet</p>
                <p className="text-xs mt-1">Add your first fee to start tracking</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entityTrackers.map((tracker) => {
                  const badge = TRACKER_TYPE_BADGES[tracker.type];
                  const nextDue = getNextDue(tracker.id);
                  const { total, paid, remaining } = getTrackerProgress(tracker.id);
                  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                  const isExpanded = expandedTracker === tracker.id;
                  const obls = obligationsByTracker[tracker.id] || [];

                  return (
                    <div key={tracker.id}>
                      <button
                        onClick={() => { haptics.light(); setExpandedTracker(isExpanded ? null : tracker.id); }}
                        className={`w-full text-left rounded-xl p-4 border transition ${
                          d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${d ? 'text-surface-100' : 'text-surface-800'}`}>
                              {tracker.label}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {badge && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                                  {badge.label}
                                </span>
                              )}
                              {nextDue && (
                                <span className={`text-[10px] ${
                                  nextDue.status === 'OVERDUE' ? 'text-red-500' : d ? 'text-surface-500' : 'text-surface-400'
                                }`}>
                                  {nextDue.status === 'OVERDUE' ? 'Overdue' : 'Due ' + fmtDate(nextDue.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <p className={`text-sm font-bold ${remaining > 0 ? (d ? 'text-amber-400' : 'text-amber-600') : (d ? 'text-emerald-400' : 'text-emerald-600')}`}>
                              {remaining > 0 ? fmt(remaining / 100) : 'Paid'}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {total > 0 && (
                          <div className="mt-3">
                            <div className={`h-1.5 rounded-full overflow-hidden ${d ? 'bg-surface-800' : 'bg-surface-100'}`}>
                              <div
                                className="h-full rounded-full bg-primary-500 transition-all"
                                style={{ width: pct + '%' }}
                              />
                            </div>
                            <p className={`text-[10px] mt-1 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                              {fmt(paid / 100)} of {fmt(total / 100)} ({pct}%)
                            </p>
                          </div>
                        )}
                      </button>

                      {/* Expanded: obligations list */}
                      {isExpanded && obls.length > 0 && (
                        <div className={`ml-4 mt-1 space-y-1.5 border-l-2 pl-3 ${d ? 'border-surface-800' : 'border-surface-200'}`}>
                          {obls.map((obl) => (
                            <div key={obl.id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                              d ? 'bg-surface-800/50' : 'bg-surface-50'
                            }`}>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs truncate ${d ? 'text-surface-300' : 'text-surface-600'}`}>
                                  {obl.label}
                                </p>
                                {obl.dueDate && (
                                  <p className={`text-[10px] ${
                                    obl.status === 'OVERDUE' ? 'text-red-500' : d ? 'text-surface-500' : 'text-surface-400'
                                  }`}>
                                    {obl.status === 'OVERDUE' ? 'Overdue' : fmtDate(obl.dueDate)}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-2">
                                <span className={`text-xs font-medium ${
                                  obl.status === 'PAID' ? 'text-emerald-500' :
                                  obl.status === 'OVERDUE' ? 'text-red-500' :
                                  d ? 'text-surface-300' : 'text-surface-600'
                                }`}>
                                  {obl.status === 'PAID' ? '✓ Paid' : fmt((obl.amountRemaining ?? obl.amountMinor) / 100)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => navigate('education-fee-form', { params: { entityId, entityName: entity.name, entityType: entity.type } })}
              className={`w-full mt-4 py-3 rounded-xl border border-dashed text-sm flex items-center justify-center gap-2 transition ${
                d ? 'border-surface-700 text-surface-400 hover:border-surface-600' : 'border-surface-300 text-surface-500 hover:border-surface-400'
              }`}
            >
              <Plus size={16} /> Add fee stream
            </button>
          </div>
        )}

        {/* ── TAB 2: Timeline ──────────────────────────────────── */}
        {activeTab === 'timeline' && (
          <div>
            {/* Category filter */}
            {timelineCategories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs transition ${
                    !filterCategory
                      ? 'bg-primary-600 text-white'
                      : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
                  }`}
                >
                  All
                </button>
                {timelineCategories.map((catId) => {
                  const cat = V3_CATEGORIES[catId];
                  return (
                    <button
                      key={catId}
                      onClick={() => setFilterCategory(filterCategory === catId ? null : catId)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs transition ${
                        filterCategory === catId
                          ? 'bg-primary-600 text-white'
                          : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
                      }`}
                    >
                      {cat?.icon} {cat?.label || catId}
                    </button>
                  );
                })}
              </div>
            )}

            {timelineLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-6 h-6 border-3 border-primary-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : filteredTimeline.length === 0 ? (
              <div className={`text-center py-12 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                <p className="text-3xl mb-3">📜</p>
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className={`rounded-xl border divide-y ${
                d ? 'bg-surface-900 border-surface-800 divide-surface-800' : 'bg-white border-surface-200 divide-surface-100'
              }`}>
                {filteredTimeline.map((entry) => {
                  const cat = V3_CATEGORIES[entry.category];
                  const isCredit = entry.direction === 'CREDIT';
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-lg flex-shrink-0">{cat?.icon || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${d ? 'text-surface-100' : 'text-surface-800'}`}>
                          {entry.note || cat?.label || entry.category}
                        </p>
                        <span className={`text-[10px] ${d ? 'text-surface-500' : 'text-surface-400'}`}>
                          {fmtDate(entry.date)}
                        </span>
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
            )}
          </div>
        )}

        {/* ── TAB 3: Clubs (institution only) ──────────────────── */}
        {activeTab === 'clubs' && isInstitution && (
          <ClubsTab
            institutionName={entity.name}
            clubs={clubs}
            addClub={addClub}
            updateClub={updateClub}
            removeClub={removeClub}
            navigate={navigate}
            dark={d}
            addToast={addToast}
          />
        )}

        {/* ── TAB 4: Info (institution only) ───────────────────── */}
        {activeTab === 'info' && isInstitution && (
          <StudentInfoTab
            institutionName={entity.name}
            user={user}
            setUser={setUser}
            dark={d}
            addToast={addToast}
            onSaveComplete={() => setActiveTab('trackers')}
          />
        )}
      </main>

      {/* FAB + Payment sheet */}
      <FAB onClick={() => setSheetOpen(true)} />
      <AddPaymentV3
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        preselectedEntityId={entityId}
      />

      <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>
    </motion.div>
  );
};

export default EntityDetailV3;
