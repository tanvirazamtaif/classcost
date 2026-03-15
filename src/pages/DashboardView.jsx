import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Header, LayoutBottomNav, Sidebar } from '../components/layout';
import { FAB, GCard, GCardContent, GButton } from '../components/ui';
import { AddPaymentSheet, PaymentCard } from '../components/feature';
import { stagger, fadeInUp } from '../lib/animations';
import { makeFmt } from '../utils/format';

export const DashboardView = () => {
  const { user, expenses, theme, navigate, getUpcomingPayments, markScheduledAsPaid } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preselectedCategory, setPreselectedCategory] = useState('');
  const d = theme === 'dark';

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
    setPreselectedCategory(categoryId || '');
    setSheetOpen(true);
  };

  // Category quick-access buttons
  const quickCategories = [
    { id: 'education', icon: '🎓', label: 'Education', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { id: 'transport', icon: '🚌', label: 'Transport', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { id: 'canteen', icon: '🍽️', label: 'Food', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { id: 'hostel', icon: '🏠', label: 'Housing', bg: 'bg-green-100 dark:bg-green-900/30' },
    { id: 'books', icon: '📚', label: 'Books', bg: 'bg-amber-100 dark:bg-amber-900/30' },
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
                      <PaymentCard key={payment.id || `${payment.date}-${payment.amount}`} payment={payment} currencySymbol={currencySymbol} />
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
    </div>
  );
};

export default DashboardView;
