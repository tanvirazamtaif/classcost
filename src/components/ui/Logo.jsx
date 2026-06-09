import React from 'react';

// ClassCost logo — a cream calligraphic "C" / winding path (cradle-to-career),
// set on a deep-navy rounded square. Flat two-tone brand mark, used app-wide.
// Update this one file (+ public/favicon.svg) to change the logo everywhere.
const NAVY = '#191C4B';
const CREAM = '#F7F3E8';
// Single closed outline: top tip → outer-left belly → bottom tip → inner edge w/ top hook → back to tip.
const MARK = 'M123 46 C92 60 60 94 60 132 C57 170 102 198 162 212 C128 196 108 168 112 142 C118 110 128 96 148 90 C166 82 166 62 154 56 C144 48 132 46 123 46 Z';

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
