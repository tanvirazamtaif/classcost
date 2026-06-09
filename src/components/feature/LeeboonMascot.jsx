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
 *   expression one of EXPRESSIONS (happy, excited, sleepy, curious, neutral,
 *              angry, sad, crying, dizzy, shy)
 *   facing     'left' | 'right'      (flips the sprite)
 *   moving     'none' | 'horizontal' | 'vertical'  (run / swim)
 *   waving     boolean               (one-shot hand wave)
 *   fallen     boolean               (tipped over — spin recovery)
 *   stretch    number 1..1.4         (drag stretch on the Y axis)
 *   effect     'none'|'hearts'|'tears'|'stars'|'sleep'|'sweat'|'anger'
 *   className
 */

export const EXPRESSIONS = ['happy', 'excited', 'sleepy', 'curious', 'neutral', 'angry', 'sad', 'crying', 'dizzy', 'shy'];

const W = 28, H = 30;
const C = {
  TAN: '#cf9b57', DARK: '#5b3a1c', LIGHT: '#eccfa1',
  NOSE: '#3a2412', EYE: '#241608', HI: '#ffffff', MOUTH: '#5b3a1c',
  CHEEK: '#f6a8a8', BLUSH: '#ff8da6', TEAR: '#7ec8ff', ANGER: '#e2483b', STAR: '#ffd95e',
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

  // nose only (eyes are now an overlay so expressions can reshape them)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!color[y][x]) continue;
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
      if (has(nx, ny) && layer[ny][nx] !== 'body') { layer[y][x] = layer[ny][nx]; break; }
    }
  }
  return { color, layer };
}

const TEDDY = buildTeddy();

// ── Expression overlays (rendered on top, swap with mood) ────────────────────
const MOUTHS = {
  happy:   [[11, 15], [17, 15], [12, 16], [16, 16], [13, 17], [14, 17], [15, 17]],
  excited: [[12, 15], [13, 15], [14, 15], [15, 15], [16, 15], [11, 16], [17, 16], [12, 17], [13, 17], [14, 17], [15, 17], [16, 17]], // big open smile
  sleepy:  [[13, 16], [14, 16], [15, 16]],
  curious: [[13, 16], [14, 15], [15, 16], [14, 17]], // small "o"
  neutral: [[12, 16], [13, 16], [14, 16], [15, 16], [16, 16]],
  angry:   [[12, 16], [13, 16], [14, 16], [15, 16], [16, 16], [11, 17], [17, 17]],
  sad:     [[13, 15], [14, 15], [15, 15], [12, 16], [16, 16], [11, 17], [17, 17]],
  crying:  [[12, 15], [13, 15], [14, 15], [15, 15], [16, 15], [11, 16], [17, 16], [12, 17], [16, 17]], // open wail
  dizzy:   [[11, 16], [12, 15], [13, 16], [14, 15], [15, 16], [16, 15], [17, 16]], // wavy
  shy:     [[12, 16], [13, 16], [14, 16], [15, 16], [16, 16]],
};
const CHEEKS = [[8, 14], [9, 14], [19, 14], [20, 14]];
const BLUSH = [[7, 13], [8, 13], [9, 14], [8, 15], [18, 14], [19, 13], [20, 13], [19, 15]];
const SAD_BROWS = [[10, 8], [11, 9], [17, 9], [18, 8]];
const ANGRY_BROWS = [[9, 8], [10, 9], [11, 9], [16, 9], [17, 9], [18, 8]];
const CURIOUS_BROW = [[16, 7], [17, 7], [18, 7]]; // one raised brow
const ANGER_MARK = [[22, 3], [24, 3], [23, 4], [22, 5], [24, 5]];

// eye centres
const EYES = [[11, 10], [17, 10]];
const px = (x, y, fill, k) => <rect key={k} x={x} y={y} width="1.02" height="1.02" fill={fill} />;

// eye "modes" per expression
const EYE_MODE = {
  happy: 'open', excited: 'wide', sleepy: 'half', curious: 'open', neutral: 'open',
  angry: 'narrow', sad: 'open', crying: 'arc', dizzy: 'spiral', shy: 'arc',
};

