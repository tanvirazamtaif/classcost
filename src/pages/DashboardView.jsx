import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, CreditCard, Zap } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Header, LayoutBottomNav, Sidebar } from '../components/layout';
import { FAB, GCard, GCardContent, GButton } from '../components/ui';
import { AddPaymentSheet, ExpenseDetailSheet, PaymentCard, QuickEntrySheet } from '../components/feature';
import { stagger, fadeInUp } from '../lib/animations';
import { makeFmt } from '../utils/format';
import { useEducationFees } from '../contexts/EducationFeeContext';
import { STATUS_CONFIG } from '../types/educationFees';
import { MarkPaidSheet } from '../components/education/MarkPaidSheet';
import { SkipPeriodSheet } from '../components/education/SkipPeriodSheet';

// ═══════════════════════════════════════════════════════════════
// QUICK ADD SYSTEM
// ═══════════════════════════════════════════════════════════════

// Categories/subtypes that are eligible for Quick Add (routine daily costs)
const QUICK_ADD_ELIGIBLE = new Set([
  'transport', 'canteen', 'books', 'other',
]);

// Transport subtypes that are NOT eligible (rare/event-based)
const TRANSPORT_EXCLUDED = new Set([
  'hometown_travel', 'go_home', 'come_to_dhaka', 'admission_exam_travel',
]);

// System defaults shown when no learned patterns exist
const SYSTEM_DEFAULTS = [
  { id: 'default_transport', label: 'University Transport', icon: '🚌', category: 'transport', amount: 50, details: 'University Transport' },
  { id: 'default_food', label: 'Food', icon: '🍽️', category: 'canteen', amount: 100, details: 'Food' },
  { id: 'default_photocopy', label: 'Photocopy', icon: '📄', category: 'other', amount: 10, details: 'Photocopy' },
];

