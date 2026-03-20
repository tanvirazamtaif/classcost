import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { getThemeColors } from '../lib/themeColors';
import { AddPaymentV3 } from '../components/feature';
import { LayoutBottomNav } from '../components/layout/LayoutBottomNav';
import { haptics } from '../lib/haptics';
import { makeFmt } from '../utils/format';
import * as api from '../api';

const TYPE_LABELS = { INSTITUTION: 'Institution', RESIDENCE: 'Residence', COACHING: 'Coaching' };

const TABS = [
  { id: 'semesters', label: 'Semesters' },
  { id: 'other', label: 'Other fees' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'info', label: 'Info' },
];

const OTHER_FEE_CATEGORIES = ['admission_fee', 'registration_fee', 'id_card', 'development_fee', 'library_fee'];

export const EntityDetailV3 = () => {
  const { goBack, navigate, addToast, routeParams, user, theme = 'dark' } = useApp();
  const { entities, trackers, ledgerSummary, addEntity } = useV3();
  const c = getThemeColors(theme === 'dark');
  const { entityId } = routeParams || {};

  const fmt = makeFmt(user?.profile?.currency || 'BDT');

  const [activeTab, setActiveTab] = useState('semesters');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [semLoading, setSemLoading] = useState(false);
  const [infoForm, setInfoForm] = useState({});
  const [saving, setSaving] = useState(false);

  const entity = useMemo(() => (entities || []).find(e => e.id === entityId), [entities, entityId]);

  const entityTotal = useMemo(() => {
    if (!ledgerSummary?.perEntity) return 0;
    const entry = ledgerSummary.perEntity.find(e => e.entityId === entityId);
    return entry ? entry.net : 0;
  }, [ledgerSummary, entityId]);

  // Other fees: non-semester trackers for this entity
  const otherTrackers = useMemo(
    () => (trackers || []).filter(t => t.entityId === entityId && t.type !== 'SEMESTER'),
    [trackers, entityId]
  );

  // Clubs: entities with parentEntityId = this entity
  const clubs = useMemo(
    () => (entities || []).filter(e => e.parentEntityId === entityId),
    [entities, entityId]
  );

  // Info completeness
  const metadata = entity?.metadata || {};
  const isInfoIncomplete = !metadata.classYear;

  // Load semesters
  const loadSemesters = useCallback(async () => {
    if (!entityId) return;
    setSemLoading(true);
    try {
      const data = await api.getSemestersForEntity(entityId);
      setSemesters(data || []);
    } catch (err) {
      console.error('Load semesters error:', err);
    } finally {
      setSemLoading(false);
    }
  }, [entityId]);

  useEffect(() => { loadSemesters(); }, [loadSemesters]);

  // Init info form from metadata
  useEffect(() => {
    if (entity?.metadata) setInfoForm(entity.metadata);
  }, [entity?.metadata]);

  async function handleSaveInfo() {
    if (!entity || !user?.id) return;
    setSaving(true);
    try {
      await api.updateEntity(user.id, entity.id, {
        ...entity, metadata: infoForm,
      });
      addToast('Info saved', 'success');
    } catch (err) {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddClub() {
    if (!user?.id || !entity) return;
    const name = prompt('Club name:');
    if (!name) return;
    try {
      await addEntity({ type: 'COACHING', name, parentEntityId: entity.id });
      addToast('Club added', 'success');
    } catch (err) {
      addToast('Failed to add club', 'error');
    }
  }

  if (!entity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: c.bg }}>
        <p style={{ color: c.text3 }}>Entity not found</p>
        <button onClick={() => navigate('dashboard')} className="mt-4 px-4 py-2 rounded-xl text-sm text-white" style={{ background: c.accent }}>Back</button>
      </div>
    );
  }

  function getSemesterPaid(sem) {
    return (sem.obligations || []).reduce((s, o) => s + (o.amountPaid || 0), 0);
  }

  function getSemesterTotal(sem) {
    return sem.netMinor || sem.grossMinor || (sem.obligations || []).reduce((s, o) => s + o.amountMinor, 0);
  }

  function getOverdueInfo(sem) {
    const overdue = (sem.obligations || []).find(o => o.status === 'OVERDUE');
    if (!overdue) return null;
    const days = Math.max(0, Math.floor((Date.now() - new Date(overdue.dueDate).getTime()) / 86400000));
    return { label: overdue.label, days };
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: c.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 backdrop-blur-xl"
        style={{ background: c.headerBg, borderBottom: `0.5px solid ${c.border}` }}>
        <button onClick={() => { haptics.light(); goBack(); }} className="p-1">
          <ArrowLeft size={20} color={c.text2} />
        </button>
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-sm" style={{ background: c.accent }}>
          🎓
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium truncate" style={{ color: c.text1 }}>{entity.name}</p>
          <p className="text-[11px]" style={{ color: c.text3 }}>
            {TYPE_LABELS[entity.type] || entity.type} · {fmt(entityTotal / 100)}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex sticky top-[57px] z-30" style={{ background: c.bg, borderBottom: `0.5px solid ${c.border}` }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { haptics.light(); setActiveTab(tab.id); }}
            className="flex-1 py-3 text-[12px] font-medium text-center relative flex items-center justify-center gap-1"
            style={{ color: activeTab === tab.id ? c.accent : c.text3, borderBottom: activeTab === tab.id ? `2px solid ${c.accent}` : '2px solid transparent' }}>
            {tab.label}
            {tab.id === 'info' && isInfoIncomplete && (
              <span className="w-2 h-2 rounded-full bg-red-500" style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
            )}
          </button>
        ))}
      </div>

      <div className="max-w-[420px] mx-auto px-4 pt-4">

        {/* ── Tab 1: Semesters ─────────────────────────────── */}
        {activeTab === 'semesters' && (
          <div className="space-y-3">
            {semLoading ? (
              <div className="py-12 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : semesters.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                <p className="text-sm" style={{ color: c.text3 }}>No semesters yet</p>
                <p className="text-xs mt-1" style={{ color: c.text3 }}>Create your first semester to start tracking fees</p>
              </div>
            ) : (
              semesters.map(sem => {
                const paid = getSemesterPaid(sem);
                const total = getSemesterTotal(sem);
                const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                const overdueInfo = getOverdueInfo(sem);
                const isCompleted = sem.status === 'COMPLETED';

                return (
                  <motion.button key={sem.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('semester-detail-v3', { params: { trackerId: sem.id } })}
                    className="w-full text-left rounded-xl p-4"
                    style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: c.text1 }}>{sem.label}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: isCompleted ? 'rgba(99,102,241,0.1)' : 'rgba(34,197,94,0.1)',
                          color: isCompleted ? c.accent : '#22c55e',
                        }}>
                        {isCompleted ? 'Completed' : 'Active'}
                      </span>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: c.text2 }}>
                      {fmt(paid / 100)} paid of {fmt(total / 100)}
                    </p>
                    <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: c.border }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.accent }} />
                    </div>
                    {overdueInfo && (
                      <p className="text-[11px] mt-2" style={{ color: '#f59e0b' }}>
                        {overdueInfo.label} overdue by {overdueInfo.days} days
                      </p>
                    )}
                  </motion.button>
                );
              })
            )}

            {/* Create new semester */}
            <button onClick={() => navigate('create-semester', { params: { entityId: entity.id, entityName: entity.name } })}
              className="w-full py-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ border: '1.5px dashed #2a2a3a', color: c.accent }}>
              <Plus size={16} /> Create new semester
            </button>
          </div>
        )}

        {/* ── Tab 2: Other fees ────────────────────────────── */}
        {activeTab === 'other' && (
          <div className="space-y-3">
            {otherTrackers.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                <p className="text-sm" style={{ color: c.text3 }}>No other fees yet</p>
                <p className="text-xs mt-1" style={{ color: c.text3 }}>Add admission, registration, or other one-time fees</p>
              </div>
            ) : (
              otherTrackers.map(trk => (
                <div key={trk.id} className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: c.text1 }}>{trk.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: c.text3 }}>{trk.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium" style={{ color: c.text1 }}>
                      {fmt((trk.budgetMinor || 0) / 100)}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                      {trk.status}
                    </span>
                  </div>
                </div>
              ))
            )}
            <button onClick={() => navigate('education-fee-form', { params: { entityId, entityName: entity.name } })}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ border: '1.5px dashed #2a2a3a', color: c.accent }}>
              <Plus size={16} /> Add fee
            </button>
          </div>
        )}

        {/* ── Tab 3: Clubs ─────────────────────────────────── */}
        {activeTab === 'clubs' && (
          <div className="space-y-3">
            {clubs.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                <p className="text-sm" style={{ color: c.text3 }}>No clubs yet</p>
                <p className="text-xs mt-1" style={{ color: c.text3 }}>Add clubs, committees, or teams connected to this institution</p>
              </div>
            ) : (
              clubs.map(club => (
                <div key={club.id} className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: 'rgba(236,72,153,0.1)' }}>📖</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: c.text1 }}>{club.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}>
                      {club.subType || 'Club'}
                    </span>
                  </div>
                  <ChevronRight size={14} color={c.text3} />
                </div>
              ))
            )}
            <button onClick={handleAddClub}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ border: '1.5px dashed #2a2a3a', color: c.accent }}>
              <Plus size={16} /> Add club
            </button>
          </div>
        )}

        {/* ── Tab 4: Info ──────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {[
              { key: 'classYear', label: 'Year / Class', placeholder: '3rd Year' },
              { key: 'semesterSystem', label: 'Semester system', placeholder: 'Trimester / Semester' },
              { key: 'studentId', label: 'Student ID', placeholder: 'Optional' },
              { key: 'enrollmentYear', label: 'Enrollment year', placeholder: '2024' },
              { key: 'section', label: 'Section / Batch', placeholder: 'Optional' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: c.text2 }}>{field.label}</label>
                <input
                  value={infoForm[field.key] || ''}
                  onChange={e => setInfoForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: c.card, border: `0.5px solid ${c.border}`, color: c.text1 }}
                />
              </div>
            ))}
            <button onClick={handleSaveInfo} disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-medium text-white"
              style={{ background: c.accent, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Save info'}
            </button>
          </div>
        )}
      </div>

      <AddPaymentV3 isOpen={sheetOpen} onClose={() => setSheetOpen(false)} preselectedEntityId={entityId} />
      <LayoutBottomNav onAddPress={() => setSheetOpen(true)} />
      <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>
    </div>
  );
};

export default EntityDetailV3;
