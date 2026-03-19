import React from 'react';
import { haptics } from '../../lib/haptics';
import { EDU } from '../../constants/education';

export const StudentInfoTab = ({ institutionName, user, setUser, dark, addToast }) => {
  const d = dark;
  const mod = EDU[user?.profile?.educationLevel] || EDU[user?.eduType];
  const info = user?.profile?.institutionInfo?.[institutionName] || {};

  const updateInfo = (key, value) => {
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
  };

  const inputCls = `w-full p-3.5 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
    d ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'
  }`;

  return (
    <div className="space-y-5">
      {/* Year / Class */}
      {mod?.levels && mod.levels.length > 0 && (
        <div>
          <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
            {mod.periodLabel || 'Year'} / Class
          </label>
          <div className="flex flex-wrap gap-2">
            {mod.levels.map(y => (
              <button key={y} onClick={() => updateInfo('classYear', y)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                  info.classYear === y
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : d ? 'border-surface-700 bg-surface-800 text-surface-300' : 'border-surface-200 bg-surface-50 text-surface-600'
                }`}>
                {y}
              </button>
            ))}
          </div>
          {!info.classYear && (
            <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
              Please select your current {mod.periodLabel?.toLowerCase() || 'year'}
            </p>
          )}
        </div>
      )}

      {/* Semester System (university only) */}
      {mod?.hasSemesterChoice && (
        <div>
          <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Semester System</label>
          <div className="grid grid-cols-2 gap-2">
            {(mod.semChoiceOptions || [{ v: 'tri', l: 'Trimester' }, { v: 'bi', l: 'Semester' }]).map(o => (
              <button key={o.v} onClick={() => updateInfo('semesterType', o.v)}
                className={`p-3 rounded-xl text-center border-2 transition ${
                  info.semesterType === o.v
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-bold'
                    : d ? 'border-surface-700 bg-surface-800 text-surface-300' : 'border-surface-200 bg-surface-50 text-surface-600'
                }`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Student ID */}
      <div>
        <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
          Student ID <span className="text-surface-400 font-normal">(optional)</span>
        </label>
        <input type="text" placeholder="e.g., 21301234" value={info.studentId || ''}
          onChange={(e) => updateInfo('studentId', e.target.value)} className={inputCls} />
      </div>

      {/* Enrollment Year */}
      <div>
        <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
          Enrollment Year <span className="text-surface-400 font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 11 }, (_, i) => 2020 + i).map(yr => (
            <button key={yr} onClick={() => updateInfo('enrollmentYear', yr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                info.enrollmentYear === yr
                  ? 'bg-primary-600 text-white'
                  : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
              }`}>
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Section / Batch */}
      <div>
        <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
          Section / Batch <span className="text-surface-400 font-normal">(optional)</span>
        </label>
        <input type="text" placeholder="e.g., Section A, Batch 12" value={info.section || ''}
          onChange={(e) => updateInfo('section', e.target.value)} className={inputCls} />
      </div>

      {/* Pulse dot keyframe — injected via style tag */}
      <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>
    </div>
  );
};
