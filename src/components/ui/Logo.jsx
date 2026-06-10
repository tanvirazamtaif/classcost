import React from 'react';

// ClassCost logo — the real brand mark (cream "C" / winding path on navy),
// served from public/classcost-logo.png. To change the logo, replace that file
// and re-run scripts/gen-icons.cjs. Used across v1 + v2.
export const Logo = ({ size = 28, animated = false, className = '' }) => (
  <span className={className} style={{ display: 'inline-flex', width: size, height: size, lineHeight: 0, flex: 'none' }}>
    <img
      src="/classcost-logo.png"
      width={size}
      height={size}
      alt="ClassCost"
      draggable={false}
      style={{
        width: size, height: size, display: 'block', objectFit: 'cover', boxSizing: 'border-box',
        borderRadius: '50%',
        border: `${Math.max(1, Math.round(size * 0.02))}px solid #FFFFFF`,
        filter: 'brightness(1.06)',
        animation: animated ? 'cclogo-breathe 3.4s ease-in-out infinite' : undefined,
        transformOrigin: 'center',
      }}
    />
    {animated && <style>{`@keyframes cclogo-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}`}</style>}
  </span>
);

export default Logo;
