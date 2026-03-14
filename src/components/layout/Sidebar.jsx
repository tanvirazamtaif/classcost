import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, CreditCard, PieChart, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { haptics } from '../../lib/haptics';

const menuItems = [
  { icon: Home, label: 'Home', page: 'dashboard' },
  { icon: CreditCard, label: 'Loans', page: 'loans' },
  { icon: PieChart, label: 'Reports', page: 'reports' },
  { divider: true },
  { icon: Settings, label: 'Settings', page: 'settings' },
  { icon: HelpCircle, label: 'Help', page: 'settings' },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, setUser, navigate, theme, toggleTheme, addToast } = useApp();
  const profile = user?.profile;

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleNavigate = (page) => {
    haptics.light();
    navigate(page);
    onClose();
  };

  const handleSignOut = () => {
    haptics.medium();
    setUser(null);
    navigate('landing', { replace: true });
    addToast('Signed out', 'info');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-72 z-50 bg-white dark:bg-surface-900 shadow-xl"
          >
            <div className="p-5 border-b border-surface-200 dark:border-surface-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white text-lg font-medium">
                  {profile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-900 dark:text-white truncate">{profile?.fullName || 'Student'}</p>
                  <p className="text-sm text-surface-500 truncate">{user?.email || ''}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-full">
                  <X className="w-5 h-5 text-surface-500" />
                </button>
              </div>
            </div>

            <div className="py-2">
              {menuItems.map((item, i) =>
                item.divider ? (
                  <div key={i} className="my-2 border-t border-surface-200 dark:border-surface-800" />
                ) : (
                  <button
                    key={i}
                    onClick={() => handleNavigate(item.page)}
                    className="w-full flex items-center gap-4 px-5 py-3 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                )
              )}
            </div>

            <div className="px-5 py-3 border-t border-surface-200 dark:border-surface-800">
              <button onClick={toggleTheme} className="w-full flex items-center justify-between py-2">
                <span className="text-sm text-surface-700 dark:text-surface-300">Dark mode</span>
                <div className={`w-11 h-6 rounded-full transition ${theme === 'dark' ? 'bg-primary-600' : 'bg-surface-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
                </div>
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-surface-200 dark:border-surface-800">
              <button onClick={handleSignOut} className="w-full flex items-center gap-4 py-2 text-danger-500">
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
