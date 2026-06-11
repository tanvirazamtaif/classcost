// ClassCost v2 — Leeboon: a free-roaming, expressive, draggable teddy (no circle).
// Outer behavior inherited from v1's AssistantWidget: pet brain (friendship),
// hover affection, Talking-Tom ignore ladder, tap-to-pet, fling→dizzy/fall.
// Chat brain: real Claude via the server (/api/assistant/agent) with a client fallback.
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeeboonMascot } from '../components/feature/LeeboonMascot';
import { loadBrain, onPet, onHit, onTalk, onIgnore, onHover } from '../lib/leboonBrain';
import { haptics } from '../lib/haptics';
import { useV2 } from './store';
import { fmt } from './engine';
import { interpret } from './leeboonBrain';

const SPRITE_W = 52;
const SPRITE_H = Math.round((SPRITE_W * 30) / 28);
const TOP_MIN = 96;
const EDGE = 18;       // consistent gap from every viewport edge
const PANEL = 240;     // desktop sidebar/rail width — keep the mascot clear of them
const BOTTOM_GAP = 96; // clearance above the bottom nav / footer
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// keep the mascot fully on-screen — and within the content band (clear of the side rails) on desktop
const bounds = () => {
  const w = window.innerWidth, h = window.innerHeight;
  const pad = w >= 1024 ? PANEL : 0;
  return {
    w, h,
    minLeft: pad + EDGE,
    maxLeft: Math.max(pad + EDGE, w - SPRITE_W - pad - EDGE),
    minTop: TOP_MIN,
    maxTop: Math.max(TOP_MIN, h - SPRITE_H - BOTTOM_GAP),
  };
};
const clampPos = ({ top, left }) => {
  const b = bounds();
  return { top: clamp(top, b.minTop, b.maxTop), left: clamp(left, b.minLeft, b.maxLeft) };
};

