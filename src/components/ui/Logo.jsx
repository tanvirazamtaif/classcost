import React, { useId } from 'react';

// ClassCost logo — currency-note ribbon shaped as a clear C, capped with
// a scholar's mortarboard, with a universal currency medallion at the
// bottom-right (¤ = international generic currency symbol — neutral so it
// covers BDT, USD, EUR, GBP, INR, CAD, AUD, SAR, AED, MYR without privileging
// any single one).
//
// Elements packed in:
//   1. C       → bold arc that obviously reads as the letter C
//   2. Cap     → black mortarboard tilted on top
//   3. Journey → the ribbon flows from cap (start of school) to currency (cost)
//   4. ¤       → universal currency sign, neutral to any of the 10 currencies
//
// Palette: black, blue (#5b6dff), purple (#a855f7).

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

      {/* Dark rounded backdrop */}
      <rect width="240" height="240" rx="56" fill="#0c0c14" />

      {/* Glow behind the C */}
      <circle
        cx="115" cy="128" r="92"
        fill={`url(#${glowId})`}
        style={animated ? { animation: 'cclogo-breathe 3.2s ease-in-out infinite' } : undefined}
      />

      {/* The C — bold ribbon arc with subtle warmth */}
      <path
        d="M 178 60 C 118 32, 48 78, 48 132 C 48 188, 118 222, 184 196"
        stroke={`url(#${gradId})`}
        strokeWidth="32"
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner highlight along the ribbon centerline (paper-fold feel) */}
      <path
        d="M 178 60 C 118 32, 48 78, 48 132 C 48 188, 118 222, 184 196"
        stroke="#ffffff"
        strokeOpacity="0.16"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Universal currency medallion at the bottom-right end of the C */}
      <circle cx="184" cy="196" r="20" fill="#0c0c14" stroke={`url(#${gradId})`} strokeWidth="3" />
      <text
        x="184" y="204"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="900"
        fontSize="24"
        fill="#ffffff"
      >¤</text>

      {/* Scholar mortarboard sitting on top of the upper C-terminal */}
      <g
        transform="translate(140, 40) rotate(-18)"
        style={animated ? { transformOrigin: '140px 40px', animation: 'cclogo-tilt 4s ease-in-out infinite' } : undefined}
      >
        <ellipse cx="0" cy="7" rx="46" ry="7" fill="#000" />
        <polygon points="-46,0 0,-14 46,0 0,14" fill="#000" />
        <polygon points="-46,0 0,-14 46,0 0,14" fill={`url(#${gradId})`} opacity="0.55" />
        <circle cx="0" cy="0" r="3.5" fill="#5b6dff" />
        <path d="M 0 0 Q 14 24 12 44" stroke="#5b6dff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="12" cy="44" r="4" fill="#a855f7" />
      </g>

      {animated && (
        <style>{`
          @keyframes cclogo-breathe {
            0%, 100% { opacity: 0.7; transform: scale(1); transform-origin: 115px 128px; }
            50%      { opacity: 1;   transform: scale(1.08); transform-origin: 115px 128px; }
          }
          @keyframes cclogo-tilt {
            0%, 100% { transform: translate(140px, 40px) rotate(-18deg); }
            50%      { transform: translate(140px, 40px) rotate(-14deg); }
          }
        `}</style>
      )}
    </svg>
  );
};