function renderEye(cx, cy, mode, parts, idx) {
  // cover region with skin so we can reshape
  if (mode !== 'open' && mode !== 'wide') {
    parts.push(<rect key={`cov${idx}`} x={cx - 1.6} y={cy - 1.8} width="3.2" height="3.2" fill={C.TAN} />);
  }
  if (mode === 'open' || mode === 'wide' || mode === 'narrow') {
    const r = mode === 'wide' ? 1.5 : mode === 'narrow' ? 1.0 : 1.3;
    parts.push(<circle key={`e${idx}`} cx={cx} cy={cy} r={r} fill={C.EYE} />);
    parts.push(<circle key={`hi${idx}`} cx={cx - 0.5} cy={cy - 0.5} r={mode === 'wide' ? 0.6 : 0.45} fill={C.HI} />);
    if (mode === 'wide') parts.push(<circle key={`sp${idx}`} cx={cx + 0.5} cy={cy + 0.4} r={0.3} fill={C.HI} />);
  } else if (mode === 'half') {
    parts.push(<rect key={`h${idx}`} x={cx - 1.2} y={cy} width="2.4" height="0.85" fill={C.EYE} rx="0.4" />);
  } else if (mode === 'arc') { // happy/closed "^" (or crying squint)
    parts.push(<path key={`a${idx}`} d={`M ${cx - 1.3} ${cy + 0.6} Q ${cx} ${cy - 1.1} ${cx + 1.3} ${cy + 0.6}`} stroke={C.EYE} strokeWidth="0.7" fill="none" strokeLinecap="round" />);
  } else if (mode === 'spiral') {
    parts.push(
      <g key={`s${idx}`} className="lb-spiral" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <path d={`M ${cx} ${cy} m -1.2 0 a 1.2 1.2 0 1 1 0.9 1.05`} stroke={C.EYE} strokeWidth="0.55" fill="none" strokeLinecap="round" />
      </g>
    );
  }
}

