import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Building, CreditCard, Download, Palette, Globe, HelpCircle, Info } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Logo } from '../ui';
import { haptics } from '../../lib/haptics';
import { getThemeColors } from '../../lib/themeColors';

const menuItems = [
  { icon: User, label: 'My Profile', page: 'settings' },
  { icon: Building, label: 'My Institutions', page: 'education-home' },
  { icon: CreditCard, label: 'Loans', page: 'loans' },
  { icon: Download, label: 'Export Data', page: 'settings' },
  { divider: true },
  { icon: Palette, label: 'Appearance', action: 'theme' },
  { icon: Globe, label: 'Currency', page: 'settings' },
  { icon: HelpCircle, label: 'Help & Feedback', page: 'settings' },
  { icon: Info, label: 'About ClassCost', page: 'settings' },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, setUser, navigate, theme, toggleTheme, addToast } = useApp();
  const profile = user?.profile;
  const isDark = theme === 'dark';
  const colors = getThemeColors(isDark);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleItemClick = (item) => {
    haptics.light();
    if (item.action === 'theme') {
      toggleTheme();
    } else if (item.page) {
      navigate(item.page);
      onClose();
    }
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
            className="fixed top-0 left-0 h-full w-72 z-50 shadow-xl"
            style={{ backgroundColor: colors.card, color: colors.text1 }}
          >
            <div className="flex items-center gap-2.5 px-4 py-3">
              <Logo size={28} />
              <span className="text-lg font-bold" style={{ color: colors.text1 }}>ClassCost</span>
            </div>
            <div className="p-5" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white text-lg font-medium">
                  {profile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: colors.text1 }}>{profile?.fullName || 'Student'}</p>
                  <p className="text-sm truncate" style={{ color: colors.text2 }}>{user?.email || ''}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full" style={{ color: colors.text2 }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="py-2">
              {menuItems.map((item, i) =>
                item.divider ? (
                  <div key={i} className="my-2" style={{ borderTop: `1px solid ${colors.border}` }} />
                ) : (
                  <button
                    key={i}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center gap-4 px-5 py-3 transition hover:opacity-80"
                    style={{ color: colors.text1 }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: colors.text2 }} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                )
              )}
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
