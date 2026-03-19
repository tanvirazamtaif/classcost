import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Settings, User, LogOut, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import { Logo } from '../ui';
import { haptics } from '../../lib/haptics';

export const Header = ({ onMenuClick }) => {
  const { user, navigate, setUser, addToast, scheduledPayments = [], getUpcomingPayments } = useApp();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const profile = user?.profile;
  const initial = profile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const upcomingPayments = getUpcomingPayments?.() || [];
  const overdueCount = upcomingPayments.filter(p => p.status === 'overdue').length;
  const notificationCount = upcomingPayments.length;

  const handleAvatarClick = () => {
    haptics.light();
    setShowNotifications(false);
    setShowProfile(!showProfile);
  };

  const handleBellClick = () => {
    haptics.light();
    setShowProfile(false);
    setShowNotifications(!showNotifications);
  };

  const handleNavigate = (page) => {
    haptics.light();
    setShowProfile(false);
    setShowNotifications(false);
    navigate(page);
  };

  const handleSignOut = () => {
    haptics.medium();
    setShowProfile(false);
    setUser(null);
    navigate('landing', { replace: true });
    addToast('Signed out', 'info');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => { haptics.light(); onMenuClick?.(); }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-surface-700 dark:text-surface-300" />
        </button>

        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <h1 className="text-lg font-semibold text-surface-900 dark:text-white">ClassCost</h1>
        </div>

        <div className="flex items-center gap-1">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleBellClick}
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition"
              aria-label={`Notifications: ${notificationCount} upcoming payments`}
            >
              <Bell className="w-5 h-5 text-surface-700 dark:text-surface-300" />
              {notificationCount > 0 && (
                <span className={`absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-medium text-white rounded-full px-1 ${overdueCount > 0 ? 'bg-danger-500' : 'bg-primary-600'}`}>
                  {notificationCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-72 bg-white dark:bg-surface-900 rounded-2xl shadow-elevated border border-surface-200 dark:border-surface-800 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800">
                    <h3 className="font-semibold text-surface-900 dark:text-white">Upcoming Payments</h3>
                  </div>

                  {upcomingPayments.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-surface-500">
                      No upcoming payments
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {upcomingPayments.slice(0, 5).map((payment, i) => (
                        <div
                          key={payment.id || i}
                          className="px-4 py-3 border-b border-surface-50 dark:border-surface-800 last:border-0 hover:bg-surface-50 dark:hover:bg-surface-800 transition cursor-pointer"
                          onClick={() => handleNavigate('schedule')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                payment.status === 'overdue' ? 'bg-danger-500' :
                                payment.status === 'soon' ? 'bg-warning-500' : 'bg-surface-400'
                              }`} />
                              <span className="text-sm font-medium text-surface-900 dark:text-white">
                                {payment.name || payment.label}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-surface-900 dark:text-white">
                              ৳{(payment.amount || 0).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-surface-500 mt-1 ml-4">
                            {payment.status === 'overdue'
                              ? `${payment.daysUntil} days overdue`
                              : payment.status === 'today'
                              ? 'Due today!'
                              : `Due in ${payment.daysUntil} days`
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-4 py-2 border-t border-surface-100 dark:border-surface-800">
                    <button
                      onClick={() => handleNavigate('schedule')}
                      className="w-full text-center text-sm text-primary-600 font-medium py-1"
                    >
                      View all in Schedule
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={handleAvatarClick}
              className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium hover:ring-2 hover:ring-primary-300 transition"
              aria-label="Profile menu"
            >
              {initial}
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 w-56 bg-white dark:bg-surface-900 rounded-2xl shadow-elevated border border-surface-200 dark:border-surface-800 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800">
                    <p className="font-medium text-surface-900 dark:text-white truncate">{profile?.fullName || 'Student'}</p>
                    <p className="text-sm text-surface-500 truncate">{user?.email || ''}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => handleNavigate('settings')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm">Profile</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-surface-400" />
                    </button>
                    <button
                      onClick={() => handleNavigate('settings')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Settings</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-surface-400" />
                    </button>
                  </div>

                  <div className="border-t border-surface-100 dark:border-surface-800 py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
