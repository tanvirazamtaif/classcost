import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { EDUCATION_FEE_TYPES } from '../types/educationFees';
import { GButton, BottomSheet } from '../components/ui';
import { haptics } from '../lib/haptics';
import { pageTransition } from '../lib/animations';

export const EducationFeePage = () => {
  const { navigate, theme } = useApp();
  const d = theme === 'dark';
  const [showCustomSheet, setShowCustomSheet] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('📋');
  const [customPattern, setCustomPattern] = useState('recurring');

  const recurringTypes = EDUCATION_FEE_TYPES.filter(t =>
    ['recurring', 'per_class'].includes(t.defaultPattern)
  );
  const semesterTypes = EDUCATION_FEE_TYPES.filter(t => t.defaultPattern === 'semester');
  const yearlyTypes = EDUCATION_FEE_TYPES.filter(t => t.defaultPattern === 'yearly');
  const oneTimeTypes = EDUCATION_FEE_TYPES.filter(t => t.defaultPattern === 'one_time');

  const handleSelectType = (type) => {
    haptics.light();
    navigate('education-fee-form', { params: { feeType: type } });
  };

  const handleSaveCustom = () => {
    if (!customName) return;
    haptics.success();
    const customType = {
      id: `custom_${Date.now()}`,
      icon: customIcon,
      label: customName,
      desc: 'Custom fee type',
      defaultPattern: customPattern,
      fields: ['name', 'amount'],
      isCustom: true,
    };
    setShowCustomSheet(false);
    setCustomName('');
    navigate('education-fee-form', { params: { feeType: customType } });
  };

  const renderSection = (title, types, emoji) => {
    if (types.length === 0) return null;
    return (
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-wide mb-2 px-1 ${d ? 'text-surface-500' : 'text-surface-500'}`}>
          {emoji} {title}
        </p>
        <div className="space-y-2">
          {types.map((type) => (
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
  };

  return (
    <motion.div {...pageTransition} className={`min-h-screen pb-20 ${d ? 'bg-surface-950' : 'bg-surface-50'}`}>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => { haptics.light(); navigate('dashboard'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <ArrowLeft className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <h1 className={`text-lg font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>Education Fees</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <p className="text-sm text-surface-500 mb-4">What did you pay for?</p>

        {renderSection('Monthly', recurringTypes, '📅')}
        {renderSection('Semester', semesterTypes, '🎓')}
        {renderSection('Yearly', yearlyTypes, '📆')}
        {renderSection('One-time', oneTimeTypes, '🔴')}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCustomSheet(true)}
          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 border-dashed transition ${
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

      <BottomSheet isOpen={showCustomSheet} onClose={() => setShowCustomSheet(false)} title="Add Custom Fee Type">
        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium mb-1 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Name</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Music class"
              className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:border-primary-600 text-surface-900 dark:text-white"
            />
          </div>
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Icon</label>
            <div className="flex flex-wrap gap-2">
              {['📋', '🎵', '🎨', '💻', '🏃', '🔧', '📐', '🌐'].map(icon => (
                <button
                  key={icon}
                  onClick={() => setCustomIcon(icon)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition ${
                    customIcon === icon ? 'bg-primary-600 ring-2 ring-primary-300' : d ? 'bg-surface-800' : 'bg-surface-100'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Payment Pattern</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'recurring', label: 'Monthly' },
                { id: 'yearly', label: 'Yearly' },
                { id: 'one_time', label: 'One-time' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setCustomPattern(p.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    customPattern === p.id ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <GButton fullWidth size="lg" onClick={handleSaveCustom} disabled={!customName}>
            Continue
          </GButton>
        </div>
      </BottomSheet>
    </motion.div>
  );
};

export default EducationFeePage;
