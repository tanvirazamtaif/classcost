import React, { useId } from 'react';

export const LoadingSpinner = ({ size = 64, message = 'Loading...' }) => {
  const id = useId();
  const gradId = `spinner-grad-${id}`;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'loading-hue-glow 3s ease-in-out infinite' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="40%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="28" fill="#0c0c14" />
        {/* Dim arc — static */}
        <path
          d="M80,34 A32,32 0 1,0 80,86"
          stroke={`url(#${gradId})`}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          opacity=".25"
        />
        {/* Orbiting dots */}
        <circle
          r="5"
          fill="#3b82f6"
          style={{ animation: 'loading-orbit-top 2.5s ease-in-out infinite' }}
        />
        <circle
          r="5"
          fill="#a855f7"
          style={{ animation: 'loading-orbit-bot 2.5s ease-in-out infinite' }}
        />
      </svg>
      {message && (
        <span className="text-xs text-zinc-500">{message}</span>
      )}
    </div>
  );
};
