import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, Plus, Search, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { EDU } from '../constants';
import {
  PAYMENT_PATTERNS,
  EDUCATION_LEVELS,
  getFeeTypesForLevel,
  getHiddenFeeTypes,
  getFeeLabel,
} from '../types/educationFees';
import { GButton, BottomSheet } from '../components/ui';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';
import { ListAddView } from '../components/education/ListAddView';
import { SemesterDetailSheet } from '../components/education/SemesterDetailSheet';
import { LayoutBottomNav } from '../components/layout';

// Map EDU group values to fee filter categories
const GROUP_TO_FILTER = {
  early: 'school',
  school: 'school',
  college: 'college',
  university: 'university',
  postgrad: 'university',
};

export const EducationFeePage = () => {
  const { navigate, theme, user, educationLevel, setEducationLevel, educationLevelAsked, setEducationLevelAsked } = useApp();
  const { activeFees, deleteFee } = useEducationFees();
  const d = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomSheet, setShowCustomSheet] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showLevelPopup, setShowLevelPopup] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('📌');
  const [customPattern, setCustomPattern] = useState(PAYMENT_PATTERNS.RECURRING);
  const [activeMultiEntryType, setActiveMultiEntryType] = useState(null);
  const [selectedSemesterFee, setSelectedSemesterFee] = useState(null);

  // Derive fee filter from profile (eduType is the group: school/college/university)
  // or from the detailed profile.educationLevel (EDU key like "secondary", "hsc", etc.)
  const profileLevel = user?.profile?.educationLevel;
  const profileGroup = profileLevel && EDU[profileLevel] ? EDU[profileLevel].group : null;
  const eduTypeGroup = user?.eduType; // already a group value set during onboarding
  const effectiveLevel = useMemo(() => {
    if (profileGroup) return GROUP_TO_FILTER[profileGroup] || null;
    if (eduTypeGroup) return GROUP_TO_FILTER[eduTypeGroup] || eduTypeGroup;
    return educationLevel; // fallback to manual selection
  }, [profileGroup, eduTypeGroup, educationLevel]);

  // Show popup only if no profile level, no eduType, no manual override, and not asked before
  useEffect(() => {
    if (!profileGroup && !eduTypeGroup && !educationLevel && !educationLevelAsked) {
      const timer = setTimeout(() => setShowLevelPopup(true), 300);
      return () => clearTimeout(timer);
    }
  }, [profileGroup, eduTypeGroup, educationLevel, educationLevelAsked]);

  // Get relevant and hidden fee types
  const relevantTypes = useMemo(() => getFeeTypesForLevel(effectiveLevel), [effectiveLevel]);
  const hiddenTypes = useMemo(() => getHiddenFeeTypes(effectiveLevel), [effectiveLevel]);
  const currentLevel = EDUCATION_LEVELS.find(l => l.id === effectiveLevel);

  // Filter by search
  const filteredTypes = searchQuery.trim()
    ? relevantTypes.filter(t =>
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.desc?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : relevantTypes;

  // Group by pattern
  const groups = {
    recurring: { title: '📅 Monthly', items: [] },
    semester: { title: '🎓 Semester', items: [] },
    yearly: { title: '📆 Yearly', items: [] },
    one_time: { title: '🔴 One-time', items: [] },
  };

  filteredTypes.forEach(type => {
    const pattern = type.defaultPattern;
    if (groups[pattern]) groups[pattern].items.push(type);
  });

  const handleSelectType = (type) => {
    haptics.light();
    if (type.isMultiEntry) {
      setActiveMultiEntryType(type);
    } else {
      navigate('education-fee-form', { params: { feeType: type } });
    }
  };

  // Get fees for a multi-entry type
  const getMultiEntryItems = (typeId) => {
    return activeFees.filter(f => f.feeType === typeId);
  };

  // Render item for multi-entry list
  const renderMultiEntryItem = (fee) => {
    const amount = fee.recurring?.amount || fee.oneTime?.amount || fee.yearly?.amount || fee.semester?.totalAmount || 0;
    const isSemester = fee.feeType === 'semester_fee';
    const totalPaid = isSemester ? (fee.payments?.reduce((s, p) => s + (p.isRefund ? -p.amount : p.amount), 0) || 0) : 0;
    const progressPct = isSemester && amount > 0 ? Math.min((totalPaid / amount) * 100, 100) : 0;
    const installments = fee.semester?.installments || [];
    const paidCount = installments.filter(i => i.status === 'paid').length;

    return (
      <>
        <p className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
          {fee.semesterName || fee.name || fee.customTypeName || fee.feeType}
        </p>
        {fee.feeType === 'private_tutor' && fee.name && (
          <p className="text-xs text-surface-500">{fee.name}</p>
        )}
        <p className="text-sm text-surface-500">৳{amount.toLocaleString()}{fee.recurring ? '/month' : ''}</p>
        {isSemester && installments.length > 0 && (
          <div className="mt-1.5">
            <div className={`h-1.5 rounded-full ${d ? 'bg-surface-700' : 'bg-surface-200'} overflow-hidden`}>
              <div className={`h-full rounded-full ${progressPct >= 100 ? 'bg-emerald-500' : 'bg-primary-600'}`} style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-surface-500 mt-0.5">{paidCount}/{installments.length} installments paid</p>
          </div>
        )}
      </>
    );
  };

  const handleSelectLevel = (levelId) => {
    haptics.success();
    setEducationLevel(levelId);
    setEducationLevelAsked(true);
    setShowLevelPopup(false);
  };

  const handleSaveCustom = () => {
    if (!customName.trim()) return;
    haptics.success();
    const customType = {
      id: `custom_${Date.now().toString(36)}`,
      icon: customIcon,
      label: customName.trim(),
      desc: 'Custom fee type',
      defaultPattern: customPattern,
      fields: ['name', 'amount'],
      isCustom: true,
    };
    setShowCustomSheet(false);
    setCustomName('');
    navigate('education-fee-form', { params: { feeType: customType } });
  };

  const iconOptions = ['📌', '💰', '📚', '🎯', '⭐', '🔔', '📝', '🎁', '💳', '🏆'];

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => { haptics.light(); navigate('dashboard'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <div className="flex-1">
            <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Education Fees</h1>
            {currentLevel && (
              <p className="text-xs text-surface-500">
                {currentLevel.icon} {currentLevel.label}
              </p>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search fee types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 ${
                d ? 'bg-surface-800 text-white placeholder:text-surface-500' : 'bg-surface-100 text-surface-900'
              }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* Active Fees Count */}
        {activeFees.length > 0 && (
          <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
            <p className="text-sm text-primary-700 dark:text-primary-300">
              You have <span className="font-semibold">{activeFees.length}</span> active education fee{activeFees.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Multi-Entry List View */}
        {activeMultiEntryType && (
          <div className="mb-6">
            <button
              onClick={() => setActiveMultiEntryType(null)}
              className="flex items-center gap-1 text-sm text-primary-600 mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back to all fee types
            </button>
            <ListAddView
              title={`${activeMultiEntryType.icon} ${activeMultiEntryType.label}`}
              items={getMultiEntryItems(activeMultiEntryType.id)}
              onAdd={() => navigate('education-fee-form', { params: { feeType: activeMultiEntryType } })}
              onEdit={(fee) => navigate('education-fee-form', { params: { feeType: activeMultiEntryType, editFee: fee } })}
              onDelete={(feeId) => deleteFee(feeId)}
              onView={activeMultiEntryType.id === 'semester_fee' ? (fee) => setSelectedSemesterFee(fee) : undefined}
              renderItem={renderMultiEntryItem}
              emptyMessage={`No ${activeMultiEntryType.label.toLowerCase()} added yet`}
              addButtonText={`Add ${activeMultiEntryType.label}`}
              dark={d}
            />
          </div>
        )}

        {/* ═══ INTENT CARDS (Primary Actions) ═══ */}
        {!activeMultiEntryType && (
          <>
            <p className={`text-sm font-medium mb-3 ${d ? 'text-surface-300' : 'text-surface-700'}`}>Add a payment</p>
            <div className="space-y-2 mb-6">
              {/* Semester Payment — Primary */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { haptics.light(); navigate('semester-payment'); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition ${
                  d ? 'bg-primary-900/20 border-primary-800/50 hover:border-primary-600' : 'bg-primary-50 border-primary-200 hover:border-primary-400'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${d ? 'bg-primary-600/20' : 'bg-primary-100'}`}>🎓</div>
                <div className="text-left flex-1">
                  <p className={`font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Semester Payment</p>
                  <p className="text-xs text-surface-500">Record a semester payment with optional breakdown</p>
                </div>
                <ChevronRight className="w-5 h-5 text-surface-400" />
              </motion.button>

              {/* Admission / Registration */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  haptics.light();
                  const admType = relevantTypes.find(t => t.id === 'admission_fee') || { id: 'admission_fee', icon: '📋', label: 'Admission Fee', desc: 'One-time admission payment', defaultPattern: 'one_time', fields: ['name', 'amount', 'dueDate'] };
                  navigate('education-fee-form', { params: { feeType: admType } });
                }}
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl border transition ${
                  d ? 'bg-surface-900 border-surface-800 hover:border-surface-600' : 'bg-white border-surface-200 hover:border-surface-300'
                }`}
              >
                <span className="text-2xl w-10 text-center">📋</span>
                <div className="text-left flex-1">
                  <p className={`font-medium text-sm ${d ? 'text-white' : 'text-surface-900'}`}>Admission / Registration</p>
                  <p className="text-xs text-surface-500">One-time enrollment costs</p>
                </div>
                <ChevronRight className="w-4 h-4 text-surface-400" />
              </motion.button>

              {/* Recurring Cost */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  haptics.light();
                  const recurringTypes = relevantTypes.filter(t => t.defaultPattern === 'recurring' || t.id === 'coaching' || t.id === 'private_tutor');
                  if (recurringTypes.length > 0) {
                    handleSelectType(recurringTypes[0]);
                  }
                }}
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl border transition ${
                  d ? 'bg-surface-900 border-surface-800 hover:border-surface-600' : 'bg-white border-surface-200 hover:border-surface-300'
                }`}
              >
                <span className="text-2xl w-10 text-center">🔄</span>
                <div className="text-left flex-1">
                  <p className={`font-medium text-sm ${d ? 'text-white' : 'text-surface-900'}`}>Recurring Cost</p>
                  <p className="text-xs text-surface-500">Coaching, tutor, monthly fees</p>
                </div>
                <ChevronRight className="w-4 h-4 text-surface-400" />
              </motion.button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex-1 h-px ${d ? 'bg-surface-800' : 'bg-surface-200'}`} />
              <span className="text-xs text-surface-400">or browse all fee types</span>
              <div className={`flex-1 h-px ${d ? 'bg-surface-800' : 'bg-surface-200'}`} />
            </div>
          </>
        )}

        {/* Fee Type Groups */}
        {!activeMultiEntryType && Object.entries(groups).map(([key, group]) => {
          if (group.items.length === 0) return null;
          return (
            <div key={key} className="mb-6">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2 px-1">
                {group.title}
              </p>
              <div className="space-y-2">
                {group.items.map((type) => {
                  const displayLabel = getFeeLabel(type.id, effectiveLevel) || type.label;
                  return (
                    <motion.button
                      key={type.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectType(type)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${
                        d ? 'bg-surface-900 border-surface-800 hover:border-primary-700' : 'bg-white border-surface-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div className="text-left">
                          <p className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{displayLabel}</p>
                          <p className="text-xs text-surface-500">{type.desc}</p>
                        </div>
                      </div>
                      {type.isMultiEntry && getMultiEntryItems(type.id).length > 0 && (
                        <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium px-2 py-0.5 rounded-full mr-2">
                          {getMultiEntryItems(type.id).length}
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-surface-400" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* No Results */}
        {searchQuery && filteredTypes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-surface-500">No fee types found for "{searchQuery}"</p>
            <button
              onClick={() => { setSearchQuery(''); setShowCustomSheet(true); }}
              className="mt-4 text-primary-600 font-medium"
            >
              Create custom type
            </button>
          </div>
        )}

        {/* Show More Section */}
        {!activeMultiEntryType && hiddenTypes.length > 0 && effectiveLevel && (
          <div className="mt-4">
            <button
              onClick={() => { haptics.light(); setShowMore(!showMore); }}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-surface-500"
            >
              {showMore ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide other fee types
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show {hiddenTypes.length} more fee types
                </>
              )}
            </button>

            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs text-surface-400 mb-3 px-1">
                    Not typical for {currentLevel?.label}
                  </p>

                  <div className="space-y-2 opacity-60">
                    {hiddenTypes.map((type) => (
                      <motion.button
                        key={type.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectType(type)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border ${
                          d ? 'bg-surface-800/50 border-surface-700' : 'bg-surface-50 border-surface-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{type.icon}</span>
                          <div className="text-left">
                            <p className={`font-medium text-sm ${d ? 'text-surface-300' : 'text-surface-700'}`}>
                              {type.label}
                            </p>
                            <p className="text-xs text-surface-400">{type.desc}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-surface-300" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Add Custom */}
        {!activeMultiEntryType && <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCustomSheet(true)}
          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 border-dashed transition mt-4 ${
            d ? 'bg-surface-800 border-surface-700 hover:border-primary-600' : 'bg-surface-100 border-surface-300 hover:border-primary-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">➕</span>
            <div className="text-left">
              <p className={`font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>Add Custom</p>
              <p className="text-xs text-surface-500">Create your own category</p>
            </div>
          </div>
          <Plus className="w-5 h-5 text-surface-400" />
        </motion.button>}
      </main>

      {/* Custom Type Sheet */}
      <BottomSheet isOpen={showCustomSheet} onClose={() => setShowCustomSheet(false)} title="Add Custom Fee Type">
        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Icon</label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map(icon => (
                <button
                  key={icon}
                  onClick={() => setCustomIcon(icon)}
                  className={`w-12 h-12 text-2xl rounded-xl flex items-center justify-center transition ${
                    customIcon === icon ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-600' : d ? 'bg-surface-800' : 'bg-surface-100'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium mb-1 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Name</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Computer Course"
              className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:border-primary-600 text-surface-900 dark:text-white"
            />
          </div>

          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Payment Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: PAYMENT_PATTERNS.RECURRING, label: 'Monthly' },
                { id: PAYMENT_PATTERNS.SEMESTER, label: 'Semester' },
                { id: PAYMENT_PATTERNS.YEARLY, label: 'Yearly' },
                { id: PAYMENT_PATTERNS.ONE_TIME, label: 'One-time' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setCustomPattern(p.id)}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition ${
                    customPattern === p.id ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <GButton fullWidth size="lg" onClick={handleSaveCustom} disabled={!customName.trim()}>
            Continue
          </GButton>
        </div>
      </BottomSheet>

      {/* Education Level Popup — only if no profile level and no manual override */}
      <AnimatePresence>
        {showLevelPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto"
            >
              <div className={`rounded-2xl p-6 shadow-2xl ${d ? 'bg-surface-900' : 'bg-white'}`}>
                <div className="text-center mb-6">
                  <span className="text-5xl">🎓</span>
                  <h2 className={`text-xl font-bold mt-3 ${d ? 'text-white' : 'text-surface-900'}`}>
                    Where are you studying?
                  </h2>
                  <p className="text-sm text-surface-500 mt-1">
                    We'll show relevant fee types for you
                  </p>
                </div>

                <div className="space-y-3">
                  {EDUCATION_LEVELS.map((level) => (
                    <motion.button
                      key={level.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectLevel(level.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition ${
                        d ? 'bg-surface-800 hover:bg-primary-900/20' : 'bg-surface-50 hover:bg-primary-50'
                      }`}
                    >
                      <span className="text-3xl">{level.icon}</span>
                      <div className="text-left">
                        <p className={`font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>
                          {level.label}
                        </p>
                        <p className="text-xs text-surface-500">{level.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setEducationLevel(null);
                    setEducationLevelAsked(true);
                    setShowLevelPopup(false);
                  }}
                  className="w-full mt-4 py-2 text-sm text-surface-400 hover:text-surface-600"
                >
                  Show all fee types instead
                </button>

                <p className="text-xs text-surface-400 text-center mt-3">
                  You can change this in Settings
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <SemesterDetailSheet
        isOpen={!!selectedSemesterFee}
        onClose={() => setSelectedSemesterFee(null)}
        fee={selectedSemesterFee}
      />
      <LayoutBottomNav />
    </motion.div>
  );
};

export default EducationFeePage;
