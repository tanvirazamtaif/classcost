import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { EDUCATION_FEE_TYPES, PAYMENT_PATTERNS } from '../types/educationFees';
import { GButton, BottomSheet } from '../components/ui';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';

export const EducationFeePage = () => {
  const { navigate, theme } = useApp();
  const { activeFees } = useEducationFees();
  const d = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomSheet, setShowCustomSheet] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('📌');
  const [customPattern, setCustomPattern] = useState(PAYMENT_PATTERNS.RECURRING);

  // Filter by search
  const filteredTypes = searchQuery.trim()
    ? EDUCATION_FEE_TYPES.filter(t =>
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.desc?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : EDUCATION_FEE_TYPES;

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
    navigate('education-fee-form', { params: { feeType: type } });
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
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Education Fees</h1>
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

        <p className="text-sm text-surface-500 mb-4">What did you pay for?</p>

        {/* Fee Type Groups */}
        {Object.entries(groups).map(([key, group]) => {
          if (group.items.length === 0) return null;
          return (
            <div key={key} className="mb-6">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2 px-1">
                {group.title}
              </p>
              <div className="space-y-2">
                {group.items.map((type) => (
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
                        <p className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{type.label}</p>
                        <p className="text-xs text-surface-500">{type.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-surface-400" />
                  </motion.button>
                ))}
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

        {/* Add Custom */}
        <motion.button
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
        </motion.button>
      </main>

      {/* Custom Type Sheet */}
      <BottomSheet isOpen={showCustomSheet} onClose={() => setShowCustomSheet(false)} title="Add Custom Fee Type">
        <div className="space-y-4">
          {/* Icon */}
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

          {/* Name */}
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

          {/* Pattern */}
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
    </motion.div>
  );
};

export default EducationFeePage;