function deriveQuickAdds(expenses) {
  // Count repeatable patterns from recent expenses
  const patternCounts = {};
  const recentExpenses = (expenses || []).slice(-100); // Last 100

  recentExpenses.forEach(exp => {
    if (!QUICK_ADD_ELIGIBLE.has(exp.type)) return;

    // Exclude ineligible transport subtypes
    const meta = exp.meta || {};
    if (exp.type === 'transport' && (TRANSPORT_EXCLUDED.has(meta.transportType) || TRANSPORT_EXCLUDED.has(meta.transportSubtype))) return;

    // Build a pattern key from details/label
    const label = exp.details || meta.label || exp.label || '';
    if (!label || label.length < 2) return;

    const key = `${exp.type}::${label.toLowerCase().trim()}`;
    if (!patternCounts[key]) {
      patternCounts[key] = { count: 0, totalAmount: 0, label, category: exp.type, icon: null, lastAmount: 0 };
    }
    patternCounts[key].count++;
    patternCounts[key].totalAmount += Number(exp.amount) || 0;
    patternCounts[key].lastAmount = Number(exp.amount) || 0;
  });

  // Filter: must appear 2+ times to be "learned"
  const learned = Object.values(patternCounts)
    .filter(p => p.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((p, i) => {
      const avgAmount = Math.round(p.totalAmount / p.count);
      const icons = { transport: '🚌', canteen: '🍽️', books: '📚', other: '📦' };
      return {
        id: `learned_${i}`,
        label: p.label,
        icon: icons[p.category] || '📦',
        category: p.category,
        amount: p.lastAmount || avgAmount,
        details: p.label,
        source: 'learned',
      };
    });

  // If we have enough learned items, use only those. Otherwise mix with defaults.
  if (learned.length >= 3) return learned.slice(0, 5);

  // Merge: learned first, then fill with defaults that don't duplicate
  const usedLabels = new Set(learned.map(l => l.label.toLowerCase()));
  const defaults = SYSTEM_DEFAULTS.filter(d => !usedLabels.has(d.label.toLowerCase()));
  return [...learned, ...defaults].slice(0, 5);
}

const QuickAddSection = React.memo(({ expenses, addExpense, addToast, d, fmt }) => {
  const quickAdds = useMemo(() => deriveQuickAdds(expenses), [expenses]);
  const [savingId, setSavingId] = useState(null);

  const handleQuickAdd = useCallback(async (item) => {
    setSavingId(item.id);
    try {
      await addExpense({
        type: item.category,
        amount: item.amount,
        label: item.category === 'transport' ? 'Transport' : item.category === 'canteen' ? 'Food' : item.category === 'books' ? 'Study Materials' : 'Other',
        details: item.details,
        date: new Date().toISOString().split('T')[0],
        meta: { label: item.details, source: 'quick_add' },
      });
      addToast?.(`${item.label} · ৳${item.amount}`, 'success');
    } catch (e) {
      addToast?.('Failed to save', 'error');
    } finally {
      setTimeout(() => setSavingId(null), 600);
    }
  }, [addExpense, addToast]);

  if (quickAdds.length === 0) return null;

  return (
    <motion.div variants={fadeInUp} className="mb-6">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Zap className={`w-3.5 h-3.5 ${d ? 'text-amber-400' : 'text-amber-500'}`} />
        <h2 className={`text-xs font-medium ${d ? 'text-surface-400' : 'text-surface-500'}`}>Quick Add</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {quickAdds.map(item => {
          const isSaving = savingId === item.id;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => !isSaving && handleQuickAdd(item)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all ${
                isSaving
                  ? 'bg-emerald-500/10 border-emerald-500/30 scale-95'
                  : d ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300'
              }`}
            >
              {isSaving ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <span className="text-base">{item.icon}</span>
              )}
              <div className="text-left">
                <p className={`text-xs font-medium leading-tight ${isSaving ? 'text-emerald-500' : d ? 'text-white' : 'text-surface-900'}`}>
                  {item.label}
                </p>
                <p className={`text-[10px] leading-tight ${isSaving ? 'text-emerald-400' : d ? 'text-surface-500' : 'text-surface-400'}`}>
                  ৳{item.amount}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

export const DashboardView = () => {
  const { user, expenses, theme, navigate, getUpcomingPayments, markScheduledAsPaid, addExpense, addToast } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preselectedCategory, setPreselectedCategory] = useState('');
  const [quickEntryCategory, setQuickEntryCategory] = useState(null);
  const [selectedEduPayment, setSelectedEduPayment] = useState(null);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [showSkipSheet, setShowSkipSheet] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const d = theme === 'dark';

  const { getUpcomingPayments: eduUpcoming, getOverduePayments: overduePayments, getTotalPaidThisMonth: eduMonthly } = useEducationFees();

  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || 'BDT');
  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'INR' ? '₹' : '৳';

  useEffect(() => { document.title = "Dashboard — ClassCost"; }, []);

  const totals = useMemo(() => {
    const all = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisYear = String(now.getFullYear());
    const monthly = expenses
      .filter(e => e.date?.startsWith(thisMonth))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const yearly = expenses
      .filter(e => e.date?.startsWith(thisYear))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return { all, monthly, yearly };
  }, [expenses]);

  const groupedByDay = useMemo(() => {
    const sorted = [...expenses]
      .filter(e => !e.isHistorical)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const groups = {};
    sorted.forEach(exp => {
      const day = exp.date || 'Unknown';
      if (!groups[day]) groups[day] = [];
      groups[day].push(exp);
    });
    return groups;
  }, [expenses]);

  const days = Object.keys(groupedByDay).slice(0, 5);

  const formatDayLabel = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleOpenForm = (categoryId) => {
    if (categoryId === 'education') return navigate('education-home');
    if (categoryId === 'hostel') return navigate('housing-landing');
    if (categoryId === 'books') return navigate('study-materials');
    if (categoryId === 'transport') return navigate('transport');
    if (categoryId === 'canteen') {
      setQuickEntryCategory(categoryId);
      return;
    }
    setPreselectedCategory(categoryId || '');
    setSheetOpen(true);
  };

  const quickCategories = [
    { id: 'education', icon: '🎓', label: 'Education', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { id: 'transport', icon: '🚌', label: 'Transport', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { id: 'canteen', icon: '🍽️', label: 'Food', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { id: 'hostel', icon: '🏠', label: 'Housing', bg: 'bg-green-100 dark:bg-green-900/30' },
    { id: 'books', icon: '📚', label: 'Study Materials', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ];

  return (
    <div className={`min-h-screen ${d ? 'bg-surface-950' : 'bg-surface-50'} pb-20`}>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <motion.main className="p-4 max-w-md mx-auto" variants={stagger} initial="initial" animate="animate">
        {/* Total Card */}
        <motion.div variants={fadeInUp}>
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-5 mb-6 text-white shadow-lg">
            <p className="text-sm opacity-90 mb-1">Total education cost</p>
            <p className="text-3xl font-bold mb-3">{fmt(totals.all)}</p>
            <div className="flex gap-4 text-sm opacity-85">
              <span>This month {fmt(totals.monthly)}</span>
              <span>·</span>
              <span>This year {fmt(totals.yearly)}</span>
            </div>
          </div>
        </motion.div>

        {/* Quick Category Access */}
        <motion.div variants={fadeInUp} className="mb-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {quickCategories.map((cat) => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleOpenForm(cat.id)}
                className={`flex flex-col items-center gap-1.5 min-w-[64px] p-3 rounded-2xl ${cat.bg} transition-all`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className={`text-xs font-medium ${d ? 'text-surface-300' : 'text-surface-600'}`}>{cat.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ═══ QUICK ADD ═══ */}
        <QuickAddSection expenses={expenses} addExpense={addExpense} addToast={addToast} d={d} fmt={fmt} />

        {/* Upcoming Payments */}
        {(getUpcomingPayments?.() || []).length > 0 && (
          <motion.section variants={fadeInUp} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-medium ${d ? 'text-surface-400' : 'text-surface-500'}`}>Upcoming</h2>
              <button onClick={() => navigate('schedule')} className="text-xs text-primary-600 font-medium">See all</button>
            </div>
            <div className="space-y-2">
              {(getUpcomingPayments?.() || []).slice(0, 3).map((payment) => (
                <GCard key={payment.id}>
                  <GCardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        payment.status === 'overdue' ? 'bg-danger-500' :
                        payment.status === 'soon' || payment.status === 'today' ? 'bg-warning-500' :
                        'bg-surface-400'
                      }`} />
                      <div>
                        <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>{payment.name}</p>
                        <p className="text-xs text-surface-500">
                          {currencySymbol}{(payment.amount || 0).toLocaleString()} · {
                            payment.status === 'overdue' ? `${payment.daysUntil}d overdue` :
                            payment.status === 'today' ? 'Due today!' :
                            `Due in ${payment.daysUntil}d`
                          }
                        </p>
                      </div>
                    </div>
                    <GButton size="sm" variant="secondary" onClick={() => markScheduledAsPaid(payment.id)}>
                      <Check className="w-4 h-4 mr-1" /> Paid
                    </GButton>
                  </GCardContent>
                </GCard>
              ))}
            </div>
          </motion.section>
        )}

        {/* Education Fee Section */}
        {(overduePayments.length > 0 || eduUpcoming.length > 0) && (
          <motion.section variants={fadeInUp} className="mb-6">
            {/* Overdue Alert */}
            {overduePayments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl"
              >
                <div className="flex items-center gap-2 text-danger-700 dark:text-danger-300">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {overduePayments.length} overdue payment{overduePayments.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Section Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-semibold ${d ? 'text-surface-400' : 'text-surface-500'} uppercase tracking-wide`}>
                Education Fees
              </h2>
              <button onClick={() => navigate('education-fees')} className="text-xs text-primary-600 font-medium">
                + Add Fee
              </button>
            </div>

            {/* Upcoming Education Payments */}
            <div className="space-y-3">
              {eduUpcoming.slice(0, 5).map((payment, index) => {
                const sc = STATUS_CONFIG[payment.status] || STATUS_CONFIG.upcoming;
                const isOverdue = payment.status === 'overdue';
                const isPartial = payment.status === 'partial';

                return (
                  <motion.div
                    key={`${payment.fee.id}-${payment.period || payment.installment?.id || index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border transition ${
                      isOverdue
                        ? 'bg-danger-50 dark:bg-danger-900/10 border-danger-200 dark:border-danger-800'
                        : d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{payment.fee.icon}</span>
                        <div>
                          <p className={`font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
                            {payment.fee.name || payment.fee.feeType}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-medium ${sc.textClass}`}>
                              {sc.icon} {sc.label}
                            </span>
                            {payment.type === 'installment' && (
                              <span className="text-xs text-surface-400">Part {payment.installment.part}</span>
                            )}
                            {payment.daysUntilDue !== undefined && (
                              <span className="text-xs text-surface-400">
                                {payment.daysUntilDue === 0 ? 'Today' :
                                 payment.daysUntilDue === 1 ? 'Tomorrow' :
                                 payment.daysUntilDue < 0 ? `${Math.abs(payment.daysUntilDue)}d ago` :
                                 `${payment.daysUntilDue}d left`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>
                          ৳{(payment.remainingAmount || payment.amount || 0).toLocaleString()}
                        </p>
                        {isPartial && (
                          <p className="text-xs text-warning-600">of ৳{payment.amount.toLocaleString()}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <GButton
                        size="sm"
                        onClick={() => {
                          setSelectedEduPayment(payment);
                          setShowMarkPaid(true);
                        }}
                        className="flex-1"
                      >
                        <CreditCard className="w-4 h-4 mr-1.5" />
                        {payment.type === 'per_class' ? 'Record Classes' : 'Pay'}
                      </GButton>

                      {payment.type === 'recurring' && (
                        <GButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedEduPayment(payment);
                            setShowSkipSheet(true);
                          }}
                        >
                          Skip
                        </GButton>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {eduUpcoming.length > 5 && (
              <button onClick={() => navigate('education-fees')} className="w-full mt-3 py-2 text-sm text-primary-600 font-medium">
                View all {eduUpcoming.length} payments
              </button>
            )}
          </motion.section>
        )}

        {/* Education Empty State */}
        {eduUpcoming.length === 0 && (getUpcomingPayments?.() || []).length === 0 && expenses.filter(e => !e.isHistorical).length === 0 && (
          <motion.div variants={fadeInUp} className={`p-6 rounded-xl border-2 border-dashed text-center mb-6 ${
            d ? 'bg-surface-900 border-surface-800' : 'bg-surface-50 border-surface-200'
          }`}>
            <span className="text-4xl">🎓</span>
            <p className={`mt-2 font-medium ${d ? 'text-surface-300' : 'text-surface-700'}`}>No education fees yet</p>
            <p className="text-sm text-surface-500 mt-1">Add your school, college, or tuition fees to start tracking</p>
            <GButton onClick={() => navigate('education-fees')} className="mt-4">
              Add Education Fee
            </GButton>
          </motion.div>
        )}

        {/* Recent Expenses */}
        <motion.section variants={fadeInUp}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-medium ${d ? 'text-surface-400' : 'text-surface-500'}`}>Recent</h2>
          </div>

          {expenses.filter(e => !e.isHistorical).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <span className="text-5xl mb-4">💰</span>
              <h3 className={`text-lg font-medium mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>No payments yet</h3>
              <p className={`text-sm mb-6 max-w-xs ${d ? 'text-surface-400' : 'text-surface-600'}`}>
                Tap the + button to record your first education payment
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setSheetOpen(true)}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm"
              >
                Add payment
              </motion.button>
            </div>
          ) : (
            <GCard>
              <GCardContent>
                {days.map((day, i) => (
                  <div key={day} className={i > 0 ? `mt-4 pt-4 border-t ${d ? 'border-surface-800' : 'border-surface-100'}` : ''}>
                    <p className={`text-xs mb-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>{formatDayLabel(day)}</p>
                    {groupedByDay[day].map((payment) => (
                      <PaymentCard key={payment.id || `${payment.date}-${payment.amount}`} payment={payment} currencySymbol={currencySymbol} onClick={() => setSelectedExpense(payment)} />
                    ))}
                  </div>
                ))}
              </GCardContent>
            </GCard>
          )}
        </motion.section>
      </motion.main>

      <FAB onClick={() => setSheetOpen(true)} />
      <LayoutBottomNav />
      <AddPaymentSheet
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); setPreselectedCategory(''); }}
        preselectedCategory={preselectedCategory}
      />
      <QuickEntrySheet
        isOpen={!!quickEntryCategory}
        onClose={() => setQuickEntryCategory(null)}
        categoryId={quickEntryCategory || 'transport'}
      />
      <MarkPaidSheet
        isOpen={showMarkPaid}
        onClose={() => { setShowMarkPaid(false); setSelectedEduPayment(null); }}
        upcomingPayment={selectedEduPayment}
      />
      <SkipPeriodSheet
        isOpen={showSkipSheet}
        onClose={() => { setShowSkipSheet(false); setSelectedEduPayment(null); }}
        upcomingPayment={selectedEduPayment}
      />
      <ExpenseDetailSheet
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
      />
    </div>
  );
};

export default DashboardView;
