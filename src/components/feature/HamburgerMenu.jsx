import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';

export const HamburgerMenu = () => {
  const { user, navigate, theme, toggleTheme, setUser, addToast } = useApp();
  const d = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const profile = user?.profile;

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleNavigate = (page) => {
    setIsOpen(false);
    navigate(page);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    setUser(null);
    navigate('landing', { replace: true });
    addToast('Signed out', 'info');
  };

  const menuItems = [
    { icon: '🏠', label: 'Home', page: 'dashboard' },
    { icon: '📚', label: 'Semesters', page: 'semester' },
    { icon: '⚙️', label: 'Settings', page: 'settings' },
    { icon: '🎓', label: 'Education Setup', page: 'education-setup', show: !user?.educationProfile?.setupComplete },
    { icon: '📊', label: 'Historical Data', page: 'historical-data' },
    { icon: '💰', label: 'Budget Settings', page: 'budget-settings' },
    { icon: '👤', label: 'Edit Profile', page: 'onboarding' },
  ];

  const profileIncomplete = !user?.profileComplete;

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`relative w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl transition ${d ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
        aria-label="Open menu"
      >
        <span className={`w-5 h-[2px] rounded-full ${d ? 'bg-white' : 'bg-slate-800'}`} />
        <span className={`w-5 h-[2px] rounded-full ${d ? 'bg-white' : 'bg-slate-800'}`} />
        <span className={`w-5 h-[2px] rounded-full ${d ? 'bg-white' : 'bg-slate-800'}`} />
        {profileIncomplete && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Menu */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 sm:w-80 z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${d ? 'bg-slate-900' : 'bg-white'}`}>

        {/* Menu Header */}
        <div className={`p-5 border-b ${d ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`font-bold ${d ? 'text-white' : 'text-slate-900'}`}>Menu</span>
            <button onClick={() => setIsOpen(false)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${d ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>✕</button>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold ${d ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
              {(profile?.fullName || user?.email)?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate text-sm ${d ? 'text-white' : 'text-slate-900'}`}>{profile?.fullName || 'Guest'}</p>
              <p className={`text-xs truncate ${d ? 'text-slate-500' : 'text-slate-400'}`}>{user?.email}</p>
            </div>
          </div>
          {profileIncomplete && (
            <button onClick={() => handleNavigate('onboarding')}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 mt-3 text-left border ${d ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className={`text-xs font-semibold ${d ? 'text-red-400' : 'text-red-700'}`}>Complete your profile</span>
            </button>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {menuItems.filter(item => item.show !== false).map((item, i) => (
            <button
              key={i}
              onClick={() => handleNavigate(item.page)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${d ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              <span className={`text-sm font-medium ${d ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom: Theme + Sign Out */}
        <div className={`p-4 border-t ${d ? 'border-slate-800' : 'border-slate-100'}`}>
          <button onClick={() => { toggleTheme(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${d ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
            <span className="text-lg w-6 text-center">{d ? '☀️' : '🌙'}</span>
            <span className={`text-sm font-medium ${d ? 'text-slate-300' : 'text-slate-700'}`}>{d ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${d ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
          >
            <span className="text-lg w-6 text-center">🚪</span>
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default HamburgerMenu;
