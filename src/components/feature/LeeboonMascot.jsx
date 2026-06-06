import React from 'react';

/**
 * Leeboon — an expressive retro pixel teddy. 🧸
 *
 * Sampled from smooth shapes onto a 28×30 grid (small pixels, rounded shape),
 * with a 1px stitched outline. Arms & legs are separate animated groups so he
 * can run, swim and wave; each pivots at its own joint via transform-box.
 *
 * Props
 *   size       px width (default 32)
 *   animated   enable idle/blink animations
 *   expression 'happy' | 'sad' | 'neutral'
 *   facing     'left' | 'right'      (flips the sprite)
 *   moving     'none' | 'horizontal' | 'vertical'  (run / swim)
 *   waving     boolean               (one-shot hand wave)
 *   className
 */

const W = 28, H = 30;
const C = {
  TAN: '#cf9b57', DARK: '#5b3a1c', LIGHT: '#eccfa1',
  NOSE: '#3a2412', EYE: '#241608', HI: '#ffffff', MOUTH: '#5b3a1c',
  CHEEK: '#f6a8a8', TEAR: '#7ec8ff', ANGER: '#e2483b',
};
const inC = (x, y, cx, cy, r) => { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; return dx * dx + dy * dy <= r * r; };
const inE = (x, y, cx, cy, rx, ry) => { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; return dx * dx + dy * dy <= 1; };

function buildTeddy() {
  const color = Array.from({ length: H }, () => Array(W).fill(null));
  const layer = Array.from({ length: H }, () => Array(W).fill('body'));

  const head = (x, y) => inC(x, y, 14, 10.5, 8) || inC(x, y, 7.8, 4.2, 2.9) || inC(x, y, 20.2, 4.2, 2.9);
  const torso = (x, y) => inE(x, y, 14, 21, 4.2, 5.4);
  const parts = [
    ['aL', (x, y) => inE(x, y, 6.4, 18.5, 1.5, 4)],   // slim left arm
    ['aR', (x, y) => inE(x, y, 21.6, 18.5, 1.5, 4)],  // slim right arm
    ['lL', (x, y) => inE(x, y, 10.8, 27.4, 2.1, 3)],  // left leg
    ['lR', (x, y) => inE(x, y, 17.2, 27.4, 2.1, 3)],  // right leg
  ];

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (head(x, y) || torso(x, y)) { color[y][x] = C.TAN; continue; }
    for (const [lyr, fn] of parts) if (fn(x, y)) { color[y][x] = C.TAN; layer[y][x] = lyr; break; }
  }

  // light areas (keep limb layer so foot pads move with the legs)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!color[y][x]) continue;
    if (inC(x, y, 7.8, 4.6, 1.4) || inC(x, y, 20.2, 4.6, 1.4)) color[y][x] = C.LIGHT; // inner ears
    if (inE(x, y, 14, 13.5, 3.5, 2.7)) color[y][x] = C.LIGHT;                          // muzzle
    if (inE(x, y, 14, 21.5, 2.6, 3.2)) color[y][x] = C.LIGHT;                          // belly
    if (inC(x, y, 10.8, 28.2, 1.2) || inC(x, y, 17.2, 28.2, 1.2)) color[y][x] = C.LIGHT; // paw pads
  }

  // eyes + nose (constant)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!color[y][x]) continue;
    if (inC(x, y, 11, 10, 1.3) || inC(x, y, 17, 10, 1.3)) { color[y][x] = C.EYE; layer[y][x] = 'eye'; }
    if (inC(x, y, 10.5, 9.5, 0.5) || inC(x, y, 16.5, 9.5, 0.5)) { color[y][x] = C.HI; layer[y][x] = 'eye'; }
    if (inC(x, y, 14, 12.5, 1.1)) color[y][x] = C.NOSE;
  }

  // 1px stitched outline; inherit the limb layer it hugs so it animates too
  const has = (x, y) => x >= 0 && y >= 0 && x < W && y < H && color[y][x];
  const ring = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (color[y][x]) continue;
    if (has(x - 1, y) || has(x + 1, y) || has(x, y - 1) || has(x, y + 1) ||
        has(x - 1, y - 1) || has(x + 1, y - 1) || has(x - 1, y + 1) || has(x + 1, y + 1)) ring.push([x, y]);
  }
  for (const [x, y] of ring) {
    color[y][x] = C.DARK;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (has(nx, ny) && layer[ny][nx] !== 'body' && layer[ny][nx] !== 'eye') { layer[y][x] = layer[ny][nx]; break; }
    }
  }
  return { color, layer };
}

const TEDDY = buildTeddy();

// Expression overlays (rendered on top, swap with mood)
const MOUTHS = {
  happy: [[11, 15], [17, 15], [12, 16], [16, 16], [13, 17], [14, 17], [15, 17]],
  sad: [[13, 15], [14, 15], [15, 15], [12, 16], [16, 16], [11, 17], [17, 17]],
  angry: [[12, 16], [13, 16], [14, 16], [15, 16], [16, 16], [11, 17], [17, 17]],
  neutral: [[12, 16], [13, 16], [14, 16], [15, 16], [16, 16]],
};
const CHEEKS = [[8, 14], [9, 14], [19, 14], [20, 14]];
const SAD_BROWS = [[10, 8], [11, 9], [17, 9], [18, 8]];
const ANGRY_BROWS = [[9, 8], [10, 9], [11, 9], [16, 9], [17, 9], [18, 8]];
const ANGER_MARK = [[22, 3], [24, 3], [23, 4], [22, 5], [24, 5]];
const TEAR = [[10, 12]];

