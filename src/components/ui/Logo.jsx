import React from 'react';

// ClassCost logo — a cream calligraphic "C" / winding path (cradle-to-career),
// set on a deep-navy rounded square. Flat two-tone brand mark, used app-wide.
// Update this one file (+ public/favicon.svg) to change the logo everywhere.
const NAVY = '#191C4B';
const CREAM = '#F7F3E8';
// Single closed outline: top tip → outer-left belly → bottom tip → inner edge w/ top hook → back to tip.
const MARK = 'M125 46 C92 60 60 92 56 130 C53 168 100 194 150 200 C118 188 104 166 110 140 C118 108 126 96 146 90 C170 84 172 64 156 58 C146 48 134 46 125 46 Z';

export const Logo = ({ size = 28, animated = false, className = '', bg = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 240 240"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="ClassCost"
    style={animated ? { animation: 'cclogo-breathe 3.4s ease-in-out infinite', transformOrigin: 'center' } : undefined}
  >
    {bg && <rect width="240" height="240" rx="54" fill={NAVY} />}
    <path d={MARK} fill={CREAM} />
    {animated && <style>{`@keyframes cclogo-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>}
  </svg>
);

export default Logo;