export function LeeboonMascot({
  size = 32, animated = false, expression = 'happy', facing = 'right',
  moving = 'none', waving = false, fallen = false, stretch = 1, effect = 'none',
  blush = 0, tilt = 0, bounce = false, count = 3, className = '',
}) {
  const exp = EXPRESSIONS.includes(expression) ? expression : 'happy';
  const groups = { body: [], aL: [], aR: [], lL: [], lR: [] };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fill = TEDDY.color[y][x];
    if (!fill) continue;
    const lyr = TEDDY.layer[y][x];
    (groups[lyr] || groups.body).push(px(x, y, fill, `${x}-${y}`));
  }

  // eyes (overlay so expressions can reshape them)
  const eyes = [];
  const mode = EYE_MODE[exp] || 'open';
  EYES.forEach(([cx, cy], i) => renderEye(cx, cy, mode, eyes, i));

  // face overlay (mouth + brows + cheeks/blush + tears)
  const face = [];
  (MOUTHS[exp] || MOUTHS.happy).forEach(([x, y], i) => face.push(px(x, y, C.MOUTH, `m${i}`)));
  if (exp === 'happy') CHEEKS.forEach(([x, y], i) => face.push(px(x, y, C.CHEEK, `c${i}`)));
  // Blush as a smooth-fading group (driven by expression OR the `blush` prop for hover affection).
  const blushLevel = Math.max(Number(blush) || 0, (exp === 'excited' || exp === 'shy') ? 2 : 0);
  face.push(
    <g key="blushg" style={{ opacity: blushLevel >= 2 ? 1 : blushLevel >= 1 ? 0.5 : 0, transition: 'opacity .35s ease' }}>
      {BLUSH.map(([x, y], i) => px(x, y, C.BLUSH, `blg${i}`))}
    </g>,
  );
  if (exp === 'sad') SAD_BROWS.forEach(([x, y], i) => face.push(px(x, y, C.DARK, `b${i}`)));
  if (exp === 'angry') { ANGRY_BROWS.forEach(([x, y], i) => face.push(px(x, y, C.DARK, `ab${i}`))); ANGER_MARK.forEach(([x, y], i) => face.push(px(x, y, C.ANGER, `am${i}`))); }
  if (exp === 'curious') CURIOUS_BROW.forEach(([x, y], i) => face.push(px(x, y, C.DARK, `cb${i}`)));
  if (exp === 'sad' || exp === 'crying') {
    face.push(px(10, 12, C.TEAR, 't1'));
    if (exp === 'crying') { face.push(px(10, 13, C.TEAR, 't2')); face.push(px(18, 12, C.TEAR, 't3')); face.push(px(18, 13, C.TEAR, 't4')); }
  }

  const rootCls = [
    'lb-wrap', className,
    animated ? 'lb-anim' : '',
    moving === 'horizontal' ? 'lb-run' : moving === 'vertical' ? 'lb-swim' : 'lb-idle',
    waving ? 'lb-wave' : '',
    fallen ? 'lb-fallen' : '',
    exp === 'dizzy' ? 'lb-dizzy' : '',
    (exp === 'excited' || bounce) ? 'lb-bounce' : '',
  ].filter(Boolean).join(' ');

  const h = (size * H) / W;

  // floating particle effect layer (cute + lightweight)
  const EFFECT_EMOJI = { hearts: '❤️', tears: '💧', stars: '⭐', sleep: '💤', sweat: '💦', anger: '💢' };
  const n = Math.max(1, Math.min(6, Number(count) || 3));
  const particles = effect && effect !== 'none'
    ? Array.from({ length: n }, (_, i) => (
        <span key={i} className={`lb-particle lb-particle-${i % 3}`}
          style={{ position: 'absolute', left: `${50 + (i - (n - 1) / 2) * 22}%`, top: '2%', fontSize: size * 0.4, transform: 'translateX(-50%)' }}>
          {EFFECT_EMOJI[effect] || '✨'}
        </span>
      ))
    : null;

  return (
    <span className={rootCls} style={{ position: 'relative', display: 'inline-flex', width: size, height: h, lineHeight: 0, transform: tilt ? `rotate(${tilt}deg)` : 'none', transformOrigin: 'center bottom', transition: 'transform .3s ease' }} aria-hidden="true">
      <style>{`
        .lb-anim .lb-sprite,.lb-anim .lb-aL,.lb-anim .lb-aR,.lb-anim .lb-lL,.lb-anim .lb-lR,.lb-anim .lb-eyes{ transform-box: fill-box; }
        .lb-sprite{ transform-origin: 50% 100%; transition: transform .25s ease; }
        .lb-aL,.lb-aR,.lb-lL,.lb-lR{ transform-origin: 50% 0%; }
        .lb-eyes{ transform-origin: 50% 50%; }
        .lb-spiral{ animation: lbSpin 1s linear infinite; }

        @keyframes lbPlay  { 0%,16%,100%{ transform: rotate(0deg);} 4%{ transform: rotate(-5deg);} 9%{ transform: rotate(4deg);} 13%{ transform: rotate(-2deg);} }
        @keyframes lbBlink { 0%,92%,100%{ transform: scaleY(1);} 96%{ transform: scaleY(0.08);} }
        @keyframes lbStep  { 0%{ transform: rotate(22deg);} 50%{ transform: rotate(-22deg);} 100%{ transform: rotate(22deg);} }
        @keyframes lbFlutter{ 0%{ transform: rotate(-15deg);} 50%{ transform: rotate(15deg);} 100%{ transform: rotate(-15deg);} }
        @keyframes lbWaveOnce{ 0%{ transform: rotate(0deg);} 12%{ transform: rotate(-58deg);} 28%{ transform: rotate(-34deg);} 44%{ transform: rotate(-58deg);} 60%{ transform: rotate(-34deg);} 100%{ transform: rotate(0deg);} }
        @keyframes lbSpin  { to { transform: rotate(360deg);} }
        @keyframes lbWobble{ 0%,100%{ transform: rotate(-7deg);} 50%{ transform: rotate(7deg);} }
        @keyframes lbBounce{ 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-9%);} }
        @keyframes lbFloat { 0%{ transform: translateY(0) scale(.6); opacity:0;} 20%{ opacity:1;} 100%{ transform: translateY(-150%) scale(1); opacity:0;} }

        .lb-anim.lb-idle .lb-sprite { animation: lbPlay 20s ease-in-out infinite; }
        .lb-anim .lb-eyes { animation: lbBlink 4.2s ease-in-out infinite; }
        .lb-anim.lb-run .lb-lL { animation: lbStep .42s ease-in-out infinite; }
        .lb-anim.lb-run .lb-lR { animation: lbStep .42s ease-in-out infinite; animation-delay: -.21s; }
        .lb-anim.lb-run .lb-aL { animation: lbStep .42s ease-in-out infinite; animation-delay: -.21s; }
        .lb-anim.lb-run .lb-aR { animation: lbStep .42s ease-in-out infinite; }
        .lb-anim.lb-swim .lb-aL,.lb-anim.lb-swim .lb-lR { animation: lbFlutter .7s ease-in-out infinite; }
        .lb-anim.lb-swim .lb-aR,.lb-anim.lb-swim .lb-lL { animation: lbFlutter .7s ease-in-out infinite; animation-delay: -.35s; }
        .lb-anim.lb-wave .lb-aR { animation: lbWaveOnce 1.6s ease-in-out; }
        .lb-dizzy .lb-sprite { animation: lbWobble .5s ease-in-out infinite !important; }
        .lb-bounce .lb-sprite { animation: lbBounce .5s ease-in-out infinite !important; }

        .lb-particle{ animation: lbFloat 1.6s ease-out infinite; pointer-events:none; }
        .lb-particle-1{ animation-delay: .4s; } .lb-particle-2{ animation-delay: .8s; }

        @media (prefers-reduced-motion: reduce){ .lb-anim *, .lb-particle{ animation: none !important; } }
      `}</style>
      <svg viewBox={`0 0 ${W} ${H}`} width={size} height={h}
        shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.22))',
          transform: `${facing === 'left' ? 'scaleX(-1) ' : ''}${fallen ? 'rotate(82deg) ' : ''}scaleY(${stretch})`,
          transformOrigin: 'center bottom',
        }}>
        <g className="lb-sprite">
          <g>{groups.body}</g>
          <g className="lb-aL">{groups.aL}</g>
          <g className="lb-aR">{groups.aR}</g>
          <g className="lb-lL">{groups.lL}</g>
          <g className="lb-lR">{groups.lR}</g>
          <g className="lb-eyes">{eyes}</g>
          <g>{face}</g>
        </g>
      </svg>
      {particles}
    </span>
  );
}

export default LeeboonMascot;
