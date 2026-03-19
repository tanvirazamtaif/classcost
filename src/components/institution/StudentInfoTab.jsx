import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, User, BookOpen, Hash, Calendar, Users } from 'lucide-react';
import { haptics } from '../../lib/haptics';
import { EDU } from '../../constants/education';

// ── Resolve EDU module from user data ─────────────────────
function resolveEduMod(user) {
  const directKeys = [
    user?.profile?.educationLevel,
    user?.profile?.form?.educationLevel,
    user?.eduType,
  ].filter(Boolean);
  for (const key of directKeys) {
    if (EDU[key]) return EDU[key];
  }
  const groupName = user?.eduType;
  if (groupName) {
    for (const key of Object.keys(EDU)) {
      if (EDU[key].group === groupName) return EDU[key];
    }
  }
  return EDU.undergrad_private || null;
}

export const StudentInfoTab = ({ institutionName, user, setUser, dark, addToast }) => {
  const d = dark;
  const mod = resolveEduMod(user);
  const info = user?.profile?.institutionInfo?.[institutionName] || {};
  const [saved, setSaved] = useState(false);

  const updateInfo = useCallback((key, value) => {
    haptics.light();
    const currentInfo = user?.profile?.institutionInfo || {};
    const updatedInst = { ...(currentInfo[institutionName] || {}), [key]: value };
    setUser(p => ({
      ...p,
      profile: {
        ...p.profile,
        institutionInfo: { ...currentInfo, [institutionName]: updatedInst },
      },
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [user, institutionName, setUser]);

  // Debounced text inputs
  const [localId, setLocalId] = useState(info.studentId || '');
  const [localSection, setLocalSection] = useState(info.section || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localId !== (info.studentId || '')) updateInfo('studentId', localId);
    }, 800);
    return () => clearTimeout(timer);
  }, [localId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSection !== (info.section || '')) updateInfo('section', localSection);
    }, 800);
    return () => clearTimeout(timer);
  }, [localSection]);

  const cardCls = `rounded-2xl border p-4 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide mb-3 ${d ? 'text-surface-500' : 'text-surface-400'}`;
  const inputCls = `w-full px-4 py-3 border rounded-xl text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 ${
    d ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-500' : 'bg-surface-50 border-surface-200 text-surface-900 placeholder-surface-400'
  }`;

  const hasBasicInfo = info.classYear || info.semesterType;

  return (
    <div className="space-y-4">

      {/* Summary Profile Card */}
      {hasBasicInfo && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border overflow-hidden ${d ? 'border-surface-800' : 'border-surface-200'}`}>
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="text-white">
                <p className="font-semibold text-sm">{user?.name || 'Student'}</p>
                <p className="text-xs opacity-85">{institutionName}</p>
              </div>
            </div>
          </div>
          <div className={`px-4 py-3 flex flex-wrap gap-x-4 gap-y-1 text-xs ${d ? 'bg-surface-900 text-surface-400' : 'bg-white text-surface-500'}`}>
            {info.classYear && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {info.classYear}</span>}
            {info.semesterType && <span>· {info.semesterType === 'tri' ? 'Trimester' : 'Semester'}</span>}
            {info.studentId && <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {info.studentId}</span>}
            {info.enrollmentYear && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Since {info.enrollmentYear}</span>}
            {info.section && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {info.section}</span>}
          </div>
        </motion.div>
      )}

      {/* Nudge banner */}
      {!info.classYear && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${d ? 'bg-amber-900/10 border-amber-800/30' : 'bg-amber-50 border-amber-200'}`}>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
          <p className={`text-xs ${d ? 'text-amber-300' : 'text-amber-700'}`}>
            Select your current {mod?.periodLabel?.toLowerCase() || 'year'} to complete your profile
          </p>
        </div>
      )}

      {/* Academic Info Card */}
      <div className={cardCls}>
        <p className={labelCls}>Academic info</p>

        {mod?.levels && mod.levels.length > 0 && (
          <div className="mb-4">
            <p className={`text-sm font-medium mb-2 ${d ? 'text-surface-200' : 'text-surface-700'}`}>{mod.periodLabel || 'Year'} / Class</p>
            <div className="flex flex-wrap gap-2">
              {mod.levels.map(y => (
                <button key={y} onClick={() => updateInfo('classYear', y)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    info.classYear === y
                      ? 'border-primary-500 bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                      : d ? 'border-surface-700 bg-surface-800 text-surface-300 hover:border-surface-600' : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                  }`}>{y}</button>
              ))}
            </div>
          </div>
        )}

        {mod?.hasSemesterChoice && (
          <div>
            <p className={`text-sm font-medium mb-2 ${d ? 'text-surface-200' : 'text-surface-700'}`}>Semester system</p>
            <div className="grid grid-cols-2 gap-2">
              {(mod.semChoiceOptions || [{ v: 'tri', l: 'Trimester' }, { v: 'bi', l: 'Semester' }]).map(o => (
                <button key={o.v} onClick={() => updateInfo('semesterType', o.v)}
                  className={`p-3 rounded-xl text-center text-sm font-medium border transition-all ${
                    info.semesterType === o.v
                      ? 'border-primary-500 bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                      : d ? 'border-surface-700 bg-surface-800 text-surface-300 hover:border-surface-600' : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                  }`}>{o.l}</button>
              ))}
            </div>
          </div>
        )}

        {(!mod?.levels || mod.levels.length === 0) && (
          <p className={`text-sm ${d ? 'text-surface-500' : 'text-surface-400'}`}>Year/class selection not available for this education level</p>
        )}
      </div>

      {/* Identification Card */}
      <div className={cardCls}>
        <p className={labelCls}>Identification</p>

        <div className="mb-4">
          <p className={`text-sm font-medium mb-1.5 ${d ? 'text-surface-200' : 'text-surface-700'}`}>Student ID</p>
          <div className="relative">
            <Hash className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${d ? 'text-surface-500' : 'text-surface-400'}`} />
            <input type="text" placeholder="e.g., 21301234" value={localId} onChange={(e) => setLocalId(e.target.value)} className={`${inputCls} pl-10`} />
          </div>
        </div>

        <div className="mb-4">
          <p className={`text-sm font-medium mb-2 ${d ? 'text-surface-200' : 'text-surface-700'}`}>Enrollment year</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }, (_, i) => 2018 + i).map(yr => (
              <button key={yr} onClick={() => updateInfo('enrollmentYear', yr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  info.enrollmentYear === yr ? 'bg-primary-600 text-white shadow-sm' : d ? 'bg-surface-800 text-surface-400 hover:bg-surface-700' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
                }`}>{yr}</button>
            ))}
          </div>
        </div>

        <div>
          <p className={`text-sm font-medium mb-1.5 ${d ? 'text-surface-200' : 'text-surface-700'}`}>Section / Batch</p>
          <div className="relative">
            <Users className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${d ? 'text-surface-500' : 'text-surface-400'}`} />
            <input type="text" placeholder="e.g., Section A, Batch 12" value={localSection} onChange={(e) => setLocalSection(e.target.value)} className={`${inputCls} pl-10`} />
          </div>
        </div>
      </div>

      {/* Auto-save indicator */}
      <div className="flex justify-center">
        {saved ? (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-xs text-green-500">
            <Check className="w-3.5 h-3.5" /> Saved
          </motion.div>
        ) : (
          <p className={`text-xs ${d ? 'text-surface-600' : 'text-surface-300'}`}>Changes save automatically</p>
        )}
      </div>

      <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>
    </div>
  );
};