// Map the server's (v1-shaped) tool proposals onto v2 store actions. Returns {text, confirm?}.
const SRV_CAT = { canteen: ['Food', '🍔'], transport: ['Transport', '🚌'], books: ['Books', '📚'], education: ['Education', '🎓'], hostel: ['Rent', '🏠'], uniform: ['Uniform', '👕'], health: ['Health', '💊'], other: ['Others', '📦'] };
const catFromServer = (c) => SRV_CAT[c] || ['Others', '📦'];
function mapAction(action, lead, ctx) {
  const { name, input = {} } = action || {};
  if (name === 'add_expense') {
    const amount = Math.max(0, Number(input.amount) || 0);
    const [catName, icon] = catFromServer(input.category);
    const sector = ctx.personalSpace();
    return { text: `${lead ? lead + ' ' : ''}Add ${ctx.fmt(amount)} ${catName}${input.note ? ` (${input.note})` : ''} under ${sector?.name || 'Personal'}?`, confirm: { label: `Add ${ctx.fmt(amount)} ${catName}`, run: () => sector && ctx.logDaily(catName, icon, sector.id, amount) } };
  }
  if (name === 'create_reminder') {
    const amount = Math.max(0, Number(input.amount) || 0);
    const day = Math.min(28, Math.max(1, Number(input.due_day) || 1));
    const sector = ctx.personalSpace();
    return { text: `${lead ? lead + ' ' : ''}Set a monthly reminder "${input.name || 'Reminder'}" of ${ctx.fmt(amount)} on day ${day}?`, confirm: { label: 'Add reminder', run: () => sector && ctx.addRecurring(sector.id, input.name || 'Reminder', amount, day) } };
  }
  return { text: lead || "I can guide you, but I can't make that exact change yet — open the relevant space to do it." };
}
async function serverBrain(text, priorMsgs, store, ctx) {
  const history = (priorMsgs || []).slice(-10).map((m) => ({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text }));
  const snapshot = { spaces: (store.db && store.db.spaces) || store.spaces || [] };
  const r = await fetch('/api/assistant/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history, snapshot }) });
  if (!r.ok) throw new Error('assistant unavailable');
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  if (data.type === 'action' && data.action) return mapAction(data.action, data.text, ctx);
  if (data.type === 'text' || data.reply) return { text: data.text || data.reply };
  throw new Error('unrecognized response');
}

export function Leeboon({ nav, d, news, inFeed }) {
  const store = useV2();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(null);
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  // ── mascot outer behavior (ported from v1 AssistantWidget) ──
  const wanderPaused = useRef(false);
  const dragInfo = useRef({ moved: false });
  const movingRef = useRef('none');
  const moodRef = useRef('happy');
  const sadTimer = useRef(null), angryTimer = useRef(null), moveTimer = useRef(null), waveTimer = useRef(null);
  const brain = useRef(loadBrain());
  const fxTimer = useRef(null);
  const hoverRef = useRef({ timers: [], lastFullTs: 0 });
  const ignoreTimers = useRef([]);
  const tapRef = useRef({ n: 0, ts: 0, openT: null, recoverT: null });
  const spinRef = useRef({ vmax: 0 });
  const posRef = useRef(
    typeof window !== 'undefined'
      ? clampPos({ top: window.innerHeight - 200, left: window.innerWidth - SPRITE_W - EDGE })
      : { top: 520, left: 320 },
  );
  const [pos, setPosState] = useState(posRef.current);
  const [dragging, setDragging] = useState(false);
  const [facing, setFacing] = useState('left');
  const [moving, setMoving] = useState('none');
  const [waving, setWaving] = useState(false);
  const [mood, setMood] = useState('happy');
  const [fx, setFx] = useState(null);     // transient reaction: { mood, effect, fallen, bubble }
  const [hover, setHover] = useState(null); // hover affection: { mood, blush, count, tilt, bounce, bubble }
  const setPos = (p) => { posRef.current = p; setPosState(p); };
  const setMove = (m) => { movingRef.current = m; setMoving(m); };
  const applyMood = (m) => { moodRef.current = m; setMood(m); };

  const react = (opts, ms = 1800) => { clearTimeout(fxTimer.current); setFx(opts); fxTimer.current = setTimeout(() => setFx(null), ms); };
  const PET_LINES = ['Hehe!', 'I like that!', "You're nice 💛", 'Boop!'];
  const HIT_LINES = ['Ouch!', 'Stop!', 'That hurts!'];

  // talk/touch → happy, then drifts through the ignore ladder if left alone:
  // 1m curious · 3m sad · 5m angry · 10m sit · 15m sleep.
  const interact = () => {
    applyMood('happy');
    ignoreTimers.current.forEach(clearTimeout);
    const ig = (m) => { brain.current = onIgnore(brain.current); applyMood(m); };
    ignoreTimers.current = [
      setTimeout(() => applyMood('curious'), 60000),
      setTimeout(() => ig('sad'), 180000),
      setTimeout(() => ig('angry'), 300000),
      setTimeout(() => ig('sleepy'), 600000),
      setTimeout(() => ig('sleepy'), 900000),
    ];
  };
  const pet = () => {
    brain.current = onPet(brain.current);
    interact();
    react({ mood: brain.current.friendship > 65 ? 'shy' : 'happy', effect: 'hearts', bubble: PET_LINES[brain.current.todayPets % PET_LINES.length] }, 1500);
  };
  const dizzy = (hard) => {
    brain.current = onHit(brain.current);
    react({ mood: 'dizzy', effect: 'sweat', bubble: HIT_LINES[brain.current.todayHits % HIT_LINES.length], fallen: hard }, hard ? 2600 : 1600);
    if (hard) { clearTimeout(tapRef.current.recoverT); tapRef.current.recoverT = setTimeout(() => { interact(); }, 2600); }
  };
  const HOVER_LINES = ['Hi! 💜', 'Hehe~', 'You noticed me!', "I'm happy you're here!"];
  const startHover = (clientX) => {
    if (dragging) return;
    wanderPaused.current = true;
    if (typeof clientX === 'number') setFacing(clientX < posRef.current.left + SPRITE_W / 2 ? 'left' : 'right');
    if (['sad', 'angry', 'crying', 'sleepy'].includes(moodRef.current)) applyMood('happy');
    const now = Date.now();
    const f = brain.current.friendship || 0;
    const fast = f >= 65;
    hoverRef.current.timers.forEach(clearTimeout);
    if (now - hoverRef.current.lastFullTs < 5000) { setHover({ mood: 'happy', blush: 1, count: 1, tilt: 0, bounce: true, bubble: '' }); return; }
    hoverRef.current.lastFullTs = now;
    brain.current = onHover(brain.current);
    setHover({ mood: 'happy', blush: 1, count: 1, tilt: 0, bounce: true, bubble: HOVER_LINES[(f | 0) % HOVER_LINES.length] });
    hoverRef.current.timers = [
      setTimeout(() => setHover((hv) => (hv ? { ...hv, mood: 'shy', blush: 2, count: fast ? 4 : 3, tilt: -6, bubble: '' } : hv)), fast ? 900 : 1500),
      setTimeout(() => setHover((hv) => (hv ? { ...hv, mood: 'excited', blush: 2, count: fast ? 5 : 3, tilt: 0 } : hv)), fast ? 2200 : 3000),
    ];
  };
  const endHover = () => { hoverRef.current.timers.forEach(clearTimeout); setHover(null); if (!dragging) wanderPaused.current = false; };
  const triggerWave = () => { if (movingRef.current !== 'none' || moodRef.current !== 'happy') return; setWaving(true); clearTimeout(waveTimer.current); waveTimer.current = setTimeout(() => setWaving(false), 2300); };
  const goTo = (top, left) => {
    const prev = posRef.current, dx = left - prev.left, dy = top - prev.top;
    if (Math.abs(dx) >= 18 && Math.abs(dx) >= Math.abs(dy)) { setFacing(dx < 0 ? 'left' : 'right'); setMove('horizontal'); }
    else if (Math.abs(dy) >= 18) setMove('vertical');
    setPos({ top, left });
    clearTimeout(moveTimer.current);
    moveTimer.current = setTimeout(() => setMove('none'), 2300);
  };

  useEffect(() => {
    if (open) return;
    const roam = () => {
      if (wanderPaused.current || dragging) return;
      const b = bounds();
      const p = clampPos({ top: b.minTop + Math.random() * (b.maxTop - b.minTop), left: Math.random() < 0.5 ? b.minLeft : b.maxLeft });
      goTo(p.top, p.left);
    };
    const id = setInterval(roam, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dragging]);
  useEffect(() => {
    if (open) return;
    const id = setInterval(triggerWave, 30000);
    const kick = setTimeout(triggerWave, 2500);
    return () => { clearInterval(id); clearTimeout(kick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => { interact(); return () => { [sadTimer, angryTimer, moveTimer, waveTimer, fxTimer].forEach((t) => clearTimeout(t.current)); ignoreTimers.current.forEach(clearTimeout); }; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // ── feed news → full hype mode: perch right beside the Feed tab and wave at it ──
  const newsCount = (news?.dm || 0) + (news?.other || 0);
  const hypeTick = useRef(0);
  const [hype, setHype] = useState(null); // persistent bubble while pointing at the Feed tab
  useEffect(() => {
    if (open) return undefined;
    if (!newsCount || inFeed) { setHype(null); wanderPaused.current = false; return undefined; }
    wanderPaused.current = true;
    const NEWS_LINES = { dm: 'you got a message!! ✉️', like: 'someone liked your post!! ❤️', comment: 'new comment on your post!! 💬', follow: 'new follower!! 🎉', follow_post: 'fresh post from your people!! ✨' };
    const excite = () => {
      const w = window.innerWidth, hh = window.innerHeight;
      const p = w >= 1024
        ? { top: 218, left: 244 } // hugging the sidebar Feed item
        : { top: hh - 52 - SPRITE_H - 4, left: Math.round(w / 2 - SPRITE_W / 2) }; // perched on the Feed tab
      goTo(clamp(p.top, TOP_MIN, hh - SPRITE_H - 8), clamp(p.left, 8, w - SPRITE_W - 8));
      setFacing('left');
      applyMood('excited');
      const main = NEWS_LINES[news?.latest?.type] || 'something happened in the feed!!';
      setHype(hypeTick.current % 2 === 0 ? main : 'tap the Feed!!');
      hypeTick.current += 1;
      setWaving(true); clearTimeout(waveTimer.current); waveTimer.current = setTimeout(() => setWaving(false), 2300); // the arm does the pointing
    };
    excite();
    const id = setInterval(excite, 8000);
    return () => { clearInterval(id); setHype(null); wanderPaused.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsCount, inFeed, open, news?.latest?.type]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, pending, thinking, open]);
  // re-clamp into the viewport on resize / orientation change so the mascot never ends up off-screen or over a rail
  useEffect(() => {
    const onResize = () => setPos(clampPos(posRef.current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── drag (legs run/swim with direction) + fling→dizzy ──
  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    dragInfo.current = { moved: false, sx: e.clientX, sy: e.clientY, ox: e.clientX - rect.left, oy: e.clientY - rect.top, lx: e.clientX, ly: e.clientY };
    wanderPaused.current = true; setDragging(true); interact();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const di = dragInfo.current;
    if (Math.hypot(e.clientX - di.sx, e.clientY - di.sy) > 6) di.moved = true;
    const ddx = e.clientX - di.lx, ddy = e.clientY - di.ly;
    spinRef.current.vmax = Math.max(spinRef.current.vmax, Math.hypot(ddx, ddy));
    if (Math.abs(ddx) > 2 || Math.abs(ddy) > 2) { if (Math.abs(ddx) >= Math.abs(ddy)) { setFacing(ddx < 0 ? 'left' : 'right'); setMove('horizontal'); } else setMove('vertical'); interact(); }
    di.lx = e.clientX; di.ly = e.clientY;
    const w = window.innerWidth, h = window.innerHeight;
    setPos({ left: clamp(e.clientX - di.ox, EDGE, w - SPRITE_W - EDGE), top: clamp(e.clientY - di.oy, EDGE, h - SPRITE_H - EDGE) });
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false); wanderPaused.current = false; setMove('none');
    if (dragInfo.current.moved) { const b = bounds(), p = posRef.current; setPos(clampPos({ left: (p.left + SPRITE_W / 2) < b.w / 2 ? b.minLeft : b.maxLeft, top: p.top })); }
    const v = spinRef.current.vmax; spinRef.current.vmax = 0;
    if (dragInfo.current.moved && v > 60) dizzy(true);
    else if (dragInfo.current.moved && v > 32) dizzy(false);
  };
  const onLeeboonClick = () => {
    if (dragInfo.current.moved) { dragInfo.current.moved = false; return; }
    const t = tapRef.current; const now = Date.now();
    t.n = (now - t.ts < 450) ? t.n + 1 : 1; t.ts = now;
    clearTimeout(t.openT);
    haptics.light?.();
    pet(); // every tap is an affectionate pet (hearts)
    if (t.n >= 3) { dizzy(false); return; } // lots of fast pokes → "Stop!"
    t.openT = setTimeout(() => {
      if (tapRef.current.n >= 2) return; // more taps came → was petting, not "open"
      brain.current = onTalk(brain.current);
      haptics.medium?.();
      openChat();
    }, 320);
  };
  const helloRight = (pos.left + SPRITE_W / 2) > (typeof window !== 'undefined' ? window.innerWidth / 2 : 99999);

  // ── chat ──
  const ctx = {
    spaces: store.topSpaces(), personalSpace: store.personalSpace, spaceById: store.spaceById,
    summary: store.summary, categoryTotals: store.categoryTotals, fmt,
    nav: (v, p) => { nav(v, p); setOpen(false); },
    logDaily: store.logDaily, createInstitute: store.createInstitute, addRecurring: store.addRecurring,
  };
  const openChat = () => {
    setOpen(true);
    if (msgs.length === 0) setMsgs([{ who: 'bot', text: "Hiii, I'm Leeboon 🐥 — tell me what you spent, what to create, or where to go." }]);
    if ((news?.dm || 0) + (news?.other || 0) > 0) {
      const actions = [
        ...(news.dm > 0 ? [{ label: `💬 ${news.dm} new message${news.dm > 1 ? 's' : ''} — open chats`, go: () => ctx.nav('feed', { sub: 'messages' }) }] : []),
        ...(news.other > 0 ? [{ label: `❤️ ${news.other} like${news.other > 1 ? 's' : ''}/comment${news.other > 1 ? 's' : ''} & more — see them`, go: () => ctx.nav('feed', { sub: 'notifications' }) }] : []),
      ];
      setMsgs((m) => (m[m.length - 1]?.actions ? m : [...m, { who: 'bot', text: 'AAAH big news!! 🎉 look look:', actions }]));
    }
  };
  const send = async () => {
    const text = input.trim(); if (!text) return;
    const prior = msgs;
    setInput(''); setPending(null); interact();
    setMsgs((m) => [...m, { who: 'me', text }]);
    setThinking(true);
    let res;
    try { res = await serverBrain(text, prior, store, ctx); }
    catch { res = interpret(text, ctx); }
    setThinking(false);
    setMsgs((m) => [...m, { who: 'bot', text: res.text }]);
    if (res.confirm) setPending(res.confirm);
  };
  const confirm = () => { if (!pending) return; let ok = true; try { pending.run(); } catch { ok = false; } setMsgs((m) => [...m, { who: 'bot', text: ok ? 'Done ✓' : "Hmm, that didn't work." }]); setPending(null); };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ scale: { type: 'spring', stiffness: 400, damping: 25 }, opacity: { duration: 0.2 } }}
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.94 }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
            onHoverStart={(e) => startHover(e?.clientX)} onHoverEnd={endHover}
            onMouseMove={(e) => { if (hover && !dragging) setFacing(e.clientX < posRef.current.left + SPRITE_W / 2 ? 'left' : 'right'); }}
            onClick={onLeeboonClick}
            aria-label="Play with Leeboon — drag to move"
            className={`fixed z-50 flex items-center justify-center bg-transparent border-0 p-0 touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${dragging ? '' : 'transition-[top,left] duration-[2200ms] ease-in-out'}`}
            style={{ top: pos.top, left: pos.left, width: SPRITE_W }}
          >
            <AnimatePresence>
              {(waving || fx?.bubble || hover?.bubble || hype) && (
                <motion.span
                  key={hover?.bubble || fx?.bubble || hype || 'hi'}
                  initial={{ opacity: 0, y: 8, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  className={`absolute ${helloRight ? 'right-0' : 'left-0'} px-2.5 py-1 rounded-2xl text-[12px] font-bold pointer-events-none shadow-md`}
                  style={{ bottom: 'calc(100% + 7px)', maxWidth: 'min(68vw, 240px)', textAlign: 'center', background: d ? '#1e1e2e' : '#fffaf0', color: d ? '#fde68a' : '#7a4a1e', border: `1px solid ${d ? '#33334a' : '#fde9c8'}` }}
                >
                  {hover?.bubble || fx?.bubble || hype || 'Hi there! 👋'}
                  <span className={`absolute -bottom-1 ${helloRight ? 'right-4' : 'left-4'} w-2.5 h-2.5 rotate-45`} style={{ background: d ? '#1e1e2e' : '#fffaf0' }} />
                </motion.span>
              )}
            </AnimatePresence>
            <LeeboonMascot size={SPRITE_W} animated
              expression={hover?.mood || fx?.mood || mood}
              effect={hover ? 'hearts' : (fx?.effect || (mood === 'sleepy' ? 'sleep' : 'none'))}
              count={hover?.count || 3} blush={hover?.blush || 0} tilt={hover?.tilt || 0} bounce={!!hover?.bounce}
              fallen={!!fx?.fallen} facing={facing} moving={moving} waving={waving && !fx && !hover} />
          </motion.button>
        )}
      </AnimatePresence>

      {open && (
        <div className="v2-backdrop" onClick={() => setOpen(false)}>
          <div className="v2-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center gap-2 mb-1">
              <LeeboonMascot size={28} animated expression="happy" />
              <p className="font-semibold t-hi">Leeboon</p>
              <button className="ml-auto text-[13px] t-mid" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 py-2" style={{ minHeight: 180 }}>
              {msgs.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.who === 'me' ? 'items-end' : 'items-start'}`}>
                  <div className="max-w-[82%] px-3 py-2 rounded-2xl text-[13px] leading-snug" style={m.who === 'me' ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--pill-bg)', color: 'var(--text1)', border: '.5px solid var(--border)' }}>{m.text}</div>
                  {m.actions && (
                    <div className="flex flex-col gap-1.5 mt-1.5 w-full max-w-[82%]">
                      {m.actions.map((a, j) => (
                        <button key={j} className="text-left text-[13px] font-semibold px-3 py-2.5 rounded-xl" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '.5px solid var(--border)' }} onClick={a.go}>{a.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {pending && (
                <div className="card p-3 mt-1">
                  <p className="text-[12px] t-mid mb-2">Confirm?</p>
                  <div className="flex gap-2"><button className="btn btn-primary" onClick={confirm}>{pending.label}</button><button className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button></div>
                </div>
              )}
              {thinking && <div className="flex justify-start"><div className="px-3 py-2 rounded-2xl text-[13px]" style={{ background: 'var(--pill-bg)', color: 'var(--text2)', border: '.5px solid var(--border)' }}>Leeboon is thinking…</div></div>}
              <div ref={endRef} />
            </div>
            <div className="flex gap-2 pt-2">
              <input className="field" placeholder="e.g. spent 200 on lunch" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} autoFocus />
              <button className="minibtn btn-primary" style={{ width: 'auto', padding: '.65rem 1rem' }} onClick={send}>Send</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
