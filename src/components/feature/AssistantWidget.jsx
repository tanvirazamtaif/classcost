import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Check, History, Trash2, ChevronLeft } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useEducationFees } from '../../contexts/EducationFeeContext';
import { askAssistantAgent } from '../../api';
import { haptics } from '../../lib/haptics';
import { makeFmt } from '../../utils/format';
import { ACTIONS, describeAction, getAuditLog, logAction, clearAuditLog } from '../../lib/assistantActions';

/**
 * "Ask ClassCost" — floating AI agent.
 *
 * Understands natural-language commands and questions, then PROPOSES actions.
 * Nothing is written until the user taps Confirm. On confirm, the action runs
 * through the app's own mutators and is recorded in the audit log. Questions
 * are answered from a compact data snapshot sent with each message. Talks to
 * Claude when a key is set on the server; otherwise a built-in stub planner.
 */

const GREETING = {
  kind: 'text', role: 'assistant', greeting: true,
  content:
    "Hi! I'm Ask ClassCost. Tell me what to do and I'll set it up for you to confirm — e.g. \"Add transport expense of 200\", \"Add house rent reminder of 8000 on the 5th\", or ask \"How much did I spend this month?\"",
};

const SUGGESTIONS = [
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

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    haptics.light?.();
    setInput('');

    const history = historyFor(messages);
    setMessages((m) => [...m, { kind: 'text', role: 'user', content: question }]);
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

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => { haptics.medium?.(); setOpen(true); }}
            aria-label="Ask ClassCost"
            className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center hover:bg-primary-700 transition"
          >
            <MessageCircle className="w-6 h-6" />
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
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center ${d ? 'bg-primary-600/30 text-primary-300' : 'bg-white/20 text-white'}`}><MessageCircle className="w-4 h-4" /></span>
                )}
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Fraunces',serif" }}>{showAudit ? 'AI activity' : 'Ask ClassCost'}</p>
                  <p className={`text-[10px] ${d ? 'text-surface-400' : 'text-white/70'}`}>{showAudit ? 'What the assistant has done' : 'Manages your data with your OK'}</p>
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
                    placeholder="Type a command or question…"
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
