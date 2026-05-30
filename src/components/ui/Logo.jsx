import React, { useId } from 'react';

// ClassCost logo — currency-note ribbon bent into a flowing C, capped with
// a scholar's mortarboard. Single design in 4 "elements":
//   1. C       → the entire ribbon shape reads as the letter C
//   2. Cap     → black mortarboard tilted at the top
//   3. Journey → the flowing curved path (a road from start to graduation)
//   4. ৳       → currency medallion at the start of the journey
//
// Palette is fixed: black, blue (#3b82f6 / #5b6dff), purple (#a855f7).
// The animated variant slowly pulses the glow + drifts the tassel.

export const Logo = ({ size = 28, animated = false, className = '' }) => {
  const id = useId();
  const gradId = `logo-bp-${id}`;
  const glowId = `logo-glow-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ClassCost"
    >
      <defs>
        <linearGradient id={gradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stopColor="#5b6dff" />
          <stop offset="50%"  stopColor="#7a5cff" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="55%">
          <stop offset="0%"   stopColor="#7a5cff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7a5cff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Dark rounded backdrop — keeps the logo self-contained at any size */}
      <rect width="240" height="240" rx="56" fill="#0c0c14" />

      {/* Soft glow behind the ribbon (also the animated breathing layer) */}
      <circle
        cx="120" cy="125" r="86"
        fill={`url(#${glowId})`}
        style={animated ? { animation: 'cclogo-breathe 3.2s ease-in-out infinite' } : undefined}
      />

      {/* The flowing currency-note ribbon, bent into a C */}
      <path
        d="M 162 60
           C 110 50, 78 92, 108 122
           C 138 152, 78 167, 92 196
           C 106 216, 176 216, 200 192"
        stroke={`url(#${gradId})`}
        strokeWidth="28"
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner highlight stripe on the ribbon (gives it the "note paper" feel) */}
      <path
        d="M 162 72
           C 116 64, 90 92, 116 116
           C 142 140, 90 156, 102 184
           C 116 200, 168 204, 192 184"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* ৳ medallion — start of the journey (bottom-right) */}
      <circle cx="200" cy="192" r="16" fill="#0c0c14" stroke={`url(#${gradId})`} strokeWidth="2.5" />
      <text
        x="200" y="200"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="#ffffff"
      >৳</text>

      {/* Scholar mortarboard tilted at the top of the C */}
      <g
        transform="translate(132, 48) rotate(-18)"
        style={animated ? { transformOrigin: '132px 48px', animation: 'cclogo-tilt 4s ease-in-out infinite' } : undefined}
      >
        <ellipse cx="0" cy="7" rx="46" ry="7" fill="#000" />
        <polygon points="-46,0 0,-14 46,0 0,14" fill="#000" />
        <polygon points="-46,0 0,-14 46,0 0,14" fill={`url(#${gradId})`} opacity="0.55" />
        <circle cx="0" cy="0" r="3.5" fill="#5b6dff" />
        <path d="M 0 0 Q 14 24 12 44" stroke="#5b6dff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="12" cy="44" r="4" fill="#a855f7" />
      </g>

      {/* Keyframes for the animated variant — injected once per page */}
      {animated && (
        <style>{`
          @keyframes cclogo-breathe {
            0%, 100% { opacity: 0.7; transform: scale(1); transform-origin: 120px 125px; }
            50%      { opacity: 1;   transform: scale(1.08); transform-origin: 120px 125px; }
          }
          @keyframes cclogo-tilt {
            0%, 100% { transform: translate(132px, 48px) rotate(-18deg); }
            50%      { transform: translate(132px, 48px) rotate(-14deg); }
          }
        `}</style>
      )}
    </svg>
  );
};
