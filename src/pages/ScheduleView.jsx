import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, Check, Trash2, Calendar, Bell } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GCard, GCardContent, GButton, BottomSheet } from '../components/ui';
import { haptics } from '../lib/haptics';
import { pageTransition, fadeInUp } from '../lib/animations';
import { makeFmt } from '../utils/format';

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export const ScheduleView = () => {
  const {
    user, theme,
    scheduledPayments = [],
    getUpcomingPayments,
    markScheduledAsPaid,
    deleteScheduledPayment,
  } = useApp();

  const d = theme === 'dark';
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || 'BDT');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => { document.title = "Schedule — ClassCost"; }, []);

  const upcomingPayments = getUpcomingPayments?.() || [];
  const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const handleDelete = (id) => {
    haptics.medium();
    if (confirm('Delete this recurring payment?')) {
      deleteScheduledPayment(id);
    }
  };

  return (
    <motion.div {...pageTransition} className="flex flex-col gap-5 pb-4">
      <div>
        <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-surface-900'}`} style={{ fontFamily: "'Fraunces',serif" }}>Schedule</h2>
        <p className={`text-sm ${d ? 'text-surface-400' : 'text-surface-500'}`}>Manage recurring payments</p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => { haptics.light(); setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1)); }}
          className={`w-8 h-8 flex items-center justify-center rounded-full ${d ? 'hover:bg-surface-800' : 'hover:bg-surface-100'}`}
        >
          <ChevronLeft className="w-5 h-5 text-surface-500" />
        </button>
        <h3 className={`text-lg font-semibold min-w-[160px] text-center ${d ? 'text-white' : 'text-surface-900'}`}>
          {monthName}
        </h3>
        <button
          onClick={() => { haptics.light(); setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1)); }}
          className={`w-8 h-8 flex items-center justify-center rounded-full ${d ? 'hover:bg-surface-800' : 'hover:bg-surface-100'}`}
        >
          <ChevronRight className="w-5 h-5 text-surface-500" />
        </button>
      </div>

      {/* Upcoming This Month */}
      <div>
        <h3 className={`text-sm font-medium mb-3 ${d ? 'text-surface-400' : 'text-surface-500'}`}>This Month</h3>

        {upcomingPayments.length === 0 ? (
          <GCard>
            <GCardContent className="py-6 text-center">
              <p className="text-sm text-surface-500">No upcoming payments</p>
            </GCardContent>
          </GCard>
        ) : (
          <div className="space-y-2">
            {upcomingPayments.map((payment) => (
              <GCard key={payment.id}>
                <GCardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      payment.status === 'overdue' ? 'bg-danger-50 text-danger-600 dark:bg-danger-500/20 dark:text-danger-500' :
                      payment.status === 'soon' || payment.status === 'today' ? 'bg-warning-50 text-warning-600 dark:bg-warning-500/20 dark:text-warning-500' :
                      d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-600'
                    }`}>
                      {payment.dueDay}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
                        {payment.name}
                      </p>
                      <p className="text-xs text-surface-500">
                        {fmt(payment.amount)} · {
                          payment.status === 'overdue' ? `${payment.daysUntil} days overdue` :
                          payment.status === 'today' ? 'Due today' :
                          `Due in ${payment.daysUntil} days`
                        }
                      </p>
                    </div>
                  </div>
                  <GButton
                    size="sm"
                    onClick={() => { haptics.success(); markScheduledAsPaid(payment.id); }}
                  >
                    <Check className="w-4 h-4 mr-1" /> Paid
                  </GButton>
                </GCardContent>
              </GCard>
            ))}
          </div>
        )}
      </div>

      {/* Recurring Payments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-medium ${d ? 'text-surface-400' : 'text-surface-500'}`}>Recurring Payments</h3>
          <button
            onClick={() => setShowAddSheet(true)}
            className="text-xs text-primary-600 font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {scheduledPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <span className="text-5xl mb-4">📅</span>
            <h3 className={`text-lg font-medium mb-2 ${d ? 'text-white' : 'text-surface-900'}`}>No recurring payments</h3>
            <p className={`text-sm mb-6 max-w-xs ${d ? 'text-surface-400' : 'text-surface-600'}`}>
              Add monthly payments like school fees or hostel fees to get reminded before due dates.
            </p>
            <GButton onClick={() => setShowAddSheet(true)}>Add recurring payment</GButton>
          </div>
        ) : (
          <GCard>
            <GCardContent>
              {scheduledPayments.map((payment, i) => (
                <div key={payment.id} className={`flex items-center justify-between py-3 ${i > 0 ? `border-t ${d ? 'border-surface-800' : 'border-surface-100'}` : ''}`}>
                  <div>
                    <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>
                      {payment.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-surface-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {payment.dueDay}{getDaySuffix(payment.dueDay)} of month
                      </span>
                      <span className="text-xs text-surface-500 flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        {payment.reminderDays || 2}d before
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>
                      {fmt(payment.amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(payment.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-danger-50 dark:hover:bg-danger-500/10 text-danger-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </GCardContent>
          </GCard>
        )}
      </div>

      <AddRecurringSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </motion.div>
  );
};

const AddRecurringSheet = ({ isOpen, onClose }) => {
  const { addScheduledPayment, addToast, theme } = useApp();
  const d = theme === 'dark';
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState(10);
  const [reminderDays, setReminderDays] = useState(2);
  const [category, setCategory] = useState('education');

  const categoryOptions = [
    { id: 'education', label: '🎓 Education' },
    { id: 'hostel', label: '🏠 Housing' },
    { id: 'transport', label: '🚌 Transport' },
    { id: 'canteen', label: '🍽️ Food' },
    { id: 'books', label: '📚 Books' },
  ];

  const handleSave = () => {
    if (!name || !amount) return;
    haptics.success();
    addScheduledPayment({
      name,
      amount: Number(amount),
      category,
      type: category,
      frequency: 'monthly',
      dueDay,
      reminderDays,
    });
    setName('');
    setAmount('');
    setDueDay(10);
    setReminderDays(2);
    setCategory('education');
    onClose();
    addToast('Recurring payment added', 'success');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add recurring payment">
      <div className="space-y-4">
        <div>
          <label className={`text-sm font-medium mb-1 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., School Fee"
            className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:border-primary-600 text-surface-900 dark:text-white"
          />
        </div>

        <div>
          <label className={`text-sm font-medium mb-1 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Amount</label>
          <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-xl bg-surface-50 dark:bg-surface-800 px-3">
            <span className="text-surface-500">৳</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 p-3 bg-transparent outline-none text-sm text-surface-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className={`text-sm font-medium mb-1 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>Category</label>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  category === cat.id ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
            Due day: {dueDay}{getDaySuffix(dueDay)}
          </label>
          <input
            type="range"
            min="1"
            max="28"
            value={dueDay}
            onChange={(e) => setDueDay(Number(e.target.value))}
            className="w-full accent-primary-600"
          />
        </div>

        <div>
          <label className={`text-sm font-medium mb-2 block ${d ? 'text-surface-300' : 'text-surface-700'}`}>
            Remind {reminderDays} days before
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 5, 7].map(days => (
              <button
                key={days}
                onClick={() => setReminderDays(days)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  reminderDays === days ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        <GButton fullWidth size="lg" onClick={handleSave} disabled={!name || !amount}>
          Save
        </GButton>
      </div>
    </BottomSheet>
  );
};

export default ScheduleView;
