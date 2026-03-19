import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronRight } from 'lucide-react';
import { GButton } from '../ui';
import { haptics } from '../../lib/haptics';

function getAutoSemesterName() {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  if (m >= 1 && m <= 4) return `Spring ${y}`;
  if (m >= 5 && m <= 8) return `Summer ${y}`;
  return `Fall ${y}`;
}

export const SemestersTab = ({ institutionName, activeFees, addSemesterFee, navigate, dark, addToast }) => {
  const d = dark;
  const [showAdd, setShowAdd] = useState(false);
  const [semesterName, setSemesterName] = useState(getAutoSemesterName);

  const semesters = useMemo(() => {
    return activeFees.filter(f =>
      (f.feeType === 'semester_container' || f.feeType === 'semester_fee') &&
      (f.name || '').toLowerCase() === institutionName.toLowerCase()
    ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [activeFees, institutionName]);

  const handleCreate = () => {
    if (!semesterName.trim()) { addToast('Enter a semester name', 'error'); return; }
    haptics.success();
    addSemesterFee({
      feeType: 'semester_container',
      name: institutionName,
      paymentPattern: 'semester',
      semesterName: semesterName.trim(),
      semester: {
        semesterName: semesterName.trim(),
        name: semesterName.trim(),
        institutionName,
        fees: [],
        createdAt: new Date().toISOString(),
      },
      amount: 0,
      isPaid: false,
    });
    addToast(`${semesterName.trim()} created`, 'success');
    setShowAdd(false);
    setSemesterName(getAutoSemesterName());
  };

  const getSemesterStats = (sem) => {
    const fees = sem.semester?.fees || [];
    const payments = sem.payments || [];
    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0)
      + fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
    const totalDue = fees.reduce((s, f) => s + (f.amount || 0), 0) || sem.amount || 0;
    return { totalPaid, totalDue, feeCount: fees.length, progress: totalDue > 0 ? Math.min(100, Math.round(totalPaid / totalDue * 100)) : 0 };
  };

  return (
    <div className="space-y-4">
      {semesters.map(sem => {
        const stats = getSemesterStats(sem);
        const semName = sem.semester?.semesterName || sem.semester?.name || sem.semesterName || 'Semester';
        return (
          <motion.button key={sem.id} whileTap={{ scale: 0.98 }}
            onClick={() => { haptics.light(); navigate('semester-detail', { params: { semesterId: sem.id } }); }}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🎓</span>
                <div>
                  <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{semName}</p>
                  <p className={`text-xs mt-0.5 ${d ? 'text-surface-400' : 'text-surface-500'}`}>
                    ৳{stats.totalPaid.toLocaleString()} paid · {stats.feeCount} fee{stats.feeCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${d ? 'text-surface-600' : 'text-surface-300'}`} />
            </div>
            {stats.totalDue > 0 && (
              <div className="mt-2">
                <div className={`h-1.5 rounded-full overflow-hidden ${d ? 'bg-surface-800' : 'bg-surface-100'}`}>
                  <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${stats.progress}%` }} />
                </div>
                <p className={`text-[10px] mt-1 ${d ? 'text-surface-500' : 'text-surface-400'}`}>{stats.progress}% paid</p>
              </div>
            )}
          </motion.button>
        );
      })}

      {semesters.length === 0 && !showAdd && (
        <div className={`text-center py-12 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
          <span className="text-4xl block mb-3">🎓</span>
          <p className="text-sm font-medium">No semesters yet</p>
          <p className="text-xs mt-1 mb-6">Add your first semester to start tracking fees</p>
          <GButton onClick={() => { haptics.light(); setShowAdd(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Semester
          </GButton>
        </div>
      )}

      {semesters.length > 0 && !showAdd && (
        <GButton fullWidth variant="secondary" onClick={() => { haptics.light(); setShowAdd(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Semester
        </GButton>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-2xl border space-y-3 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>New Semester</p>
            <input type="text" placeholder="e.g., Spring 2026" value={semesterName} onChange={(e) => setSemesterName(e.target.value)} autoFocus
              className={`w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
                d ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-500' : 'bg-surface-50 border-surface-200 text-surface-900 placeholder-surface-400'
              }`} />
            <div className="flex gap-2">
              <GButton variant="secondary" fullWidth onClick={() => { setShowAdd(false); setSemesterName(getAutoSemesterName()); }}>Cancel</GButton>
              <GButton fullWidth onClick={handleCreate} disabled={!semesterName.trim()}>Create Semester</GButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
