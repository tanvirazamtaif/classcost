import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronRight, Building2, GraduationCap, FileText, Search } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { GButton } from '../components/ui';
import { LayoutBottomNav } from '../components/layout';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';

// ═══════════════════════════════════════════════════════════════
// GENERAL COST TYPES (not institution-bound)
// ═══════════════════════════════════════════════════════════════

const GENERAL_COST_TYPES = [
  { id: 'admission_test', icon: '📝', label: 'Admission Test Fee', desc: 'Exam fees across universities' },
  { id: 'application_fee', icon: '📋', label: 'Application Fee', desc: 'Form purchase, prospectus' },
  { id: 'document_processing', icon: '📄', label: 'Document / Processing', desc: 'Photocopy, courier, certificates' },
  { id: 'other_general', icon: '📦', label: 'Other Education Cost', desc: 'Any other education expense' },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getInstitutionTypeIcon(type) {
  const map = {
    university: '🎓', school: '🏫', college: '🎒', coaching: '📖',
    madrasa: '🕌', polytechnic: '⚙️', default: '🏛️',
  };
  return map[type] || map.default;
}

function getInstitutionTypeLabel(type) {
  const map = {
    university: 'University', school: 'School', college: 'College',
    coaching: 'Coaching', madrasa: 'Madrasa', polytechnic: 'Polytechnic',
  };
  return map[type] || 'Institution';
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const EducationHomePage = () => {
  const { navigate, theme, user } = useApp();
  const { activeFees } = useEducationFees();
  const { institutionName, educationLevel, institutionType } = useUserProfile();
  const d = theme === 'dark';

  const [showAddInstitution, setShowAddInstitution] = useState(false);
  const [newInstName, setNewInstName] = useState('');
  const [newInstType, setNewInstType] = useState('university');

  // ── Derive institutions from existing data ──────────────────

  const institutions = useMemo(() => {
    const instMap = new Map();

    // 1. Add profile institution (the user's main school/university)
    if (institutionName) {
      const type = user?.eduType || institutionType || 'university';
      instMap.set(institutionName.toLowerCase(), {
        name: institutionName,
        type,
        source: 'profile',
        feeCount: 0,
        totalPaid: 0,
      });
    }

    // 2. Scan existing fees for institution names
    activeFees.forEach(fee => {
      const feeName = fee.name || fee.semester?.name;
      if (!feeName || feeName === 'Semester Payment' || feeName === 'Payment') return;

      const key = feeName.toLowerCase();
      if (instMap.has(key)) {
        const inst = instMap.get(key);
        inst.feeCount++;
        inst.totalPaid += (fee.payments || []).reduce((s, p) => s + (p.amount || 0), 0) || (fee.isPaid ? fee.amount || 0 : 0);
      } else {
        // Only add if it looks like an institution name (not a fee type label)
        const isLikelyInstitution = feeName.length > 3 && !/^(tuition|lab|exam|fee|payment|coaching)/i.test(feeName);
        if (isLikelyInstitution) {
          instMap.set(key, {
            name: feeName,
            type: fee.feeType === 'coaching' ? 'coaching' : 'university',
            source: 'fees',
            feeCount: 1,
            totalPaid: (fee.payments || []).reduce((s, p) => s + (p.amount || 0), 0) || (fee.isPaid ? fee.amount || 0 : 0),
          });
        }
      }
    });

    return Array.from(instMap.values());
  }, [activeFees, institutionName, user?.eduType, institutionType]);

  // ── General cost counts ─────────────────────────────────────

  const generalCostCounts = useMemo(() => {
    const counts = {};
    GENERAL_COST_TYPES.forEach(t => {
      counts[t.id] = activeFees.filter(f => f.feeType === t.id || f.paymentIntent === t.id).length;
    });
    return counts;
  }, [activeFees]);

  // ── Handlers ────────────────────────────────────────────────

  const handleAddInstitution = () => {
    if (!newInstName.trim()) return;
    haptics.success();
    navigate('institution-detail', { params: {
      institutionName: newInstName.trim(),
      institutionType: newInstType,
      isNew: true,
    }});
    setShowAddInstitution(false);
    setNewInstName('');
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => { haptics.light(); navigate('dashboard'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Education</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">

        {/* ══════════════════════════════════════════════════════════
             SECTION A: MY INSTITUTIONS
             ══════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className={`w-4 h-4 ${d ? 'text-primary-400' : 'text-primary-600'}`} />
              <h2 className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>My Institutions</h2>
            </div>
            <button
              onClick={() => { haptics.light(); setShowAddInstitution(true); }}
              className={`text-xs font-medium flex items-center gap-1 ${d ? 'text-primary-400' : 'text-primary-600'}`}
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {/* Institution cards */}
          <div className="space-y-2.5">
            {institutions.map((inst, i) => (
              <motion.button
                key={inst.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  haptics.light();
                  navigate('institution-detail', { params: {
                    institutionName: inst.name,
                    institutionType: inst.type,
                  }});
                }}
                className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all ${
                  d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                  d ? 'bg-primary-900/30' : 'bg-primary-50'
                }`}>
                  {getInstitutionTypeIcon(inst.type)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-surface-900'}`}>
                    {inst.name}
                  </p>
                  <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
                    {getInstitutionTypeLabel(inst.type)}
                    {inst.feeCount > 0 && ` · ${inst.feeCount} cost${inst.feeCount > 1 ? 's' : ''}`}
                    {inst.totalPaid > 0 && ` · ৳${inst.totalPaid.toLocaleString()}`}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${d ? 'text-surface-600' : 'text-surface-400'}`} />
              </motion.button>
            ))}

            {/* Empty state */}
            {institutions.length === 0 && (
              <div className={`text-center py-8 rounded-2xl border-2 border-dashed ${
                d ? 'border-surface-800 text-surface-500' : 'border-surface-200 text-surface-400'
              }`}>
                <p className="text-sm mb-2">No institutions yet</p>
                <button
                  onClick={() => { haptics.light(); setShowAddInstitution(true); }}
                  className="text-xs font-medium text-primary-600"
                >
                  + Add your first institution
                </button>
              </div>
            )}
          </div>

          {/* Add institution inline form */}
          <AnimatePresence>
            {showAddInstitution && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`mt-3 p-4 rounded-2xl border space-y-3 ${
                  d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'
                }`}>
                  <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Add Institution</p>
                  <input
                    type="text"
                    placeholder="e.g., BRAC University, UDVASH"
                    value={newInstName}
                    onChange={(e) => setNewInstName(e.target.value)}
                    autoFocus
                    className={`w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition ${
                      d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-50 border-surface-200 text-surface-900'
                    }`}
                  />
                  <div className="flex flex-wrap gap-2">
                    {['university', 'college', 'school', 'coaching', 'madrasa'].map(type => (
                      <button
                        key={type}
                        onClick={() => { haptics.light(); setNewInstType(type); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          newInstType === type
                            ? 'bg-primary-600 text-white'
                            : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
                        }`}
                      >
                        {getInstitutionTypeIcon(type)} {getInstitutionTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <GButton variant="secondary" fullWidth onClick={() => { setShowAddInstitution(false); setNewInstName(''); }}>
                      Cancel
                    </GButton>
                    <GButton fullWidth onClick={handleAddInstitution} disabled={!newInstName.trim()}>
                      Add
                    </GButton>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className={`flex-1 h-px ${d ? 'bg-surface-800' : 'bg-surface-200'}`} />
          <span className={`text-[10px] uppercase tracking-wider font-medium ${d ? 'text-surface-600' : 'text-surface-400'}`}>General Costs</span>
          <div className={`flex-1 h-px ${d ? 'bg-surface-800' : 'bg-surface-200'}`} />
        </div>

        {/* ══════════════════════════════════════════════════════════
             SECTION B: GENERAL EDUCATION COSTS
             ══════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          {GENERAL_COST_TYPES.map((type, i) => {
            const count = generalCostCounts[type.id] || 0;
            return (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  haptics.light();
                  navigate('general-cost-tracker', { params: { costType: type } });
                }}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
                }`}
              >
                <span className="text-lg w-8 text-center">{type.icon}</span>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{type.label}</p>
                  <p className={`text-xs ${d ? 'text-surface-500' : 'text-surface-500'}`}>{type.desc}</p>
                </div>
                {count > 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    d ? 'bg-primary-900/30 text-primary-300' : 'bg-primary-100 text-primary-700'
                  }`}>
                    {count}
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 shrink-0 ${d ? 'text-surface-600' : 'text-surface-400'}`} />
              </motion.button>
            );
          })}
        </div>

      </main>

      <LayoutBottomNav />
    </motion.div>
  );
};

export default EducationHomePage;
