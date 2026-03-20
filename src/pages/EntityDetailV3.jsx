import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, ChevronRight, User, X } from 'lucide-react';
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
  { id: 'daily', label: 'Daily Costs' },
  { id: 'residence', label: 'Residence' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'others', label: 'Others' },
];

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const EntityDetailV3 = () => {
  const { goBack, navigate, addToast, routeParams, user, theme = 'dark' } = useApp();
  const { entities, trackers, ledgerSummary, addEntity, allEntries } = useV3();
  const c = getThemeColors(theme === 'dark');
  const { entityId } = routeParams || {};
  const fmt = makeFmt(user?.profile?.currency || 'BDT');

  const [activeTab, setActiveTab] = useState('semesters');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [semLoading, setSemLoading] = useState(false);
  const [infoForm, setInfoForm] = useState({});
  const [saving, setSaving] = useState(false);

  const entity = useMemo(() => (entities || []).find(e => e.id === entityId), [entities, entityId]);
  const activeEntities = useMemo(() => (entities || []).filter(e => e.isActive), [entities]);

  const entityTotal = useMemo(() => {
    if (!ledgerSummary?.perEntity) return 0;
    const entry = ledgerSummary.perEntity.find(e => e.entityId === entityId);
    return entry ? entry.net : 0;
  }, [ledgerSummary, entityId]);

  const clubs = useMemo(
    () => (entities || []).filter(e => e.parentEntityId === entityId),
    [entities, entityId]
  );

  const metadata = entity?.metadata || {};
  const isInfoIncomplete = !metadata.classYear;

  // Residence entries
  const residenceEntries = useMemo(() => {
    const cats = ['rent', 'mess_fee', 'utilities', 'deposit', 'moving'];
    return (allEntries || []).filter(e => e.entityId === entityId && e.direction === 'DEBIT' && cats.includes(e.category))
      .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
  }, [allEntries, entityId]);

  // Other entries (catch-all)
  const otherEntries = useMemo(() => {
    const excluded = [
      'transport', 'food', 'books',
      'rent', 'mess_fee', 'utilities', 'deposit', 'moving',
      'semester_fee', 'tuition', 'exam_fee', 'lab_fee', 'admission_fee', 'library_fee', 'registration_fee', 'development_fee', 'uniform', 'id_card',
      'coaching_monthly', 'batch_fee', 'coaching_materials',
    ];
    return (allEntries || []).filter(e => e.entityId === entityId && e.direction === 'DEBIT' && !excluded.includes(e.category))
      .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
  }, [allEntries, entityId]);

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
  useEffect(() => { if (entity?.metadata) setInfoForm(entity.metadata); }, [entity?.metadata]);

  async function handleSaveInfo() {
    if (!entity || !user?.id) return;
    setSaving(true);
    try {
      await api.updateEntity(user.id, entity.id, { ...entity, metadata: infoForm });
      addToast('Info saved', 'success');
      setShowInfo(false);
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

  if (!entity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: c.bg }}>
        <p style={{ color: c.text3 }}>Entity not found</p>
        <button onClick={() => navigate('dashboard')} className="mt-4 px-4 py-2 rounded-xl text-sm text-white" style={{ background: c.accent }}>Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative" style={{ background: c.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between backdrop-blur-xl"
        style={{ background: c.headerBg, borderBottom: `0.5px solid ${c.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { haptics.light(); goBack(); }} className="p-1">
            <ArrowLeft size={20} style={{ color: c.text2 }} />
          </button>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: c.accentLight }}>
            <span className="text-sm">🎓</span>
          </div>
          <div>
            <p className="text-[15px] font-medium" style={{ color: c.text1 }}>{entity.name}</p>
            <p className="text-[11px]" style={{ color: c.text3 }}>Total {fmt(entityTotal / 100)}</p>
          </div>
        </div>
        <button onClick={() => setShowInfo(true)} className="relative p-2">
          <User size={18} style={{ color: c.text2 }} />
          {isInfoIncomplete && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"
              style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
          )}
        </button>
      </header>

      {/* Tabs */}
      <div className="flex sticky top-[57px] z-30 overflow-x-auto scrollbar-none"
        style={{ background: c.bg, borderBottom: `0.5px solid ${c.border}` }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { haptics.light(); setActiveTab(tab.id); }}
            className="flex-shrink-0 px-4 py-3 text-[12px] font-medium text-center"
            style={{ color: activeTab === tab.id ? c.accent : c.text3, borderBottom: activeTab === tab.id ? `2px solid ${c.accent}` : '2px solid transparent' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-[420px] mx-auto px-4 pt-4">

        {/* ── Tab 1: Semesters ──────────────────────────── */}
        {activeTab === 'semesters' && (
          <div className="space-y-3">
            {semLoading ? (
              <div className="py-12 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : semesters.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                <p className="text-sm" style={{ color: c.text3 }}>No semesters yet</p>
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
                        style={{ background: isCompleted ? c.accentLight : 'rgba(34,197,94,0.1)', color: isCompleted ? c.accent : '#22c55e' }}>
                        {isCompleted ? 'Completed' : 'Active'}
                      </span>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: c.text2 }}>{fmt(paid / 100)} paid of {fmt(total / 100)}</p>
                    <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: c.border }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.accent }} />
                    </div>
                    {overdueInfo && (
                      <p className="text-[11px] mt-2" style={{ color: '#f59e0b' }}>{overdueInfo.label} overdue by {overdueInfo.days} days</p>
                    )}
                  </motion.button>
                );
              })
            )}
            <button onClick={() => navigate('create-semester', { params: { entityId: entity.id, entityName: entity.name } })}
              className="w-full py-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ border: `1.5px dashed ${c.border}`, color: c.accent }}>
              <Plus size={16} /> Create new semester
            </button>
          </div>
        )}

        {/* ── Tab 2: Daily Costs ────────────────────────── */}
        {activeTab === 'daily' && (
          <div className="space-y-3">
            {[
              { id: 'transport', label: 'Transport', icon: '🚌', color: '#3b82f6' },
              { id: 'food', label: 'Food', icon: '🍽️', color: '#f97316' },
              { id: 'books', label: 'Materials', icon: '📚', color: '#eab308' },
            ].map(cat => {
              const catTotal = (allEntries || [])
                .filter(e => e.category === cat.id && e.entityId === entityId && e.direction === 'DEBIT')
                .reduce((s, e) => s + e.amountMinor, 0);
              return (
                <button key={cat.id}
                  onClick={() => navigate('category-scoped', { params: { category: cat.id, scopedEntityId: entityId } })}
                  className="w-full flex items-center gap-3 rounded-xl p-4 text-left"
                  style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                  <span className="text-xl">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: c.text1 }}>{cat.label}</p>
                    <p className="text-[11px]" style={{ color: c.text3 }}>
                      {catTotal > 0 ? fmt(catTotal / 100) : 'No entries yet'}
                    </p>
                  </div>
                  <ChevronRight size={14} style={{ color: c.text3 }} />
                </button>
              );
            })}
            <button onClick={() => setSheetOpen(true)}
              className="w-full py-3 rounded-xl text-sm font-medium"
              style={{ border: `1.5px dashed ${c.border}`, color: c.accent }}>
              + Add expense for {entity.name}
            </button>
          </div>
        )}

        {/* ── Tab 3: Residence ──────────────────────────── */}
        {activeTab === 'residence' && (
          <div>
            {residenceEntries.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                <p className="text-sm" style={{ color: c.text3 }}>No residence expenses for {entity.name}</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                {residenceEntries.map((entry, i) => (
                  <div key={entry.id} className="flex items-center justify-between px-3 py-2.5"
                    style={{ borderTop: i > 0 ? `0.5px solid ${c.border}` : 'none' }}>
                    <div>
                      <p className="text-sm" style={{ color: c.text1 }}>{entry.note || entry.category}</p>
                      <p className="text-[10px]" style={{ color: c.text3 }}>{fmtDate(entry.date)}</p>
                    </div>
                    <span className="text-sm font-medium" style={{ color: c.text1 }}>{fmt(entry.amountMinor / 100)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 4: Clubs ──────────────────────────────── */}
        {activeTab === 'clubs' && (
          <div className="space-y-3">
            {clubs.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                <p className="text-sm" style={{ color: c.text3 }}>No clubs yet</p>
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
                  <ChevronRight size={14} style={{ color: c.text3 }} />
                </div>
              ))
            )}
            <button onClick={handleAddClub}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ border: `1.5px dashed ${c.border}`, color: c.accent }}>
              <Plus size={16} /> Add club
            </button>
          </div>
        )}

        {/* ── Tab 5: Others ─────────────────────────────── */}
        {activeTab === 'others' && (
          <div>
            {otherEntries.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                <p className="text-sm" style={{ color: c.text3 }}>No other expenses for {entity.name}</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
                {otherEntries.map((entry, i) => (
                  <div key={entry.id} className="flex items-center justify-between px-3 py-2.5"
                    style={{ borderTop: i > 0 ? `0.5px solid ${c.border}` : 'none' }}>
                    <div>
                      <p className="text-sm" style={{ color: c.text1 }}>{entry.note || entry.category}</p>
                      <p className="text-[10px]" style={{ color: c.text3 }}>{fmtDate(entry.date)}</p>
                    </div>
                    <span className="text-sm font-medium" style={{ color: c.text1 }}>{fmt(entry.amountMinor / 100)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student Info overlay */}
      {showInfo && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50" style={{ background: c.bg }}>
          <div className="max-w-[420px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-medium" style={{ color: c.text1 }}>Student Info</p>
              <button onClick={() => setShowInfo(false)}>
                <X size={18} style={{ color: c.text2 }} />
              </button>
            </div>
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
          </div>
        </motion.div>
      )}

      <AddPaymentV3 isOpen={sheetOpen} onClose={() => setSheetOpen(false)} preselectedEntityId={entityId} />
      <LayoutBottomNav />
      <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>
    </div>
  );
};

export default EntityDetailV3;
