import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { GButton } from '../components/ui';
import { SemestersTab } from '../components/institution/SemestersTab';
import { PaymentsTab } from '../components/institution/PaymentsTab';
import { ClubsTab } from '../components/institution/ClubsTab';
import { StudentInfoTab } from '../components/institution/StudentInfoTab';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getTypeIcon(type) {
  const map = { university: '🎓', school: '🏫', college: '🎒', coaching: '📖', madrasa: '🕌' };
  return map[type] || '🏛️';
}

function getTypeLabel(type) {
  const map = { university: 'University', school: 'School', college: 'College', coaching: 'Coaching', madrasa: 'Madrasa' };
  return map[type] || 'Institution';
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const InstitutionDetailPage = () => {
  const { navigate, addToast, theme, routeParams, user, setUser, clubs, addClub, updateClub, removeClub } = useApp();
  const { activeFees, addFee, addSemesterFee } = useEducationFees();
  const d = theme === 'dark';

  const { institutionName, institutionType, isNew } = routeParams || {};

  // Student info completeness check
  const isInfoIncomplete = !user?.profile?.institutionInfo?.[institutionName]?.classYear;

  // Tab state — auto-open Student Info if new or incomplete
  const [activeTab, setActiveTab] = useState('semesters');
  useEffect(() => {
    if (isNew || isInfoIncomplete) setActiveTab('info');
  }, []);

  // ── Data ────────────────────────────────────────────────────

  const institutionFees = useMemo(() => {
    if (!institutionName) return [];
    const nameLower = institutionName.toLowerCase();
    return activeFees.filter(f => {
      const feeName = (f.name || '').toLowerCase();
      return feeName === nameLower || feeName.includes(nameLower);
    });
  }, [activeFees, institutionName]);

  const totalPaid = useMemo(() => {
    return institutionFees.reduce((sum, fee) => {
      const feePayments = (fee.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
      return sum + (feePayments || (fee.isPaid ? fee.amount || 0 : 0));
    }, 0);
  }, [institutionFees]);

  const feesByType = useMemo(() => {
    const groups = {};
    institutionFees.forEach(fee => {
      const type = fee.feeType || fee.paymentIntent || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(fee);
    });
    return groups;
  }, [institutionFees]);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  if (!institutionName) {
    return (
      <motion.div {...pageTransition} className={`min-h-screen flex flex-col items-center justify-center px-6 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
        <p className={`text-sm ${d ? 'text-surface-400' : 'text-surface-500'}`}>Institution not found</p>
        <GButton className="mt-4" onClick={() => navigate('education-home')}>Back</GButton>
      </motion.div>
    );
  }

  const TABS = [
    { id: 'semesters', label: 'Semesters' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'clubs', label: 'Clubs' },
    { id: 'info', label: 'Info', dot: isInfoIncomplete },
  ];

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => { haptics.light(); navigate('education-home'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-lg font-semibold truncate ${d ? 'text-white' : 'text-surface-900'}`}>{institutionName}</h1>
            <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
              {getTypeIcon(institutionType)} {getTypeLabel(institutionType)}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className={`flex border-t ${d ? 'border-surface-800' : 'border-surface-200'}`}>
          {TABS.map(t => (
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
        {activeTab === 'semesters' && (
          <SemestersTab
            institutionName={institutionName}
            activeFees={activeFees}
            addSemesterFee={addSemesterFee}
            navigate={navigate}
            dark={d}
            addToast={addToast}
          />
        )}

        {activeTab === 'expenses' && (
          <PaymentsTab
            institutionName={institutionName}
            institutionFees={institutionFees}
            feesByType={feesByType}
            totalPaid={totalPaid}
            navigate={navigate}
            addFee={addFee}
            addToast={addToast}
            dark={d}
          />
        )}

        {activeTab === 'clubs' && (
          <ClubsTab
            institutionName={institutionName}
            clubs={clubs}
            addClub={addClub}
            updateClub={updateClub}
            removeClub={removeClub}
            navigate={navigate}
            dark={d}
            addToast={addToast}
          />
        )}

        {activeTab === 'info' && (
          <StudentInfoTab
            institutionName={institutionName}
            user={user}
            setUser={setUser}
            dark={d}
            addToast={addToast}
            onSaveComplete={() => setActiveTab('payments')}
          />
        )}
      </main>

      {/* Pulse dot animation */}
      <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>
    </motion.div>
  );
};

export default InstitutionDetailPage;
