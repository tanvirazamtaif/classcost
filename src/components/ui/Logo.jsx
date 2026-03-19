import React, { useId } from 'react';

export const Logo = ({ size = 28, animated = false, className = '' }) => {
  const id = useId();
  const gradId = `logo-grad-${id}`;

  if (animated) {
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className={className}
        style={{ animation: 'logo-glow 3s ease-in-out infinite' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="40%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="28" fill="#0c0c14" />
        <path d="M80,34 A32,32 0 1,0 80,86" stroke={`url(#${gradId})`} strokeWidth="14" fill="none" strokeLinecap="round" opacity=".25"
          style={{ animation: 'logo-breathe 3s ease-in-out infinite' }} />
        <path d="M80,34 A32,32 0 1,0 80,86" stroke={`url(#${gradId})`} strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray="40 160"
          style={{ animation: 'logo-travel 2.5s linear infinite' }} />
        <circle cx="80" cy="34" r="5" fill="#3b82f6" style={{ animation: 'logo-dot-pulse 3s ease-in-out infinite' }} />
        <circle cx="80" cy="86" r="5" fill="#a855f7" style={{ animation: 'logo-dot-pulse 3s ease-in-out infinite 0.5s' }} />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="40%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill="#0c0c14" />
      <path d="M80,34 A32,32 0 1,0 80,86" stroke={`url(#${gradId})`} strokeWidth="14" fill="none" strokeLinecap="round" />
      <circle cx="80" cy="34" r="5" fill="#3b82f6" />
      <circle cx="80" cy="86" r="5" fill="#a855f7" />
    </svg>
  );
};