export function LeeboonMascot({ size = 32, animated = false, expression = 'happy', facing = 'right', moving = 'none', waving = false, className = '' }) {
  const groups = { body: [], eye: [], aL: [], aR: [], lL: [], lR: [] };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fill = TEDDY.color[y][x];
    if (!fill) continue;
    const lyr = TEDDY.layer[y][x];
    (groups[lyr] || groups.body).push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={fill} />);
  }

  // mood overlay
  const face = [];
  (MOUTHS[expression] || MOUTHS.happy).forEach(([x, y], i) => face.push(<rect key={`m${i}`} x={x} y={y} width="1.02" height="1.02" fill={C.MOUTH} />));
  if (expression === 'happy') CHEEKS.forEach(([x, y], i) => face.push(<rect key={`c${i}`} x={x} y={y} width="1.02" height="1.02" fill={C.CHEEK} />));
  if (expression === 'sad') {
    SAD_BROWS.forEach(([x, y], i) => face.push(<rect key={`b${i}`} x={x} y={y} width="1.02" height="1.02" fill={C.DARK} />));
    TEAR.forEach(([x, y], i) => face.push(<rect key={`t${i}`} x={x} y={y} width="1.02" height="1.02" fill={C.TEAR} />));
  }
  if (expression === 'angry') {
    ANGRY_BROWS.forEach(([x, y], i) => face.push(<rect key={`ab${i}`} x={x} y={y} width="1.02" height="1.02" fill={C.DARK} />));
    ANGER_MARK.forEach(([x, y], i) => face.push(<rect key={`am${i}`} x={x} y={y} width="1.02" height="1.02" fill={C.ANGER} />));
  }

  const rootCls = [
    'lb-wrap', className,
    animated ? 'lb-anim' : '',
    moving === 'horizontal' ? 'lb-run' : moving === 'vertical' ? 'lb-swim' : 'lb-idle',
    waving ? 'lb-wave' : '',
  ].filter(Boolean).join(' ');

  const h = (size * H) / W;

  return (
    <span className={rootCls} style={{ display: 'inline-flex', width: size, height: h, lineHeight: 0 }} aria-hidden="true">
      <style>{`
        .lb-anim .lb-sprite,.lb-anim .lb-aL,.lb-anim .lb-aR,.lb-anim .lb-lL,.lb-anim .lb-lR,.lb-anim .lb-eyes{ transform-box: fill-box; }
        .lb-sprite{ transform-origin: 50% 100%; }
        .lb-aL,.lb-aR,.lb-lL,.lb-lR{ transform-origin: 50% 0%; }   /* pivot at shoulder / hip */
        .lb-eyes{ transform-origin: 50% 50%; }

        @keyframes lbPlay  { 0%,16%,100%{ transform: rotate(0deg);} 4%{ transform: rotate(-5deg);} 9%{ transform: rotate(4deg);} 13%{ transform: rotate(-2deg);} }
        @keyframes lbBlink { 0%,92%,100%{ transform: scaleY(1);} 96%{ transform: scaleY(0.08);} }
        @keyframes lbStep  { 0%{ transform: rotate(22deg);} 50%{ transform: rotate(-22deg);} 100%{ transform: rotate(22deg);} }
        @keyframes lbFlutter{ 0%{ transform: rotate(-15deg);} 50%{ transform: rotate(15deg);} 100%{ transform: rotate(-15deg);} }
        @keyframes lbWaveOnce{ 0%{ transform: rotate(0deg);} 12%{ transform: rotate(-58deg);} 28%{ transform: rotate(-34deg);} 44%{ transform: rotate(-58deg);} 60%{ transform: rotate(-34deg);} 100%{ transform: rotate(0deg);} }

        .lb-anim.lb-idle .lb-sprite { animation: lbPlay 20s ease-in-out infinite; }
        .lb-anim .lb-eyes { animation: lbBlink 4.2s ease-in-out infinite; }

        .lb-anim.lb-run .lb-lL { animation: lbStep .42s ease-in-out infinite; }
        .lb-anim.lb-run .lb-lR { animation: lbStep .42s ease-in-out infinite; animation-delay: -.21s; }
        .lb-anim.lb-run .lb-aL { animation: lbStep .42s ease-in-out infinite; animation-delay: -.21s; }
        .lb-anim.lb-run .lb-aR { animation: lbStep .42s ease-in-out infinite; }

        .lb-anim.lb-swim .lb-aL,.lb-anim.lb-swim .lb-lR { animation: lbFlutter .7s ease-in-out infinite; }
        .lb-anim.lb-swim .lb-aR,.lb-anim.lb-swim .lb-lL { animation: lbFlutter .7s ease-in-out infinite; animation-delay: -.35s; }

        .lb-anim.lb-wave .lb-aR { animation: lbWaveOnce 1.6s ease-in-out; }

        @media (prefers-reduced-motion: reduce){ .lb-anim *{ animation: none !important; } }
      `}</style>
      <svg viewBox={`0 0 ${W} ${H}`} width={size} height={h}
        shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.22))', transform: facing === 'left' ? 'scaleX(-1)' : 'none', transformOrigin: 'center' }}>
        <g className="lb-sprite">
          <g>{groups.body}</g>
          <g className="lb-aL">{groups.aL}</g>
          <g className="lb-aR">{groups.aR}</g>
          <g className="lb-lL">{groups.lL}</g>
          <g className="lb-lR">{groups.lR}</g>
          <g className="lb-eyes">{groups.eye}</g>
          <g>{face}</g>
        </g>
      </svg>
    </span>
  );
}

export default LeeboonMascot;
