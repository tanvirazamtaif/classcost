import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Check, History, Trash2, ChevronLeft } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useEducationFees } from '../../contexts/EducationFeeContext';
import { askAssistantAgent } from '../../api';
import { haptics } from '../../lib/haptics';
import { makeFmt } from '../../utils/format';
import { ACTIONS, describeAction, getAuditLog, logAction, clearAuditLog } from '../../lib/assistantActions';
import { LeeboonMascot } from './LeeboonMascot';

/**
 * Leeboon — your playful money buddy. 🐣
 *
 * A floating cartoon helper. Understands natural-language commands and
 * questions, then PROPOSES actions. Nothing is written until the user taps
 * Confirm. On confirm, the action runs through the app's own mutators and is
 * recorded in the audit log. Questions are answered from a compact data
 * snapshot sent with each message. Talks to Claude when a key is set on the
 * server; otherwise a built-in stub planner.
 */

const GREETING = {
  kind: 'text', role: 'assistant', greeting: true,
  content:
    "Hiii! I'm Leeboon 🐣 your money buddy. Wanna play? Just tell me what to do and I'll set it up for you to confirm — like \"Add transport expense of 200\", \"Add house rent reminder of 8000 on the 5th\", or ask me \"How much did I spend this month?\"",
};

const SUGGESTIONS = [
  '👋 Say hi to Leeboon',
  'Add transport expense of 200',
  'How much did I spend this month?',
  'Add a coaching reminder of 1500 on the 10th',
];

