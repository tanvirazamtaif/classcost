import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { GButton } from '../ui';
import { haptics } from '../../lib/haptics';
import { EDU } from '../../constants/education';

function resolveEduMod(user) {
  const directKeys = [user?.profile?.educationLevel, user?.profile?.form?.educationLevel, user?.eduType].filter(Boolean);
  for (const key of directKeys) { if (EDU[key]) return EDU[key]; }
  const groupName = user?.eduType;
  if (groupName) { for (const key of Object.keys(EDU)) { if (EDU[key].group === groupName) return EDU[key]; } }
  return EDU.undergrad_private || null;
}

export const StudentInfoTab = ({ institutionName, user, setUser, dark, addToast, onSaveComplete }) => {
  const d = dark;
  const mod = resolveEduMod(user);
  const info = user?.profile?.institutionInfo?.[institutionName] || {};
  const hasExistingInfo = !!info.classYear;
  const [editing, setEditing] = useState(!hasExistingInfo);

  const [formData, setFormData] = useState({
    classYear: info.classYear || '',
    semesterType: info.semesterType || '',
    studentId: info.studentId || '',
    enrollmentYear: info.enrollmentYear || null,
    section: info.section || '',
  });

  const updateForm = (key, value) => { haptics.light(); setFormData(prev => ({ ...prev, [key]: value })); };

  const handleSave = () => {
    if (!formData.classYear) { haptics.error(); addToast('Please select your year / class', 'error'); return; }
    haptics.success();
    const currentInfo = user?.profile?.institutionInfo || {};
    setUser(p => ({
      ...p,
      profile: { ...(p.profile || {}), institutionInfo: { ...currentInfo, [institutionName]: { ...currentInfo[institutionName], ...formData } } },
    }));
    addToast('Student info saved', 'success');
    setEditing(false);
    if (onSaveComplete) setTimeout(() => onSaveComplete(), 400);
  };

  const cardCls = `rounded-2xl border p-4 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide mb-3 ${d ? 'text-surface-500' : 'text-surface-400'}`;
  const inputCls = `w-full px-4 py-3 border rounded-xl text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 ${
    d ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-500' : 'bg-surface-50 border-surface-200 text-surface-900 placeholder-surface-400'
  }`;

  return (
    <div className="space-y-4">
      {!editing ? (
        <>
          {/* Read-only summary */}
          <div className={`rounded-2xl border overflow-hidden ${d ? 'border-surface-800' : 'border-surface-200'}`}>
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
            <div className={`px-4 py-3 space-y-2 ${d ? 'bg-surface-900' : 'bg-white'}`}>
              {info.classYear && <div className="flex justify-between text-sm"><span className={d ? 'text-surface-400' : 'text-surface-500'}>Year / Class</span><span className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{info.classYear}</span></div>}
              {info.semesterType && <div className="flex justify-between text-sm"><span className={d ? 'text-surface-400' : 'text-surface-500'}>System</span><span className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{info.semesterType === 'tri' ? 'Trimester' : 'Semester'}</span></div>}
              {info.studentId && <div className="flex justify-between text-sm"><span className={d ? 'text-surface-400' : 'text-surface-500'}>Student ID</span><span className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{info.studentId}</span></div>}
              {info.enrollmentYear && <div className="flex justify-between text-sm"><span className={d ? 'text-surface-400' : 'text-surface-500'}>Enrolled</span><span className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{info.enrollmentYear}</span></div>}
              {info.section && <div className="flex justify-between text-sm"><span className={d ? 'text-surface-400' : 'text-surface-500'}>Section</span><span className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{info.section}</span></div>}
            </div>
          </div>
          <GButton fullWidth variant="secondary" onClick={() => {
            setFormData({ classYear: info.classYear || '', semesterType: info.semesterType || '', studentId: info.studentId || '', enrollmentYear: info.enrollmentYear || null, section: info.section || '' });
            setEditing(true);
          }}>Edit Student Info</GButton>
        </>
      ) : (
        <>
          {/* Nudge for new users */}
          {!hasExistingInfo && (
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${d ? 'bg-amber-900/10 border-amber-800/30' : 'bg-amber-50 border-amber-200'}`}>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
              <p className={`text-xs ${d ? 'text-amber-300' : 'text-amber-700'}`}>Complete your student info to get started</p>
            </div>
          )}

          {/* Academic Info */}
          <div className={cardCls}>
            <p className={labelCls}>Academic info</p>
            {mod?.levels && mod.levels.length > 0 && (
              <div className="mb-4">
                <p className={`text-sm font-medium mb-2 ${d ? 'text-surface-200' : 'text-surface-700'}`}>{mod.periodLabel || 'Year'} / Class</p>
                <div className="flex flex-wrap gap-2">
                  {mod.levels.map(y => (
                    <button key={y} onClick={() => updateForm('classYear', y)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        formData.classYear === y ? 'border-primary-500 bg-primary-600 text-white shadow-sm shadow-primary-500/20'
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
                    <button key={o.v} onClick={() => updateForm('semesterType', o.v)}
                      className={`p-3 rounded-xl text-center text-sm font-medium border transition-all ${
                        formData.semesterType === o.v ? 'border-primary-500 bg-primary-600 text-white shadow-sm shadow-primary-500/20'
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

          {/* Identification */}
          <div className={cardCls}>
            <p className={labelCls}>Identification</p>
            <div className="mb-4">
              <p className={`text-sm font-medium mb-1.5 ${d ? 'text-surface-200' : 'text-surface-700'}`}>Student ID</p>
              <input type="text" placeholder="e.g., 21301234" value={formData.studentId} onChange={(e) => updateForm('studentId', e.target.value)} className={inputCls} />
            </div>
            <div className="mb-4">
              <p className={`text-sm font-medium mb-2 ${d ? 'text-surface-200' : 'text-surface-700'}`}>Enrollment year</p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 11 }, (_, i) => 2018 + i).map(yr => (
                  <button key={yr} onClick={() => updateForm('enrollmentYear', yr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      formData.enrollmentYear === yr ? 'bg-primary-600 text-white shadow-sm' : d ? 'bg-surface-800 text-surface-400 hover:bg-surface-700' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
                    }`}>{yr}</button>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-sm font-medium mb-1.5 ${d ? 'text-surface-200' : 'text-surface-700'}`}>Section / Batch</p>
              <input type="text" placeholder="e.g., Section A, Batch 12" value={formData.section} onChange={(e) => updateForm('section', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-2">
            {hasExistingInfo && <GButton variant="secondary" fullWidth onClick={() => setEditing(false)}>Cancel</GButton>}
            <GButton fullWidth onClick={handleSave} disabled={!formData.classYear}>
              {hasExistingInfo ? 'Save Changes' : 'Save & Continue'}
            </GButton>
          </div>
        </>
      )}
      <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>
    </div>
  );
};
