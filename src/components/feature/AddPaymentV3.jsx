import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BottomSheet } from '../ui/BottomSheet';
import { GButton } from '../ui/GButton';
import { SuccessCheck } from '../ui/SuccessCheck';
import { useApp } from '../../contexts/AppContext';
import { useV3 } from '../../contexts/V3Context';
import { haptics } from '../../lib/haptics';
import { getThemeColors } from '../../lib/themeColors';
import {
  CATEGORIES,
  SUB_CATEGORIES,
  getCategoriesForEntityType,
  getPersonalCategories,
} from '../../core/categories';
import { sanitizeAmount } from '../../core/transactions';

const ENTITY_ICONS = { INSTITUTION: '🎓', RESIDENCE: '🏠', COACHING: '📖' };

const CAT_COLORS = {
  education: 'bg-purple-100 dark:bg-purple-900/30',
  housing: 'bg-green-100 dark:bg-green-900/30',
  coaching: 'bg-blue-100 dark:bg-blue-900/30',
  personal: 'bg-surface-100 dark:bg-surface-800',
};

function catBg(cat) {
  return CAT_COLORS[cat.group] || 'bg-surface-100 dark:bg-surface-800';
}

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

export const AddPaymentV3 = ({ isOpen, onClose, preselectedEntityId, preselectedObligation, lockEntity = false }) => {
  const { user, addToast, theme = 'dark', navigate } = useApp();
  const {
    entities, trackers, upcomingObligations,
    recordPayment, addTracker,
  } = useV3();

  const d = theme === 'dark';
  const c = getThemeColors(d);
  const profile = user?.profile;
  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'INR' ? '₹' : '৳';

  // State
  const [step, setStep] = useState('form'); // form | success | recurring
  const [selectedEntityId, setSelectedEntityId] = useState(preselectedEntityId || null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedTrackerId, setSelectedTrackerId] = useState(null);
  const [selectedObligationId, setSelectedObligationId] = useState(preselectedObligation?.id || null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [savedAmount, setSavedAmount] = useState(0);

  // Pre-fill obligation
  useEffect(() => {
    if (preselectedObligation) {
      setSelectedObligationId(preselectedObligation.id);
      setSelectedCategory(preselectedObligation.category);
      setSelectedTrackerId(preselectedObligation.trackerId || null);
      setSelectedEntityId(preselectedObligation.entityId || null);
      const remaining = preselectedObligation.amountRemaining ?? preselectedObligation.amountMinor;
      setAmount(String(remaining / 100));
    }
  }, [preselectedObligation]);

  useEffect(() => {
    if (preselectedEntityId) setSelectedEntityId(preselectedEntityId);
  }, [preselectedEntityId]);

  // Derived
  const activeEntities = useMemo(
    () => (entities || []).filter((e) => e.isActive),
    [entities]
  );

  const selectedEntity = useMemo(
    () => activeEntities.find((e) => e.id === selectedEntityId) || null,
    [activeEntities, selectedEntityId]
  );

  const categoryList = useMemo(() => {
    if (!selectedEntity) return getPersonalCategories();
    return getCategoriesForEntityType(selectedEntity.type);
  }, [selectedEntity]);

  const subCategories = useMemo(
    () => SUB_CATEGORIES[selectedCategory] || [],
    [selectedCategory]
  );

  const entityTrackers = useMemo(
    () => selectedEntityId
      ? (trackers || []).filter((t) => t.entityId === selectedEntityId && t.status === 'ACTIVE')
      : [],
    [selectedEntityId, trackers]
  );

  const trackerObligations = useMemo(() => {
    if (!selectedTrackerId) return [];
    return (upcomingObligations || []).filter(
      (o) => o.trackerId === selectedTrackerId && ['UPCOMING', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'].includes(o.status)
    );
  }, [selectedTrackerId, upcomingObligations]);

  const isQuickEntry = useMemo(() => {
    const cat = CATEGORIES[selectedCategory];
    return cat ? cat.entityTypes === null : false;
  }, [selectedCategory]);

  // Handlers
  function handleEntityTap(entityId) {
    haptics.light();
    const next = entityId === selectedEntityId ? null : entityId;
    setSelectedEntityId(next);
    setSelectedCategory('');
    setSelectedSubCategory('');
    setSelectedTrackerId(null);
    setSelectedObligationId(null);
  }

  function handleCategoryTap(catId) {
    haptics.light();

    const personalNavMap = {
      transport: 'transport-page',
      food: 'food-page',
      books: 'materials-page',
      stationery: 'materials-page',
      devices: 'other-page',
      medical: 'other-page',
      internet: 'other-page',
      loan_repayment: 'other-page',
      other: 'other-page',
    };

    if (!selectedEntityId && personalNavMap[catId]) {
      onClose();
      navigate(personalNavMap[catId]);
      return;
    }

    setSelectedCategory(catId);
    setSelectedSubCategory('');
    setErrors((prev) => ({ ...prev, category: undefined }));

    if (selectedEntityId) {
      const matching = entityTrackers.filter((t) => {
        const meta = t.meta || {};
        return meta.category === catId;
      });
      if (matching.length === 1) {
        setSelectedTrackerId(matching[0].id);
      } else {
        setSelectedTrackerId(null);
      }
    }
    setSelectedObligationId(null);
  }

  async function handleSave() {
    const newErrors = {};
    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) newErrors.amount = 'Enter a valid amount';
    if (numAmount > 10000000) newErrors.amount = 'Amount exceeds maximum limit';
    if (!selectedCategory) newErrors.category = 'Select a category';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      haptics.error();
      return;
    }

    setErrors({});
    haptics.medium();
    setSaving(true);

    try {
      await recordPayment({
        type: 'PAYMENT',
        direction: 'DEBIT',
        category: selectedCategory,
        subCategory: selectedSubCategory || null,
        amountMinor: Math.round(numAmount * 100),
        date: new Date().toISOString(),
        trackerId: selectedTrackerId || null,
        obligationId: selectedObligationId || null,
        note: note || null,
      });

      setSavedAmount(numAmount);

      // Prompt recurring for large personal expenses with no tracker
      if (numAmount >= 500 && !selectedTrackerId && selectedEntityId) {
        setStep('recurring');
      } else {
        setStep('success');
        setTimeout(() => {
          resetAndClose();
          addToast('Payment saved', 'success');
        }, 1200);
      }
    } catch (err) {
      console.error('Save payment error:', err);
      haptics.error();
      addToast('Failed to save payment', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRecurringChoice(type) {
    haptics.success();
    if (type === 'dismiss') {
      resetAndClose();
      addToast('Payment saved', 'success');
      return;
    }

    try {
      await addTracker({
        entityId: selectedEntityId,
        type: type === 'monthly' ? 'RECURRING_MONTHLY' : 'SEMESTER',
        label: CATEGORIES[selectedCategory]?.label || selectedCategory,
        category: selectedCategory,
        startDate: new Date().toISOString(),
        amountMinor: Math.round(savedAmount * 100),
        dueDay: 10,
      });
      resetAndClose();
      addToast('Payment saved & schedule created', 'success');
    } catch (err) {
      console.error('Create recurring failed:', err);
      resetAndClose();
      addToast('Payment saved (schedule failed)', 'warning');
    }
  }

  function resetAndClose() {
    setStep('form');
    setSelectedEntityId(preselectedEntityId || null);
    setSelectedCategory('');
    setSelectedSubCategory('');
    setSelectedTrackerId(null);
    setSelectedObligationId(null);
    setAmount('');
    setNote('');
    setErrors({});
    setSavedAmount(0);
    onClose();
  }

  const sheetTitle = step === 'form' ? 'Add payment' : step === 'recurring' ? 'Set up schedule?' : null;

  return (
    <BottomSheet isOpen={isOpen} onClose={resetAndClose} title={sheetTitle}>
      {/* ── STEP: Form ─────────────────────────────────────────── */}
      {step === 'form' && (
        <>
          {/* Locked entity badge */}
          {lockEntity && selectedEntity && (
            <div className="mb-3">
              <span className="px-3 py-1.5 rounded-full text-[11px] font-medium text-white" style={{ background: c.accent }}>
                {selectedEntity.name}
              </span>
            </div>
          )}

          {/* Entity attribution — only show when not locked and user has entities */}
          {!lockEntity && activeEntities.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <button
                onClick={() => { setSelectedEntityId(null); haptics.light(); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !selectedEntityId ? 'text-white' : d ? 'text-zinc-400 border border-zinc-700' : 'text-zinc-500 border border-zinc-300'
                }`}
                style={!selectedEntityId ? { background: c.accent } : {}}>
                Personal
              </button>
              {activeEntities.map(entity => (
                <button key={entity.id}
                  onClick={() => { handleEntityTap(entity.id); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedEntityId === entity.id ? 'text-white' : d ? 'text-zinc-400 border border-zinc-700' : 'text-zinc-500 border border-zinc-300'
                  }`}
                  style={selectedEntityId === entity.id ? { background: c.accent } : {}}>
                  {entity.type === 'INSTITUTION' ? '🎓 ' : entity.type === 'RESIDENCE' ? '🏠 ' : '📖 '}{entity.name}
                </button>
              ))}
            </div>
          )}

          {/* Category grid */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {categoryList.map((cat) => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryTap(cat.id)}
                className={`p-3 rounded-2xl text-center transition-all ${catBg(cat)} ${
                  selectedCategory === cat.id
                    ? 'ring-2 ring-primary-600 ring-offset-2 dark:ring-offset-surface-900'
                    : ''
                }`}
              >
                <span className="text-xl block mb-0.5">{cat.icon}</span>
                <span className={`text-[11px] leading-tight ${
                  selectedCategory === cat.id
                    ? 'font-semibold text-primary-600'
                    : d ? 'text-surface-400' : 'text-surface-600'
                }`}>
                  {cat.label}
                </span>
              </motion.button>
            ))}
          </div>
          {errors.category && (
            <p className="text-xs text-red-500 -mt-3 mb-4">{errors.category}</p>
          )}

          {/* Sub-category chips (for personal quick-entry) */}
          {isQuickEntry && subCategories.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {subCategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => { haptics.light(); setSelectedSubCategory(selectedSubCategory === sub ? '' : sub); }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition ${
                    selectedSubCategory === sub
                      ? 'bg-primary-600 text-white'
                      : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          {/* Tracker picker (for entity-bound structured categories) */}
          {!isQuickEntry && entityTrackers.length > 1 && selectedCategory && (
            <div className="mb-4">
              <p className={`text-xs mb-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Select schedule</p>
              <div className="space-y-1.5">
                {entityTrackers.map((trk) => (
                  <button
                    key={trk.id}
                    onClick={() => { haptics.light(); setSelectedTrackerId(trk.id); setSelectedObligationId(null); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${
                      selectedTrackerId === trk.id
                        ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
                        : d ? 'bg-surface-800 border border-surface-700' : 'bg-surface-50 border border-surface-200'
                    } ${d ? 'text-surface-200' : 'text-surface-700'}`}
                  >
                    {trk.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Obligation picker */}
          {trackerObligations.length > 0 && (
            <div className="mb-4">
              <p className={`text-xs mb-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>For which due?</p>
              <div className="space-y-1.5">
                {trackerObligations.map((obl) => {
                  const remaining = obl.amountRemaining ?? obl.amountMinor;
                  return (
                    <button
                      key={obl.id}
                      onClick={() => {
                        haptics.light();
                        setSelectedObligationId(selectedObligationId === obl.id ? null : obl.id);
                        if (selectedObligationId !== obl.id) setAmount(String(remaining / 100));
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition flex justify-between ${
                        selectedObligationId === obl.id
                          ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
                          : d ? 'bg-surface-800 border border-surface-700' : 'bg-surface-50 border border-surface-200'
                      }`}
                    >
                      <span className={d ? 'text-surface-200' : 'text-surface-700'}>{obl.label}</span>
                      <span className={`font-medium ${
                        obl.status === 'OVERDUE' ? 'text-red-500' : d ? 'text-surface-300' : 'text-surface-600'
                      }`}>
                        {currencySymbol}{remaining / 100}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Amount input */}
          {selectedCategory && (
            <>
              <div className="mb-4">
                <div className="flex items-center border-b-2 border-primary-600 pb-2">
                  <span className="text-2xl text-surface-500 mr-2">{currencySymbol}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => {
                      const val = sanitizeAmount(e.target.value);
                      setAmount(val);
                      if (val && Number(val) > 0) setErrors((prev) => ({ ...prev, amount: undefined }));
                    }}
                    className={`text-3xl font-semibold bg-transparent outline-none w-full ${d ? 'text-white' : 'text-surface-900'}`}
                    autoFocus
                  />
                </div>
                {errors.amount ? (
                  <p className="text-xs text-red-500 mt-2">{errors.amount}</p>
                ) : (
                  isQuickEntry && (
                    <div className="flex gap-2 mt-3">
                      {QUICK_AMOUNTS.map((qa) => (
                        <button
                          key={qa}
                          onClick={() => { haptics.light(); setAmount(String(qa)); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            Number(amount) === qa
                              ? 'bg-primary-600 text-white'
                              : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'
                          }`}
                        >
                          {currencySymbol}{qa}
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Note */}
              <div className="mb-5">
                <input
                  type="text"
                  placeholder="Add a note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={100}
                  className={`w-full p-3 rounded-xl text-sm outline-none transition border ${
                    d
                      ? 'bg-surface-800 border-surface-700 text-white focus:border-primary-600'
                      : 'bg-surface-50 border-surface-200 text-surface-900 focus:border-primary-600'
                  }`}
                />
              </div>

              <GButton fullWidth size="lg" onClick={handleSave} loading={saving}>
                Save payment
              </GButton>
            </>
          )}
        </>
      )}

      {/* ── STEP: Success ──────────────────────────────────────── */}
      {step === 'success' && (
        <div className="flex flex-col items-center justify-center py-8">
          <SuccessCheck size={80} />
          <p className={`text-lg font-medium mt-4 ${d ? 'text-white' : 'text-surface-900'}`}>
            Payment saved!
          </p>
        </div>
      )}

      {/* ── STEP: Recurring Prompt ─────────────────────────────── */}
      {step === 'recurring' && (
        <div className="text-center py-4">
          <span className="text-5xl mb-4 block">🔔</span>
          <h3 className={`text-lg font-semibold mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>
            Is this a regular payment?
          </h3>
          <p className={`text-sm mb-6 ${d ? 'text-surface-400' : 'text-surface-500'}`}>
            We can remind you next time it's due
          </p>
          <div className="space-y-2.5">
            <GButton fullWidth onClick={() => handleRecurringChoice('monthly')}>
              Yes, it's monthly
            </GButton>
            <GButton fullWidth variant="secondary" onClick={() => handleRecurringChoice('semester')}>
              Per semester
            </GButton>
            <button
              onClick={() => handleRecurringChoice('dismiss')}
              className={`w-full py-3 text-sm ${d ? 'text-surface-500' : 'text-surface-400'}`}
            >
              No, it's a one-time payment
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};

export default AddPaymentV3;
