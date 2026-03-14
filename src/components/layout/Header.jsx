import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { haptics } from '../../lib/haptics';

export const Header = ({ onMenuClick }) => {
  const { user } = useApp();
  const profile = user?.profile;
  const initial = profile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

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

        <h1 className="text-lg font-semibold text-surface-900 dark:text-white">ClassCost</h1>

        <div className="flex items-center gap-2">
          <button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition">
            <Bell className="w-5 h-5 text-surface-700 dark:text-surface-300" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
};
