import React from 'react';
import { Home, GraduationCap, CreditCard, PieChart, Settings } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { haptics } from '../../lib/haptics';
import { isEnabled } from '../../lib/featureFlags';
import { BottomNavV3 } from '../feature/BottomNav';

const navItems = [
  { id: 'dashboard', icon: Home, label: 'Home' },
  { id: 'education-home', icon: GraduationCap, label: 'Education' },
  { id: 'loans', icon: CreditCard, label: 'Loans' },
  { id: 'reports', icon: PieChart, label: 'Reports' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export const LayoutBottomNav = ({ onAddPress }) => {
  const { view, navigate } = useApp();

  if (isEnabled('USE_NEW_ARCHITECTURE')) {
    return <BottomNavV3 active={view} navigate={navigate} onAddPress={onAddPress || (() => {})} />;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-sm border-t border-surface-200 dark:border-surface-800 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = view === id;
          return (
            <button
              key={id}
              onClick={() => { haptics.light(); navigate(id); }}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition ${
                isActive
                  ? 'text-primary-600'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