export function AssistantWidget() {
  const app = useApp();
  const edu = useEducationFees();
  const { theme } = app;
  const d = theme === 'dark';
  const fmt = makeFmt(app.user?.profile?.currency || 'BDT');

  const [open, setOpen] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open]);

  // ── Leeboon: expressive, edge-living, draggable buddy ──────────
  const SPRITE_W = 52;
  const SPRITE_H = Math.round((SPRITE_W * 30) / 28);
  const TOP_MIN = 96;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const wanderPaused = useRef(false);
  const dragInfo = useRef({ moved: false });
  const movingRef = useRef('none');
  const moodRef = useRef('happy');
  const sadTimer = useRef(null);
  const angryTimer = useRef(null);
  const moveTimer = useRef(null);
  const waveTimer = useRef(null);
  const posRef = useRef({
    top: typeof window !== 'undefined' ? window.innerHeight - 200 : 520,
    left: typeof window !== 'undefined' ? window.innerWidth - SPRITE_W - 14 : 320,
  });
  const [pos, setPosState] = useState(posRef.current);
  const [dragging, setDragging] = useState(false);
  const [facing, setFacing] = useState('left');
  const [moving, setMoving] = useState('none');
  const [waving, setWaving] = useState(false);
  const [mood, setMood] = useState('happy');

  const setPos = (p) => { posRef.current = p; setPosState(p); };
  const setMove = (m) => { movingRef.current = m; setMoving(m); };
  const applyMood = (m) => { moodRef.current = m; setMood(m); };

  // USER interaction → happy, then drifts: bored/sad → angry if ignored.
  const interact = () => {
    applyMood('happy');
    clearTimeout(sadTimer.current); clearTimeout(angryTimer.current);
    sadTimer.current = setTimeout(() => applyMood('sad'), 16000);
    angryTimer.current = setTimeout(() => applyMood('angry'), 45000);
  };
  // Wave + say hello — only when standing still AND in a friendly mood.
  const triggerWave = () => {
    if (movingRef.current !== 'none' || moodRef.current !== 'happy') return;
    setWaving(true);
    clearTimeout(waveTimer.current);
    waveTimer.current = setTimeout(() => setWaving(false), 2300);
  };

  // Direction-aware move: horizontal → turn & run, vertical → swim. (His own
  // wandering does NOT cheer him up — only the user can.)
  const goTo = (top, left) => {
    const prev = posRef.current;
    const dx = left - prev.left, dy = top - prev.top;
    if (Math.abs(dx) >= 18 && Math.abs(dx) >= Math.abs(dy)) { setFacing(dx < 0 ? 'left' : 'right'); setMove('horizontal'); }
    else if (Math.abs(dy) >= 18) { setMove('vertical'); }
    setPos({ top, left });
    clearTimeout(moveTimer.current);
    moveTimer.current = setTimeout(() => setMove('none'), 2300); // matches the glide
  };

  // Auto-roam — left/right edges & corners only, ~3×/min.
  useEffect(() => {
    if (open) return;
    const roam = () => {
      if (wanderPaused.current || dragging) return;
      const w = window.innerWidth, h = window.innerHeight, m = 12;
      goTo(clamp(TOP_MIN + Math.random() * (h - SPRITE_H - TOP_MIN - 110), TOP_MIN, h - SPRITE_H - 90),
        Math.random() < 0.5 ? m : w - SPRITE_W - m);
    };
    const id = setInterval(roam, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dragging]);

  // Wave & say hello on a gentle cadence (~2×/min).
  useEffect(() => {
    if (open) return;
    const id = setInterval(triggerWave, 30000);
    const kick = setTimeout(triggerWave, 2500); // greet shortly after load
    return () => { clearInterval(id); clearTimeout(kick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // start the mood clock on mount (he'll drift to sad/angry if left alone)
  useEffect(() => { interact(); return () => [sadTimer, angryTimer, moveTimer, waveTimer].forEach((t) => clearTimeout(t.current)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Drag — follow the finger (legs run/swim with direction); snap to nearest side on release.
  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    dragInfo.current = { moved: false, sx: e.clientX, sy: e.clientY, ox: e.clientX - rect.left, oy: e.clientY - rect.top, lx: e.clientX, ly: e.clientY };
    wanderPaused.current = true;
    setDragging(true);
    interact();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const di = dragInfo.current;
    if (Math.hypot(e.clientX - di.sx, e.clientY - di.sy) > 6) di.moved = true;
    const ddx = e.clientX - di.lx, ddy = e.clientY - di.ly;
    if (Math.abs(ddx) > 2 || Math.abs(ddy) > 2) {
      if (Math.abs(ddx) >= Math.abs(ddy)) { setFacing(ddx < 0 ? 'left' : 'right'); setMove('horizontal'); }
      else setMove('vertical');
      interact();
    }
    di.lx = e.clientX; di.ly = e.clientY;
    const w = window.innerWidth, h = window.innerHeight;
    setPos({ left: clamp(e.clientX - di.ox, 4, w - SPRITE_W - 4), top: clamp(e.clientY - di.oy, 4, h - SPRITE_H - 4) });
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    wanderPaused.current = false;
    setMove('none');
    if (dragInfo.current.moved) {
      const w = window.innerWidth, h = window.innerHeight, m = 12;
      const p = posRef.current;
      setPos({ left: (p.left + SPRITE_W / 2) < w / 2 ? m : w - SPRITE_W - m, top: clamp(p.top, TOP_MIN, h - SPRITE_H - 80) });
    }
  };
  const onLeeboonClick = () => {
    if (dragInfo.current.moved) { dragInfo.current.moved = false; return; } // was a drag, not a tap
    haptics.medium?.();
    interact();
    setOpen(true);
  };

  // ctx + snapshot are rebuilt each send from the latest context data.
  const buildCtx = () => ({
    fmt,
    expenses: app.expenses || [],
    scheduledPayments: app.scheduledPayments || [],
    activeFees: edu.activeFees || [],
    loans: app.loans || [],
    addExpense: app.addExpense,
    editExpense: app.editExpense,
    removeExpense: app.removeExpense,
    addLoan: app.addLoan,
    addScheduledPayment: app.addScheduledPayment,
    updateScheduledPayment: app.updateScheduledPayment,
    deleteScheduledPayment: app.deleteScheduledPayment,
    updateFeeAmount: edu.updateFeeAmount,
    deleteFee: edu.deleteFee,
  });

  const buildSnapshot = (ctx) => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const exp = ctx.expenses;
    const spentThisMonth = exp.filter((e) => String(e.date || '').startsWith(ym)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const spentAllTime = exp.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return {
      currency: app.user?.profile?.currency || 'BDT',
      today: now.toISOString().slice(0, 10),
      totals: { spentThisMonth, spentAllTime, note: 'expenses only (not education fees)' },
      expenses: exp.slice(-25).map((e) => ({ id: e.id, amount: Number(e.amount) || 0, category: e.type, note: e.label || e.details || '', date: e.date })),
      reminders: ctx.scheduledPayments.map((p) => ({ id: p.id, name: p.name, amount: Number(p.amount) || 0, dueDay: p.dueDay, category: p.category || p.type })),
      fees: ctx.activeFees.map((f) => ({ id: f.id, name: f.name || f.label || f.feeType, feeType: f.feeType, amount: f.recurring?.amount ?? f.semester?.totalAmount ?? f.yearly?.amount ?? f.oneTime?.amount ?? f.perClass?.ratePerClass ?? f.amount ?? 0 })),
      loans: ctx.loans.map((l) => ({ id: l.id, person: l.person, amount: Number(l.amount) || 0, type: l.type })),
    };
  };

  const historyFor = (msgs) =>
    msgs
      .filter((m) => !m.greeting && (m.kind === 'text' || m.kind === 'action'))
      .map((m) => ({ role: m.role, content: m.kind === 'action' ? (m.content || `Proposed: ${m.preview?.title || m.action?.name}`) : m.content }))
      .filter((m) => m.content);

  // Leeboon answers casual hellos himself — playful, no backend needed.
  const PLAYFUL_REPLIES = [
    "Yay, you came to play! 🎉 Want me to add an expense, set a reminder, or check your spending?",
    "Heehee hi! 🐣 I'm great with money stuff — try \"Add transport expense of 200\".",
    "Boop! 👋 I'm Leeboon. Tell me a number and what it's for, and I'll handle the boring part.",
  ];
  const isGreeting = (q) =>
    /^(\s*[👋🐣🎉✨]\s*)?(hi+|hey+|hello+|yo+|hiya|sup|say hi|let'?s play|play|holla|namaste|assalam)/i.test(q.trim());

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    haptics.light?.();
    interact(); // talking to Leeboon cheers him up
    setInput('');

    const history = historyFor(messages);
    setMessages((m) => [...m, { kind: 'text', role: 'user', content: question }]);

    // Short-circuit friendly greetings with a cute local reply.
    if (isGreeting(question)) {
      const pick = PLAYFUL_REPLIES[(question.length + messages.length) % PLAYFUL_REPLIES.length];
      setMessages((m) => [...m, { kind: 'text', role: 'assistant', content: pick }]);
      return;
    }

    setSending(true);

    try {
      const ctx = buildCtx();
      const res = await askAssistantAgent(question, history, buildSnapshot(ctx));

      if (res?.type === 'action' && res.action && ACTIONS[res.action.name]) {
        let preview;
        try {
          preview = ACTIONS[res.action.name].buildPreview(res.action.input || {}, ctx);
        } catch (e) {
          // e.g. referenced item not found — fall back to a plain reply.
          setMessages((m) => [...m, { kind: 'text', role: 'assistant', content: e.message || "I couldn't find that item." }]);
          return;
        }
        setMessages((m) => [...m, {
          kind: 'action', role: 'assistant',
          content: res.text || '', command: question,
          action: res.action, preview, status: 'pending',
        }]);
      } else {
        setMessages((m) => [...m, { kind: 'text', role: 'assistant', content: res?.text || "I'm not sure how to help with that yet." }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { kind: 'text', role: 'assistant', content: err.message || "Sorry, I couldn't reach the assistant. Please try again." }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const setStatus = (idx, patch) =>
    setMessages((m) => m.map((msg, i) => (i === idx ? { ...msg, ...patch } : msg)));

  const confirmAction = async (idx) => {
    const msg = messages[idx];
    if (!msg || msg.status !== 'pending') return;
    haptics.success?.();
    setStatus(idx, { status: 'running' });
    try {
      const ctx = buildCtx();
      await ACTIONS[msg.action.name].execute(msg.action.input || {}, ctx);
      const summary = describeAction(msg.action.name, msg.preview);
      logAction({ command: msg.command, summary });
      setStatus(idx, { status: 'confirmed' });
      setMessages((m) => [...m, { kind: 'text', role: 'assistant', content: `✅ Done — ${summary}` }]);
      app.addToast?.('Done', 'success');
    } catch (err) {
      setStatus(idx, { status: 'error' });
      setMessages((m) => [...m, { kind: 'text', role: 'assistant', content: `Couldn't complete that: ${err.message || 'error'}` }]);
    }
  };

  const cancelAction = (idx) => {
    haptics.light?.();
    setStatus(idx, { status: 'cancelled' });
    setMessages((m) => [...m, { kind: 'text', role: 'assistant', content: 'Okay, cancelled — nothing was changed.' }]);
  };

  const openAudit = () => { setAuditLog(getAuditLog()); setShowAudit(true); };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const bubbleBase = 'max-w-[88%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap';

  // Which side of the screen Leeboon is on — so the "Hi!" bubble grows inward
  // and never clips off the edge.
  const helloRight = (pos.left + SPRITE_W / 2) > (typeof window !== 'undefined' ? window.innerWidth / 2 : 99999);

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ scale: { type: 'spring', stiffness: 400, damping: 25 }, opacity: { duration: 0.2 } }}
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.94 }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
            onHoverStart={() => { wanderPaused.current = true; interact(); triggerWave(); }}
            onHoverEnd={() => { if (!dragging) wanderPaused.current = false; }}
            onClick={onLeeboonClick}
            aria-label="Play with Leeboon — drag to move"
            className={`fixed z-50 flex items-center justify-center bg-transparent touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${dragging ? '' : 'transition-[top,left] duration-[2200ms] ease-in-out'}`}
            style={{ top: pos.top, left: pos.left, width: SPRITE_W }}
          >
            {/* floating "Hi!" speech — anchored to his side so it never clips */}
            <AnimatePresence>
              {waving && (
                <motion.span
                  initial={{ opacity: 0, y: 8, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  className={`absolute ${helloRight ? 'right-0' : 'left-0'} px-2.5 py-1 rounded-2xl text-[12px] font-extrabold whitespace-nowrap pointer-events-none shadow-md ${
                    d ? 'bg-surface-800 text-amber-100 ring-1 ring-surface-700' : 'bg-[#fffaf0] text-[#7a4a1e] ring-1 ring-amber-200'
                  }`}
                  style={{ bottom: 'calc(100% + 7px)', fontFamily: "'Fraunces', serif" }}
                >
                  Hi there! 👋
                  <span className={`absolute -bottom-1 ${helloRight ? 'right-4' : 'left-4'} w-2.5 h-2.5 rotate-45 ${d ? 'bg-surface-800' : 'bg-[#fffaf0]'}`} />
                </motion.span>
              )}
            </AnimatePresence>
            <LeeboonMascot size={SPRITE_W} animated expression={mood} facing={facing} moving={moving} waving={waving} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`fixed z-50 bottom-24 right-4 left-4 sm:left-auto sm:w-[23rem] flex flex-col rounded-2xl overflow-hidden shadow-2xl border ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}
            style={{ maxHeight: 'min(74vh, 34rem)' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${d ? 'bg-surface-800' : 'bg-primary-600'}`}>
              <div className="flex items-center gap-2">
                {showAudit ? (
                  <button onClick={() => setShowAudit(false)} aria-label="Back" className="text-white/90 hover:text-white p-1 -ml-1"><ChevronLeft className="w-5 h-5" /></button>
                ) : (
                  <span className="flex items-center justify-center"><LeeboonMascot size={30} animated /></span>
                )}
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Fraunces',serif" }}>{showAudit ? 'Leeboon activity' : 'Leeboon'}</p>
                  <p className={`text-[10px] ${d ? 'text-surface-400' : 'text-white/70'}`}>{showAudit ? "What Leeboon has done" : 'Your playful money buddy 🐣'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!showAudit && (
                  <button onClick={openAudit} aria-label="AI activity log" className="text-white/80 hover:text-white p-1"><History className="w-5 h-5" /></button>
                )}
                <button onClick={() => { haptics.light?.(); setOpen(false); setShowAudit(false); }} aria-label="Close" className="text-white/80 hover:text-white p-1"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {showAudit ? (
              /* ── Audit log view ── */
              <div className={`flex-1 overflow-y-auto px-3 py-3 ${d ? 'bg-surface-900' : 'bg-surface-50'}`}>
                {auditLog.length === 0 ? (
                  <p className={`text-sm text-center py-8 ${d ? 'text-surface-500' : 'text-surface-400'}`}>No AI actions yet. Confirmed actions will appear here.</p>
                ) : (
                  <>
                    {auditLog.map((e) => (
                      <div key={e.id} className={`mb-2 rounded-xl border px-3 py-2 ${d ? 'border-surface-800 bg-surface-800/50' : 'border-surface-200 bg-white'}`}>
                        <p className={`text-sm ${d ? 'text-surface-100' : 'text-surface-800'}`}>{e.summary}</p>
                        {e.command && <p className={`text-[11px] mt-0.5 ${d ? 'text-surface-500' : 'text-surface-400'}`}>“{e.command}”</p>}
                        <p className={`text-[10px] mt-0.5 ${d ? 'text-surface-600' : 'text-surface-400'}`}>{new Date(e.ts).toLocaleString()}</p>
                      </div>
                    ))}
                    <button onClick={() => { clearAuditLog(); setAuditLog([]); }} className={`mt-2 text-xs flex items-center gap-1 ${d ? 'text-surface-400 hover:text-surface-200' : 'text-surface-500 hover:text-surface-700'}`}>
                      <Trash2 className="w-3.5 h-3.5" /> Clear log
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* ── Chat view ── */
              <>
                <div ref={scrollRef} className={`flex-1 overflow-y-auto px-3 py-3 space-y-3 ${d ? 'bg-surface-900' : 'bg-surface-50'}`}>
                  {messages.map((m, i) => {
                    if (m.kind === 'action') {
                      return (
                        <div key={i} className="flex justify-start">
                          <div className="max-w-[92%] w-full">
                            {m.content ? <p className={`${bubbleBase} ${d ? 'bg-surface-800 text-surface-100' : 'bg-white text-surface-800 border border-surface-200'} rounded-bl-sm mb-2`}>{m.content}</p> : null}
                            <ActionCard d={d} m={m} onConfirm={() => confirmAction(i)} onCancel={() => cancelAction(i)} />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`${bubbleBase} ${m.role === 'user' ? 'bg-primary-600 text-white rounded-br-sm' : d ? 'bg-surface-800 text-surface-100 rounded-bl-sm' : 'bg-white text-surface-800 border border-surface-200 rounded-bl-sm'}`}>
                          {m.content}
                        </div>
                      </div>
                    );
                  })}

                  {messages.length === 1 && !sending && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} onClick={() => send(s)} className={`text-xs px-3 py-1.5 rounded-full border transition ${d ? 'border-surface-700 text-surface-300 hover:bg-surface-800' : 'border-surface-200 text-surface-600 hover:bg-surface-100'}`}>{s}</button>
                      ))}
                    </div>
                  )}

                  {sending && (
                    <div className="flex justify-start">
                      <div className={`px-3 py-2.5 rounded-2xl rounded-bl-sm ${d ? 'bg-surface-800' : 'bg-white border border-surface-200'}`}>
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className={`flex items-center gap-2 px-3 py-2.5 border-t ${d ? 'border-surface-800 bg-surface-900' : 'border-surface-200 bg-white'}`}>
                  <input
                    ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
                    placeholder="Say hi or tell Leeboon what to do…"
                    className={`flex-1 px-3 py-2 rounded-xl text-sm outline-none border ${d ? 'bg-surface-800 border-surface-700 text-white placeholder:text-surface-500' : 'bg-surface-50 border-surface-200 text-surface-900 placeholder:text-surface-400'} focus:border-primary-500`}
                  />
                  <button onClick={() => send()} disabled={!input.trim() || sending} aria-label="Send" className="w-10 h-10 shrink-0 rounded-xl bg-primary-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary-700 transition">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Confirmation / preview card ───────────────────────────────────────────────
function ActionCard({ d, m, onConfirm, onCancel }) {
  const { preview, status } = m;
  const done = status === 'confirmed';
  const cancelled = status === 'cancelled';
  const errored = status === 'error';
  const running = status === 'running';

  return (
    <div className={`rounded-2xl border overflow-hidden ${d ? 'border-surface-700 bg-surface-800' : 'border-surface-200 bg-white'}`}>
      <div className={`px-3 py-2 text-xs font-semibold ${d ? 'bg-surface-700/60 text-surface-200' : 'bg-surface-100 text-surface-700'}`}>
        {preview.title}
      </div>
      <div className="px-3 py-2.5 space-y-1.5">
        {preview.before && preview.after ? (
          <div className="space-y-1">
            <div className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>{preview.before}</div>
            <div className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>↓ {preview.after}</div>
          </div>
        ) : (
          (preview.rows || []).map(([label, value], i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>{label}</span>
              <span className={`text-sm font-medium text-right ${d ? 'text-surface-100' : 'text-surface-800'}`}>{value}</span>
            </div>
          ))
        )}
      </div>

      {status === 'pending' || running ? (
        <div className={`flex gap-2 px-3 py-2.5 border-t ${d ? 'border-surface-700' : 'border-surface-200'}`}>
          <button onClick={onCancel} disabled={running} className={`flex-1 py-2 rounded-xl text-sm font-medium ${d ? 'bg-surface-700 text-surface-200 hover:bg-surface-600' : 'bg-surface-100 text-surface-700 hover:bg-surface-200'} disabled:opacity-50`}>Cancel</button>
          <button onClick={onConfirm} disabled={running} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-1">
            {running ? 'Working…' : (<><Check className="w-4 h-4" /> Confirm</>)}
          </button>
        </div>
      ) : (
        <div className={`px-3 py-2 border-t text-xs font-medium ${d ? 'border-surface-700' : 'border-surface-200'} ${done ? 'text-emerald-500' : errored ? 'text-danger-500' : 'text-surface-400'}`}>
          {done ? '✓ Confirmed' : cancelled ? 'Cancelled' : errored ? 'Failed' : ''}
        </div>
      )}
    </div>
  );
}

export default AssistantWidget;
