import React from 'react';
import { haptics } from '../../lib/haptics';

// SVG icon paths (16x16 viewBox)
const icons = {
  home: 'M8 1.5L1 7.5V14.5H5.5V10H10.5V14.5H15V7.5L8 1.5Z',
  records: 'M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm1 3h8m-8 3h8m-8 3h5',
  plus: 'M8 3v10M3 8h10',
  reports: 'M3 14V8m4 6V5m4 9V2m4 12V7',
  settings: 'M8 10a2 2 0 100-4 2 2 0 000 4zm6-2a6 6 0 01-.7 2.8l1.1 1.1-1.4 1.4-1.1-1.1A6 6 0 018 14a6 6 0 01-2.8-.7l-1.1 1.1-1.4-1.4 1.1-1.1A6 6 0 012 8a6 6 0 01.7-2.8L1.6 4.1 3 2.7l1.1 1.1A6 6 0 018 2a6 6 0 012.8.7l1.1-1.1 1.4 1.4-1.1 1.1A6 6 0 0114 8z',
};

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'home', label: 'Home' },
  { id: 'reports', icon: 'records', label: 'Records' },
  { id: '_add', icon: 'plus', label: '' },
  { id: 'reports-view', icon: 'reports', label: 'Reports' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

function NavIcon({ name, active, isCenter }) {
  if (isCenter) {
    return (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <path d={icons.plus} />
      </svg>
    );
  }

  const isStroke = name === 'records' || name === 'reports' || name === 'settings';

  return (
    <svg width="20" height="20" viewBox="0 0 16 16"
      fill={isStroke ? 'none' : (active ? '#6366f1' : '#64748b')}
      stroke={isStroke ? (active ? '#6366f1' : '#64748b') : 'none'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name]} />
    </svg>
  );
}

export const BottomNavV3 = React.memo(({ active, navigate, onAddPress }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl safe-area-pb"
      style={{ background: 'rgba(10,10,20,0.95)', borderTop: '0.5px solid #1e1e2e' }}
      role="tablist" aria-label="Main navigation">
      <div className="flex items-end justify-around max-w-[420px] mx-auto py-1.5">
        {NAV_ITEMS.map((item) => {
          const isCenter = item.id === '_add';
          const isActive = active === item.id || (item.id === 'reports-view' && active === 'reports');

          if (isCenter) {
            return (
              <button key={item.id} onClick={() => { haptics.medium(); onAddPress(); }}
                className="flex items-center justify-center rounded-[14px]"
                style={{ width: 44, height: 44, background: '#6366f1' }}
                aria-label="Add payment">
                <NavIcon name="plus" isCenter />
              </button>
            );
          }

          return (
            <button key={item.id}
              onClick={() => { haptics.light(); navigate(item.id === 'reports-view' ? 'reports' : item.id); }}
              role="tab" aria-selected={isActive}
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[52px]">
              <NavIcon name={item.icon} active={isActive} />
              <span className="text-[10px]" style={{ color: isActive ? '#6366f1' : '#64748b' }}>
                {item.label}
              </span>
              {isActive && <div className="w-1 h-1 rounded-full" style={{ background: '#6366f1' }} />}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNavV3.displayName = 'BottomNavV3';
